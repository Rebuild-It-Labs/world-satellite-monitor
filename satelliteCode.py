"""Land-Cover monitor (Kaggle script).

PIPELINE (one folder per coordinate, in both Kaggle and GitHub):
  1. read coordinates (HTTP JSON)             -> list of (lat, lon, acres)
  2. drop overlapping plots                   -> biggest plot wins
  3. get 3 snapshots (10y ago, 5y ago, now)   -> Kaggle-dataset cache first, else Google Earth Engine (Sentinel-2)
  4. ML super-resolution 10 m -> 2.5 m        -> OpenSR, tiled so big plots fit in memory
  5. land-cover segmentation of EVERY date    -> landcover.pt (7 classes, tiled, ensemble + 8-view TTA)
  6. compare class maps of every date pair    -> change mask, transitions, forest loss/gain, severity
  7. render result images + summary.json      -> results/coordinates/<key>/
  8. push cache to Kaggle, results to GitHub

Kaggle secrets needed: GEE_KEY, GITHUB_TOKEN, GITHUB_USERNAME, GITHUB_EMAIL, KAGGLE_USERNAME, KAGGLE_KEY.
"""
# ---- standard library -------------------------------------------------------
import glob, importlib, io, itertools, json, math, os, shutil, subprocess, sys, time, traceback, zipfile
# ---- third-party ------------------------------------------------------------
import ee, matplotlib, numpy as np, requests, timm, torch, torch.nn as nn, torch.nn.functional as F
from PIL import Image
from kaggle_secrets import UserSecretsClient          # Kaggle's secret store (tokens never appear in code)
matplotlib.use("Agg")                                  # headless backend: draw to files, no display needed
import matplotlib.pyplot as plt
from matplotlib.patches import Patch                   # used to draw the class legend

# ================================ CONFIG ======================================
# Where the list of plots comes from. JSON: [[lat,lon], ...] or [{"lat":..,"lon":..,"acres":..}, ...]
# Empty string "" -> use DEFAULT_COORDS below instead.
COORDS_URL = "https://raw.githubusercontent.com/Rebuild-It-Labs/world-satellite-monitor/main/coordinates.json"
DEFAULT_COORDS = [
    ["31.252927", "75.704468", "200"],
    ["-0.9730559", "116.7086111", "500"]
]   # fallback plots: lat, lon, acres
ACRES = 100                                            # plot size used when a coordinate has no "acres" (max 10000, tiled)
YEARS = (10, 5)                                        # historical snapshots; frozen (cached forever) after first run
MIN_CLEAR, LOOKBACK_DAYS, HIST_WINDOW_DAYS = 0.8, 90, 60   # min clear-sky fraction; search window for "now"; +-window for history
MODEL_TILE = 256                                       # px (= 640 m at 2.5 m/px) per segmentation tile; larger = faster but coarser
CONF_MIN = 0.5                                         # a pixel only counts as "changed" if BOTH dates are predicted with >= this confidence
CHANGE_EDGES = (5.0, 15.0)                             # severity cut-points in % of plot area changed: <5 Low, 5-15 Moderate, >15 Severe

KAGGLE_USERNAME = "YOUR_KAGGLE_USERNAME"
KAGGLE_DATASET = "YOUR_KAGGLE_USERNAME/world-satellite-monitor-cache"                    # image cache dataset (auto-created on first run)
KAGGLE_INPUT = "/kaggle/input/datasets/YOUR_KAGGLE_USERNAME/world-satellite-models"     # mounted dataset that holds the model files
GITHUB_REPO, GITHUB_BRANCH = "Rebuild-It-Labs/world-satellite-monitor", "main"      # target repo (must exist, may be empty)
LC_FILE, SR_FILE = "landcover.pt", "sr_model.pt"       # land-cover checkpoint (from training) / super-res cache (auto-created)
OUTPUTS = {"compare", "timeline", "gif", "mask", "heatmap", "overlay", "landcover"}   # delete items you do not want
STYLE, CMAP = "dark", "inferno"                        # "dark" | "light" ; any matplotlib colormap (used for the heatmap)
W = "/kaggle/working"                                  # Kaggle's writable folder
# ==============================================================================

# ---- land-cover classes: MUST match the order used when landcover.pt was trained ----
CLASSES = ("Background", "Building", "Road", "Water", "Barren", "Forest", "Agriculture")
PALETTE = np.array([(255, 255, 255), (255, 0, 0), (255, 255, 0), (0, 0, 255),
                    (159, 129, 183), (0, 255, 0), (255, 195, 128)], np.uint8)   # RGB colour per class
NC, FOREST = len(CLASSES), CLASSES.index("Forest")     # number of classes; index of the class we track for deforestation
SEVERITY = ("Low Change", "Moderate Change", "Severe Change")

DS, OUT, NEW, _SR = f"{W}/ds", f"{W}/results", [], {}  # DS = local copy of cache, OUT = results, NEW = files to upload, _SR = SR model holder
TAGS = [f"{y}y" for y in sorted(YEARS, reverse=True)] + ["now"]   # snapshot names ordered oldest -> newest, e.g. ["10y","5y","now"]
SR_CFG = "https://raw.githubusercontent.com/ESAOpenSR/opensr-model/refs/heads/main/opensr_model/configs/config_10m.yaml"
BANDS = ["B4", "B3", "B2", "B8"]                       # Sentinel-2 bands: Red, Green, Blue, Near-infrared
side = lambda acres: (acres * 4046.8564224) ** 0.5     # square plot side length in metres for a given acreage
plt.style.use("dark_background" if STYLE == "dark" else "default")

# ---- secrets + Earth Engine login (runs once at start) ----
S = UserSecretsClient()
GH_TOKEN, GH_USERNAME, GH_EMAIL = (S.get_secret(k) for k in ("GITHUB_TOKEN", "GITHUB_USERNAME", "GITHUB_EMAIL"))
os.environ.update(KAGGLE_USERNAME=S.get_secret("KAGGLE_USERNAME"), KAGGLE_KEY=S.get_secret("KAGGLE_KEY"))  # Kaggle CLI reads these
raw = S.get_secret("GEE_KEY"); k = json.loads(raw)     # service-account JSON for Google Earth Engine
ee.Initialize(credentials=ee.ServiceAccountCredentials(k["client_email"], key_data=raw), project=k["project_id"])


def sh(cmd, check=True):
    """Run a shell command; on failure raise an error with the GitHub token masked out of the message."""
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and r.returncode:
        raise RuntimeError((r.stdout + r.stderr).replace(GH_TOKEN, "***"))
    return r

# ============================ BLOCK 1: LAND-COVER MODEL =======================
def dihedral(x, k, flip):
    """Test-time augmentation view: rotate by k*90 degrees, then optionally mirror (acts on last two dims)."""
    x = torch.rot90(x, k, dims=(-2, -1))
    return torch.flip(x, dims=(-1,)) if flip else x


def inverse_dihedral(x, k, flip):
    """Undo dihedral() so predictions from every view line up pixel-for-pixel before averaging."""
    return torch.rot90(torch.flip(x, dims=(-1,)) if flip else x, -k, dims=(-2, -1))


def block(i, o):
    """Conv 3x3 -> GroupNorm -> ReLU: the basic building block of the decoder."""
    return nn.Sequential(nn.Conv2d(i, o, 3, padding=1, bias=False), nn.GroupNorm(8, o), nn.ReLU(True))


class SegNet(nn.Module):
    """Same architecture as in training: pretrained encoder -> FPN decoder -> NC-channel logit map."""
    def __init__(self, arch, dim=128):
        super().__init__()
        self.enc = timm.create_model(arch, pretrained=False, features_only=True)   # weights come from the checkpoint, not the internet
        ch = self.enc.feature_info.channels()                                      # channels of the 4 encoder stages
        # ImageNet normalisation constants (not saved in the checkpoint -> persistent=False)
        self.register_buffer("mean", torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1), persistent=False)
        self.register_buffer("std", torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1), persistent=False)
        self.proj = nn.ModuleList(block(c, dim) for c in ch)                       # project each scale to a common width
        self.smooth = nn.ModuleList(block(dim, dim) for _ in ch[:-1])              # refine after each top-down merge
        self.head = nn.Sequential(block(dim, 64), nn.Conv2d(64, NC, 1))            # one logit map per class

    def forward(self, x):
        d = [p(f) for p, f in zip(self.proj, self.enc((x - self.mean) / self.std))]   # multi-scale features
        y = d[-1]                                                                  # start at the deepest (coarsest) scale
        for sm, skip in zip(self.smooth[::-1], d[-2::-1]):                         # FPN: upsample, add skip, smooth
            y = sm(F.interpolate(y, size=skip.shape[-2:], mode="bilinear", align_corners=False) + skip)
        return F.interpolate(self.head(y), size=x.shape[-2:], mode="bilinear", align_corners=False)  # back to input size


class LandCoverModel:
    """Loads the 5-fold ensemble once. predict(png) -> class map + confidence + area shares (tiled for big plots)."""
    def __init__(self, path):
        ck = torch.load(path, map_location="cpu", weights_only=False)     # only load checkpoints you trust
        self.dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.size = ck["cfg"]["img"]                                      # tile size the model was trained at (e.g. 256)
        self.nets = []
        for st in ck["states"]:                                           # one saved state per CV fold
            net = SegNet(ck["cfg"]["arch"])
            net.load_state_dict({a: v.float() if v.is_floating_point() else v for a, v in st.items()})  # fp16 -> fp32
            self.nets.append(net.to(self.dev).eval())
        print(f"land-cover ensemble x{len(self.nets)} | {self.dev} | tile {self.size}px")

    @torch.no_grad()
    def _tile(self, tile):
        """One PIL crop -> (class id uint8 [h,w], confidence float [h,w]) at the crop's own size."""
        x = torch.from_numpy(np.asarray(tile.resize((self.size,) * 2, Image.BILINEAR)).copy())   # resize to model size
        x = x.permute(2, 0, 1)[None].float().div(255).to(self.dev)                              # HWC uint8 -> [1,3,S,S] in 0..1
        p = 0
        for net in self.nets:                                             # ensemble ...
            for k, f in itertools.product(range(4), (False, True)):      # ... x 8 dihedral views (TTA)
                with torch.autocast(device_type=self.dev.type, enabled=self.dev.type == "cuda"):   # mixed precision on GPU
                    s = net(dihedral(x, k, f))
                p = p + inverse_dihedral(s.float().softmax(1), k, f)     # undo the view, then accumulate class probabilities
        p = p / (len(self.nets) * 8)                                      # average over all models and views
        p = F.interpolate(p, size=(tile.height, tile.width), mode="bilinear", align_corners=False)[0]   # back to crop size
        conf, cls = p.max(0)                                              # winning class + its probability = confidence
        return cls.byte().cpu().numpy(), conf.cpu().numpy()

    def predict(self, path):
        """Whole image -> {cls [H,W], conf [H,W], area [NC] in %, mean_conf}. Tiles it near-square, stitches the result."""
        im = Image.open(path).convert("RGB")
        w, h = im.size
        xs, ys = (np.linspace(0, d, math.ceil(d / MODEL_TILE) + 1).astype(int) for d in (w, h))   # tile edges
        cls, conf = np.zeros((h, w), np.uint8), np.zeros((h, w), np.float32)
        for (y0, y1), (x0, x1) in itertools.product(zip(ys[:-1], ys[1:]), zip(xs[:-1], xs[1:])):
            cls[y0:y1, x0:x1], conf[y0:y1, x0:x1] = self._tile(im.crop((x0, y0, x1, y1)))     # paste tile result
        area = np.bincount(cls.ravel(), minlength=NC) / cls.size * 100                         # % of plot per class
        return dict(cls=cls, conf=conf, area=area, mean_conf=float(conf.mean()))


def compare(ra, rb):
    """Compare two land-cover results (older ra, newer rb) -> change mask, transitions, forest loss/gain, severity."""
    # a pixel "changed" only if the class differs AND both predictions are confident (suppresses noise)
    ch = (ra["cls"] != rb["cls"]) & (np.minimum(ra["conf"], rb["conf"]) >= CONF_MIN)
    pair = ra["cls"].astype(np.int64) * NC + rb["cls"]                    # encode (from, to) as one integer per pixel
    trans = np.bincount(pair[ch], minlength=NC * NC).reshape(NC, NC) / ch.size * 100   # [from, to] in % of plot (changed pixels only)
    top = sorted(((trans[i, j], i, j) for i in range(NC) for j in range(NC) if trans[i, j] > 0), reverse=True)[:5]
    pct = float(ch.mean() * 100)                                          # total changed area, % of plot
    return dict(mask=ch.astype(np.uint8), pct=pct,
                heat=np.where(ch, np.minimum(ra["conf"], rb["conf"]), 0).astype("float32"),   # change confidence map
                forest_loss=float(trans[FOREST].sum()),                  # Forest -> anything else
                forest_gain=float(trans[:, FOREST].sum()),               # anything else -> Forest
                top=[(f"{CLASSES[i]} -> {CLASSES[j]}", round(float(v), 3)) for v, i, j in top],
                severity=SEVERITY[int(np.digitize(pct, CHANGE_EDGES))])  # Low / Moderate / Severe by fixed cut-points

# ============================ BLOCK 2: IMAGES (GEE + TILED SUPER-RES) =========
def find(region, start, end, target=None):
    """Newest Sentinel-2 scene (or the one closest to `target` ms) with >= MIN_CLEAR clear sky; else the clearest (>=30%)."""
    col = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(region).filterDate(start, end)
    col = (col.map(lambda im: im.set("d", ee.Number(im.get("system:time_start")).subtract(target).abs())).sort("d")   # closest in time
           if target else col.sort("system:time_start", False))                                                       # or newest first
    n = min(col.size().getInfo(), 30); lst = col.toList(n); best = None   # inspect at most 30 candidates
    for i in range(n):
        im = ee.Image(lst.get(i))
        # SCL classes 4-7 = vegetation / bare soil / water / unclassified-clear -> fraction of the plot that is clear
        f = im.select("SCL").remap([4, 5, 6, 7], [1] * 4, 0).unmask(0).reduceRegion(
            ee.Reducer.mean(), region, 30, maxPixels=1e9).values().get(0).getInfo() or 0
        d = im.date().format("YYYY-MM-dd").getInfo(); print(f"    {d}: {f:.0%} clear")
        best = best if best and best[2] >= f else (im, d, f)             # remember the clearest scene so far
        if f >= MIN_CLEAR: break                                          # good enough -> stop searching
    return best if best and best[2] >= 0.3 else None


def make_grid(lat, lon, s):
    """UTM zone + top-left corner snapped to the 10 m grid + plot size n in 10 m pixels (forced even)."""
    epsg = (32600 if lat >= 0 else 32700) + int((lon + 180) // 6) + 1    # UTM EPSG code (north 326xx / south 327xx)
    cx, cy = ee.Geometry.Point([lon, lat]).transform(f"EPSG:{epsg}", 1).coordinates().getInfo()   # centre in metres
    n = int(round(s / 10)); n += n % 2
    return dict(epsg=epsg, n=n, x0=math.floor((cx - n * 5) / 10) * 10, y0=math.ceil((cy + n * 5) / 10) * 10)


def fetch(im, g, x, y):
    """Download one 128x128 px (10 m) block whose top-left is (x, y) in UTM -> array (4,128,128) of reflectance x 10000."""
    arr = ee.data.computePixels({"expression": im.select(BANDS).unmask(0).toFloat(), "fileFormat": "NUMPY_NDARRAY",
        "grid": {"dimensions": {"width": 128, "height": 128},
                 "affineTransform": {"scaleX": 10, "shearX": 0, "translateX": x, "shearY": 0, "scaleY": -10, "translateY": y},
                 "crsCode": f"EPSG:{g['epsg']}"}})
    return np.stack([arr[b] for b in BANDS]).astype("float32")


def sr(lr):
    """OpenSR LDSR-S2 super-resolution: (4,128,128) @10 m -> (4,512,512) @2.5 m.  AI-inferred detail, NOT measured."""
    if "m" not in _SR:                                                    # load the SR model only once per run
        sh(f"{sys.executable} -m pip install -q omegaconf opensr-model"); importlib.invalidate_caches()
        import opensr_model
        from omegaconf import OmegaConf
        dev = "cuda" if torch.cuda.is_available() else "cpu"
        # look for a cached SR checkpoint: first in the downloaded cache, then in the mounted Kaggle input
        p = next((q for q in (f"{DS}/{SR_FILE}", f"{KAGGLE_INPUT}/{SR_FILE}") if os.path.isfile(q)), None)
        have = p is not None
        p = p or f"{DS}/{SR_FILE}"                                        # where to save it if we must download
        ck = torch.load(p, map_location="cpu", weights_only=False) if have else \
            {"cfg": OmegaConf.to_container(OmegaConf.load(io.StringIO(requests.get(SR_CFG, timeout=60).text)))}
        cfg = OmegaConf.create(ck["cfg"]); m = opensr_model.SRLatentDiffusion(cfg, device=dev)
        if have:
            m.load_state_dict(ck["state"])                                # fast path: weights from cache
        else:
            m.load_pretrained(cfg.ckpt_version)                           # slow path: download pretrained weights ...
            torch.save({"cfg": ck["cfg"], "state": m.state_dict()}, p); NEW.append(p)   # ... and queue them for upload
        print(f"SR model: {'loaded from cache (' + p + ')' if have else 'downloaded, saved for upload'}")
        _SR.update(m=m.eval(), dev=dev)
    x = torch.from_numpy(np.clip(lr / 1e4, 0, 1)).float()[None].to(_SR["dev"])   # reflectance 0..1, add batch dim
    with torch.no_grad(): y = _SR["m"].forward(x)
    return np.clip(y[0].cpu().numpy(), 0, None) * 1e4                     # back to reflectance x 10000


def enhance(im, g, tag):
    """Cut the plot into 96x96 px cores (+16 px overlap each side to hide seams), super-resolve each, stitch together."""
    n, PAD, CORE = g["n"], 16, 96
    tiles = list(itertools.product(range(0, n, CORE), repeat=2)); print(f"  {tag}: super-resolving {len(tiles)} tile(s)")
    out = np.zeros((4, n * 4, n * 4), "float32")                          # full output canvas at 4x resolution
    for r, c in tiles:
        hr = sr(fetch(im, g, g["x0"] + (c - PAD) * 10, g["y0"] - (r - PAD) * 10))   # tile + padding -> super-res
        h, w = min(CORE, n - r), min(CORE, n - c)                         # edge tiles may be smaller than CORE
        out[:, r * 4:(r + h) * 4, c * 4:(c + w) * 4] = hr[:, PAD * 4:(PAD + h) * 4, PAD * 4:(PAD + w) * 4]   # drop padding, paste
    return out


def save_img(arr, base, g):
    """Save a 4-band array as a viewable RGB PNG and a georeferenced 4-band GeoTIFF."""
    import rasterio
    from rasterio.transform import from_origin
    rgb = np.clip(arr[:3] / 3000, 0, 1) ** (1 / 1.2)                      # stretch reflectance to 0..1 + mild gamma
    Image.fromarray((rgb.transpose(1, 2, 0) * 255).astype("uint8")).save(base + ".png")
    with rasterio.open(base + ".tif", "w", driver="GTiff", height=arr.shape[1], width=arr.shape[2], count=4, dtype="uint16",
                       crs=f"EPSG:{g['epsg']}", transform=from_origin(g["x0"], g["y0"], 2.5, 2.5), compress="deflate",
                       tiled=True, BIGTIFF="YES") as d:
        d.write(np.clip(np.rint(arr), 0, 65535).astype("uint16"))
        d.update_tags(bands="R,G,B,NIR", warning="AI-inferred detail; not for measurement")


def get_image(tag, region, g, folder):
    """Path of the 2.5 m PNG for '10y' / '5y' / 'now'. History is cached forever; 'now' always takes the newest clear scene."""
    if tag != "now" and (old := sorted(glob.glob(f"{folder}/{tag}_*.png"))):          # historical snapshot already cached?
        print(f"  {tag}: cached -> {os.path.basename(old[-1])}"); return old[-1]
    now, days = ee.Date(int(time.time() * 1000)), HIST_WINDOW_DAYS
    t = None if tag == "now" else int((time.time() - 365.25 * 86400 * int(tag[:-1])) * 1000)   # target date (ms) for history
    c = ee.Date(t) if t else now
    hit = find(region, c.advance(-(LOOKBACK_DAYS if t is None else days), "day"),             # search window start
               now if t is None else c.advance(days, "day"), t)                                # search window end
    if not hit: print(f"  {tag}: no usable Sentinel-2 image"); return None
    im, d, f = hit; base = f"{folder}/{tag}_{d}"                          # file name carries the acquisition date
    if not os.path.exists(base + ".png"):
        print(f"  {tag}: new image {d} ({f:.0%} clear)"); save_img(enhance(im, g, tag), base, g); NEW.append(base)
    return base + ".png"

# ============================ BLOCK 3: OUTPUT STYLES ==========================
# acquisition date from a file name like ".../now_2025-05-01.png" -> "2025-05-01"
date = lambda p: os.path.splitext(os.path.basename(p))[0].split("_")[1]
colorize = lambda cls: PALETTE[cls]                                       # class-id map [H,W] -> RGB image [H,W,3]
legend = [Patch(color=PALETTE[i] / 255, label=c) for i, c in enumerate(CLASSES)]   # legend handles for figures


def render(a, b, P, L, res, out, key):
    """Write every enabled result image for the pair a -> b (a older, b newer)."""
    A, B = (np.asarray(Image.open(P[t]).convert("RGB")) for t in (a, b))  # the two satellite images
    pre, m = f"{out}/{a}_to_{b}", res["mask"]
    ov = B.copy(); ov[m > 0] = (0.5 * ov[m > 0] + [127, 0, 0]).astype(np.uint8)       # newer image with changed pixels tinted red
    heat = (plt.get_cmap(CMAP)(res["heat"])[..., :3] * 255).astype(np.uint8)         # change confidence as a colour map
    for k, arr in {"mask": m * 255, "heatmap": heat, "overlay": ov}.items():
        if k in OUTPUTS: Image.fromarray(arr).save(f"{pre}_{k}.png")
    if "compare" in OUTPUTS:                                              # 5 panels: images, class maps, overlay
        fig, ax = plt.subplots(1, 5, figsize=(21, 4.9))
        for x, (im, t) in zip(ax, [(A, f"{a} ({date(P[a])})"), (B, f"{b} ({date(P[b])})"),
                                   (colorize(L[a]["cls"]), f"Land cover {a}"), (colorize(L[b]["cls"]), f"Land cover {b}"),
                                   (ov, "Overlay (red = changed)")]):
            x.imshow(im); x.set_title(t); x.axis("off")
        fig.legend(handles=legend, loc="lower center", ncol=NC, frameon=False)
        fig.suptitle(f"{key} | {a} -> {b}: {res['pct']:.2f}% changed | forest loss {res['forest_loss']:.2f}% | "
                     f"gain {res['forest_gain']:.2f}% | {res['severity']}", fontsize=13)
        fig.savefig(pre + "_compare.png", dpi=120, bbox_inches="tight"); plt.close(fig)


def extras(P, L, results, out, key):
    """Per-date land-cover maps, plus timeline figure and time-lapse GIF across all snapshots."""
    order = [t for t in TAGS if t in P]                                   # snapshots that actually exist
    if "landcover" in OUTPUTS:
        for t in order: Image.fromarray(colorize(L[t]["cls"])).save(f"{out}/{t}_landcover.png")
    if "timeline" in OUTPUTS and len(order) > 1:                          # row 1: satellite, row 2: class map
        fig, ax = plt.subplots(2, len(order), figsize=(5 * len(order), 10.5), squeeze=False)
        for j, t in enumerate(order):
            ax[0, j].imshow(Image.open(P[t]).convert("RGB")); ax[0, j].set_title(f"{t}\n{date(P[t])}")
            ax[1, j].imshow(colorize(L[t]["cls"])); ax[1, j].set_title("forest %.1f%%" % L[t]["area"][FOREST])
            ax[0, j].axis("off"); ax[1, j].axis("off")
        fig.legend(handles=legend, loc="lower center", ncol=NC, frameon=False)
        fig.suptitle(f"{key}   " + " | ".join(f"{a}->{b}: {r['pct']:.1f}%" for (a, b), r in results.items()), fontsize=12)
        fig.savefig(f"{out}/timeline.png", dpi=120, bbox_inches="tight"); plt.close(fig)
    if "gif" in OUTPUTS and len(order) > 1:                               # simple time-lapse of the satellite images
        fr = [Image.open(P[t]).convert("RGB").resize((512, 512), Image.BICUBIC) for t in order]
        fr[0].save(f"{out}/timelapse.gif", save_all=True, append_images=fr[1:], duration=1200, loop=0)

# ============================ BLOCK 4: COORDINATES + PIPELINE =================
def norm(c):
    """Accept [lat,lon], [lat,lon,acres] or {"lat","lon","acres"} -> (lat, lon, acres) as floats."""
    c = [c["lat"], c["lon"], c.get("acres")] if isinstance(c, dict) else [*c, None, None][:3]
    return float(c[0]), float(c[1]), float(c[2] or ACRES)


def apart(p, q):
    """True if two square plots do NOT overlap (flat-earth metres: fine at plot scale)."""
    h = (side(p[2]) + side(q[2])) / 2                                     # centres must be at least this far apart on one axis
    return abs((p[1] - q[1]) * 111320 * math.cos(math.radians(p[0]))) >= h or abs((p[0] - q[0]) * 110540) >= h


def dedupe(cs):
    """Biggest plots first; silently drop any smaller plot that overlaps one already kept. -> (kept, skipped)"""
    keep = []
    for c in sorted(cs, key=lambda c: -c[2]):
        if all(apart(c, k) for k in keep): keep.append(c)
    return keep, [c for c in cs if c not in keep]


def find_cached_folder(key):
    """Return the folder holding cached images for this plot (new or old layout), else None."""
    for folder in (f"{DS}/coordinates/{key}", f"{DS}/{key}"):
        if os.path.isdir(folder) and glob.glob(f"{folder}/**/*.png", recursive=True):
            print(f"Historical image cache FOUND: {folder}"); return folder
    print(f"No historical image cache found for {key}"); return None


def process(model, lat, lon, acres):
    """Full pipeline for ONE plot. Returns the summary dict that is also written to summary.json."""
    key = f"{lat:.5f}_{lon:.5f}_{acres:g}ac"; print(f"\n=== {key} ===")
    s = side(acres); region = ee.Geometry.Point([lon, lat]).buffer(s / 2).bounds()      # GEE search area
    g = make_grid(lat, lon, s)                                            # pixel grid of the plot
    folder = find_cached_folder(key) or f"{DS}/coordinates/{key}"         # image cache folder (Kaggle side)
    out = f"{OUT}/coordinates/{key}"                                      # result folder (GitHub side)
    os.makedirs(folder, exist_ok=True); os.makedirs(out, exist_ok=True)
    P = {t: get_image(t, region, g, folder) for t in TAGS}; P = {t: p for t, p in P.items() if p}   # snapshots that exist
    L = {t: model.predict(p) for t, p in P.items()}                       # land-cover map of EVERY date
    for t in L: print(f"  {t}: " + ", ".join(f"{c} {v:.1f}%" for c, v in zip(CLASSES, L[t]["area"])) + f" | conf {L[t]['mean_conf']:.2f}")
    results = {}
    for a, b in itertools.combinations([t for t in TAGS if t in P], 2):   # every older -> newer pair
        results[(a, b)] = res = compare(L[a], L[b])
        render(a, b, P, L, res, out, key)
        print(f"  {a} -> {b}: {res['pct']:.2f}% changed | forest loss {res['forest_loss']:.2f}% | {res['severity']}")
    extras(P, L, results, out, key)
    for p in P.values(): shutil.copy(p, out)                              # enhanced PNGs go to GitHub as well
    summ = dict(key=key, lat=lat, lon=lon, acres=acres, images={t: os.path.basename(p) for t, p in P.items()},
                land_cover_pct={t: {c: round(float(v), 2) for c, v in zip(CLASSES, L[t]["area"])} for t in L},
                mean_confidence={t: round(L[t]["mean_conf"], 3) for t in L},
                changes={f"{a}_to_{b}": dict(changed_pct=round(r["pct"], 3), forest_loss_pct=round(r["forest_loss"], 3),
                                             forest_gain_pct=round(r["forest_gain"], 3), top_transitions=r["top"],
                                             severity=r["severity"]) for (a, b), r in results.items()},
                note="Super-resolved imagery is AI-inferred; the land-cover model was trained on 0.3 m aerial imagery "
                     "(LoveDA), so percentages are rough estimates.")
    json.dump(summ, open(f"{out}/summary.json", "w"), indent=2)
    return summ

# ============================ BLOCK 5: KAGGLE + GITHUB SYNC ===================
def kaggle_pull():
    """Download the image-cache dataset and restore per-plot folders that Kaggle stored as ZIPs. -> True if it existed."""
    os.makedirs(DS, exist_ok=True)
    r = sh(f"kaggle datasets download -d {KAGGLE_DATASET} -p {DS} --unzip", check=False)
    if r.returncode != 0:
        print("Kaggle cache download failed:", r.stderr); return False
    print("Kaggle cache downloaded successfully")
    root = f"{DS}/coordinates"; os.makedirs(root, exist_ok=True)
    for archive in glob.glob(f"{DS}/*.zip"):                              # `-r zip` packs every sub-folder as <key>.zip
        key = os.path.splitext(os.path.basename(archive))[0]; target = f"{root}/{key}"
        if os.path.isdir(target) and glob.glob(f"{target}/*.png"): continue   # already restored
        try:
            os.makedirs(target, exist_ok=True)
            with zipfile.ZipFile(archive) as z: z.extractall(target)
            print(f"Restored coordinate cache: {key}")
        except Exception as e:
            print(f"Could not extract {archive}: {e}")
    return True


def kaggle_push(existed):
    """Upload new images / SR weights as a new dataset version (or create the dataset on the first run)."""
    if not NEW: return print("Kaggle: nothing new to upload")
    json.dump({"title": "world-satellite-monitor-cache", "id": KAGGLE_DATASET, "licenses": [{"name": "CC0-1.0"}]},
              open(f"{DS}/dataset-metadata.json", "w"), indent=2)         # Kaggle requires this metadata file
    cmd = (f'kaggle datasets version -p "{DS}" -m "weekly update" -r zip' if existed
           else f'kaggle datasets create -p "{DS}" -r zip')
    r = sh(cmd, check=False); out = (r.stdout or "") + "\n" + (r.stderr or ""); print(out)
    if r.returncode or "dataset version creation error" in out.lower():
        raise RuntimeError("Kaggle cache publishing failed. See CLI output above.")
    print(f"Kaggle cache published: {KAGGLE_DATASET} (+{len(NEW)} new file(s))")


def github_push():
    """Clone the repo, copy all results in, commit if anything changed, push."""
    d = f"{W}/gh"; shutil.rmtree(d, ignore_errors=True)
    sh(f"git clone -q --depth 1 https://x-access-token:{GH_TOKEN}@github.com/{GITHUB_REPO}.git {d}")
    shutil.copytree(OUT, d, dirs_exist_ok=True)
    sh(f'cd {d} && git config user.email "{GH_EMAIL}" && git config user.name "{GH_USERNAME}" && git add -A '
       f'&& (git diff --cached --quiet || git commit -qm "update results") && git push -q origin HEAD:{GITHUB_BRANCH}')
    print(f"GitHub updated: https://github.com/{GITHUB_REPO}")

# ============================ MAIN ============================================
if __name__ == "__main__":
    os.makedirs(f"{OUT}/coordinates", exist_ok=True)
    existed = kaggle_pull()                                               # 1. restore cached images
    model = LandCoverModel(f"{KAGGLE_INPUT}/{LC_FILE}")                   # 2. load the land-cover ensemble once
    coords = requests.get(COORDS_URL, timeout=30).json() if COORDS_URL else DEFAULT_COORDS
    keep, skipped = dedupe([norm(c) for c in coords])                     # 3. normalise + drop overlapping plots
    runs = []
    for c in keep:                                                        # 4. process each plot independently
        try: runs.append(process(model, *c))
        except Exception: print(f"FAILED {c}"); traceback.print_exc()    #    one bad point never stops the rest
    json.dump({"runs": runs, "skipped_overlaps": skipped}, open(f"{OUT}/last_run.json", "w"), indent=2)
    kaggle_push(existed); github_push()                                   # 5. publish cache + results