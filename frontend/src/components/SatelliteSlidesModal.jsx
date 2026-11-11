import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

/* =====================================================================
   IMAGES
   Connected dynamically to real run folders in public/coordinates/ and
   public/assets/earth/. Uses import.meta.env.BASE_URL for GitHub Pages.
   ===================================================================== */
const getAssetUrl = (file) => {
  const base = import.meta.env.BASE_URL || "./";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  return `${cleanBase}${file}`;
};

const IMG = {
  hero: "assets/earth/earth-blue-marble.jpg",
  night: "assets/earth/earth-night.jpg",
  s2: "coordinates/-0.97306_116.70861_500ac/5y_to_now_compare.png",
  grid: "coordinates/-16.90846_-62.63432_500ac/5y_to_now_heatmap.png",
  forest: "coordinates/-16.90846_-62.63432_500ac/5y_to_now_compare.png",
  city: "coordinates/31.25293_75.70447_200ac/10y_to_now_compare.png",
  wetland: "coordinates/-0.97306_116.70861_500ac/now_landcover.png",
  farm: "coordinates/31.25293_75.70447_200ac/5y_to_now_compare.png",
  mine: "coordinates/17.24046_80.21990_750ac/10y_to_now_compare.png",
  nusantara: "coordinates/-0.97306_116.70861_500ac/now_landcover.png",
  phagwara: "coordinates/31.25293_75.70447_200ac/now_landcover.png",
  hasdeo: "coordinates/17.24046_80.21990_750ac/now_landcover.png",
  nusA: "coordinates/-0.97306_116.70861_500ac/5y_2021-10-24.png",
  nusB: "coordinates/-0.97306_116.70861_500ac/now_2026-10-18.png",
  phgA: "coordinates/31.25293_75.70447_200ac/10y_2016-11-04.png",
  phgB: "coordinates/31.25293_75.70447_200ac/now_2026-11-04.png",
  hasA: "coordinates/17.24046_80.21990_750ac/10y_2016-10-16.png",
  hasB: "coordinates/17.24046_80.21990_750ac/now_2026-10-14.png",
};

const prefersReduced = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- hooks ---------- */
function useReady(delay = 120) {
  const [ready, setReady] = useState(prefersReduced());
  useEffect(() => {
    const t = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return ready;
}

function useCountUp(target, decimals = 0, dur = 1500, delay = 650) {
  const [v, setV] = useState(prefersReduced() ? target : 0);
  useEffect(() => {
    if (prefersReduced()) return;
    let raf;
    let t0;
    const timer = setTimeout(() => {
      const step = (t) => {
        if (t0 === undefined) t0 = t;
        const k = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        setV(target * eased);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, dur, delay]);
  return v.toFixed(decimals);
}

/* ---------- small building blocks ---------- */
const Photo = ({
  k,
  alt = "",
  className = "",
  eager = false,
  quiet = false,
}) => {
  const [state, setState] = useState("loading");
  const file = IMG[k] || k;
  return (
    <div className={`wsm-photo ${state} ${className}`}>
      {state !== "error" && (
        <img
          src={getAssetUrl(file)}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          draggable={false}
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
        />
      )}
      {state === "error" && !quiet && <span className="wsm-miss">{file}</span>}
    </div>
  );
};

const Fig = ({ k, cap }) => (
  <figure className="wsm-fig">
    <Photo k={k} alt={cap} />
    {cap && <figcaption>{cap}</figcaption>}
  </figure>
);

const Bullets = ({ items }) => (
  <ul className="wsm-list">
    {items.map((t, i) => (
      <li key={i}>{t}</li>
    ))}
  </ul>
);

const Table = ({ head, rows }) => (
  <div className="wsm-scroll">
    <table className="wsm-table">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.hl ? "hl" : ""}>
            {r.c.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Steps = ({ items }) => (
  <div className="wsm-steps">
    {items.map(([t, d], i) => (
      <div
        className="wsm-step"
        key={i}
        style={{ "--d": `${0.35 + i * 0.12}s` }}
      >
        <em>{i + 1}</em>
        <b>{t}</b>
        <span>{d}</span>
      </div>
    ))}
  </div>
);

/* Formula cards: [label, expression, optional explanation] */
const Formulas = ({ items }) => (
  <div className="wsm-formulas">
    {items.map(([label, expr, why]) => (
      <div className="wsm-formula" key={label}>
        <small>{label}</small>
        <code>{expr}</code>
        {why && <span>{why}</span>}
      </div>
    ))}
  </div>
);

const Callout = ({ children }) => <p className="wsm-callout">{children}</p>;

const Compare = ({ rows, a, b }) => {
  const ready = useReady(500);
  return (
    <div className="wsm-compare">
      <div className="wsm-legend">
        <i style={{ background: "var(--mist)" }} /> {a}
        <i style={{ background: "var(--flare)" }} /> {b}
      </div>
      {rows.map(([name, x, y]) => (
        <div className="wsm-crow" key={name}>
          <span className="wsm-cname">{name}</span>
          <div className="wsm-bars">
            <div
              style={{
                width: ready ? `${Math.max(x * 2, 9)}%` : "0%",
                background: "var(--mist)",
              }}
            >
              {x}%
            </div>
            <div
              style={{
                width: ready ? `${Math.max(y * 2, 9)}%` : "0%",
                background: "var(--flare)",
              }}
            >
              {y}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const Trend = ({ pts, max, unit }) => {
  const ready = useReady(500);
  return (
    <div className="wsm-trend">
      {pts.map(([yr, v]) => (
        <div key={yr} className="wsm-col">
          <small>{v}</small>
          <div style={{ height: ready ? `${(v / max) * 100}%` : "0%" }} />
          <em>{yr}</em>
        </div>
      ))}
      <span className="wsm-unit">{unit}</span>
    </div>
  );
};

const Count = ({ to, d = 0, suffix = "" }) => {
  const v = useCountUp(to, d);
  return (
    <>
      {v}
      {suffix}
    </>
  );
};

const Stats = ({ items }) => (
  <div className="wsm-stats">
    {items.map(([val, d, suf, label]) => (
      <div className="wsm-stat" key={label}>
        <b>
          <Count to={val} d={d} suffix={suf} />
        </b>
        <span>{label}</span>
      </div>
    ))}
  </div>
);

/* Before / after swipe. Left side shows `a`, right side shows `b`. */
const Swipe = ({ a, b, la, lb }) => {
  const [p, setP] = useState(prefersReduced() ? 50 : 92);
  const touched = useRef(false);

  useEffect(() => {
    if (prefersReduced()) return;
    let raf;
    let t0;
    const timer = setTimeout(() => {
      const step = (t) => {
        if (touched.current) return;
        if (t0 === undefined) t0 = t;
        const k = Math.min(1, (t - t0) / 1500);
        setP(92 - 42 * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 1000);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="wsm-swipe">
      <Photo k={b} alt={lb} className="wsm-sw-layer" />
      <div
        className="wsm-sw-layer wsm-sw-top"
        style={{ clipPath: `inset(0 ${100 - p}% 0 0)` }}
      >
        <Photo k={a} alt={la} className="wsm-sw-layer" />
      </div>
      <span className="wsm-chip wsm-chip-l">{la}</span>
      <span className="wsm-chip wsm-chip-r">{lb}</span>
      <div className="wsm-sw-handle" style={{ left: `${p}%` }}>
        <span>‹ ›</span>
      </div>
      <input
        className="wsm-sw-range"
        type="range"
        min="0"
        max="100"
        step="0.5"
        value={p}
        aria-label={`Compare ${la} and ${lb}`}
        onChange={(e) => {
          touched.current = true;
          setP(Number(e.target.value));
        }}
      />
    </div>
  );
};

/* Orbit illustration for the title slide */
const stars = [
  [30, 40],
  [90, 330],
  [340, 60],
  [370, 300],
  [60, 170],
  [320, 180],
  [150, 30],
  [250, 372],
  [20, 262],
  [382, 120],
  [210, 12],
  [120, 390],
];
const Orbit = () => (
  <svg
    className="wsm-orbit"
    viewBox="0 0 400 400"
    role="img"
    aria-label="Sentinel-2 and Landsat orbiting the Earth"
  >
    <defs>
      <radialGradient id="wsm-globe" cx="35%" cy="30%" r="85%">
        <stop offset="0" stopColor="#6fd0dc" />
        <stop offset=".5" stopColor="#1d6b7c" />
        <stop offset="1" stopColor="#051b23" />
      </radialGradient>
      <clipPath id="wsm-clip">
        <circle cx="200" cy="200" r="104" />
      </clipPath>
      <path id="wsm-p1" d="M20,200 a180,70 0 1,0 360,0 a180,70 0 1,0 -360,0" />
      <path id="wsm-p2" d="M44,200 a156,50 0 1,0 312,0 a156,50 0 1,0 -312,0" />
    </defs>
    {stars.map(([x, y], i) => (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={i % 3 === 0 ? 1.6 : 1}
        fill="#e9f4f1"
        opacity=".55"
      />
    ))}
    <circle cx="200" cy="200" r="104" fill="url(#wsm-globe)" />
    <g
      clipPath="url(#wsm-clip)"
      fill="none"
      stroke="#e9f4f1"
      strokeOpacity=".2"
      strokeWidth="1"
    >
      <ellipse cx="200" cy="200" rx="104" ry="30" />
      <ellipse cx="200" cy="168" rx="86" ry="22" />
      <ellipse cx="200" cy="232" rx="86" ry="22" />
      <ellipse cx="200" cy="200" rx="0" ry="104">
        <animate
          attributeName="rx"
          values="0;104;0"
          dur="14s"
          begin="0s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse cx="200" cy="200" rx="0" ry="104">
        <animate
          attributeName="rx"
          values="0;104;0"
          dur="14s"
          begin="-4.6s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse cx="200" cy="200" rx="0" ry="104">
        <animate
          attributeName="rx"
          values="0;104;0"
          dur="14s"
          begin="-9.3s"
          repeatCount="indefinite"
        />
      </ellipse>
    </g>
    <g transform="rotate(-24 200 200)">
      <use
        href="#wsm-p1"
        fill="none"
        stroke="#ff8a3d"
        strokeOpacity=".55"
        strokeWidth="1.2"
        strokeDasharray="3 5"
      />
      <circle r="4.5" fill="#ff8a3d">
        <animateMotion dur="15s" repeatCount="indefinite">
          <mpath href="#wsm-p1" />
        </animateMotion>
      </circle>
      <circle r="4" fill="none" stroke="#ff8a3d">
        <animateMotion dur="15s" repeatCount="indefinite">
          <mpath href="#wsm-p1" />
        </animateMotion>
        <animate
          attributeName="r"
          values="4;14"
          dur="2.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values=".9;0"
          dur="2.2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
    <g transform="rotate(22 200 200)">
      <use
        href="#wsm-p2"
        fill="none"
        stroke="#6fd0dc"
        strokeOpacity=".5"
        strokeWidth="1.2"
        strokeDasharray="3 5"
      />
      <circle r="4" fill="#6fd0dc">
        <animateMotion dur="19s" repeatCount="indefinite">
          <mpath href="#wsm-p2" />
        </animateMotion>
      </circle>
    </g>
    <text
      x="300"
      y="52"
      fill="#ff8a3d"
      fontSize="12"
      fontFamily="IBM Plex Sans, system-ui, sans-serif"
    >
      Sentinel-2
    </text>
    <text
      x="36"
      y="360"
      fill="#6fd0dc"
      fontSize="12"
      fontFamily="IBM Plex Sans, system-ui, sans-serif"
    >
      Landsat
    </text>
  </svg>
);

/* =====================================================================
   SLIDE CONTENT
   bg    : full-bleed background photo key (see IMG)
   fig   : optional figure shown beside the content
   notes : speaker notes / extra theory (toggle with N or the Notes button)
   ===================================================================== */
const slides = [
  {
    kind: "title",
    bg: "hero",
    title: "World Satellite Monitor",
    body: "AI-integrated global Earth observation and multi-class land-cover monitoring with deep super-resolution and orbital telemetry",
    foot: [
      "Sentinel-2",
      "OpenSR LDSR",
      "ConvNeXt-FPN ensemble",
      "Keplerian telemetry",
    ],
    notes:
      "Open with the one-sentence claim: one autonomous system that goes from a coordinate to a published change map, and shows the satellites that produced the data. Mention the three study sites (Borneo rainforest, Punjab farmland, central-Indian forest) so the audience sees the range of biomes.",
  },
  {
    title: "Why monitoring needs to change",
    bg: "forest",
    fig: {
      k: "forest",
      cap: "Fragmented forest edges disappear at 10 m resolution",
    },
    render: () => (
      <Bullets
        items={[
          "Tropical deforestation, urban sprawl, wetland reclamation and land degradation need continuous monitoring",
          "Sentinel-2 (10 m) and Landsat (30 m) hide narrow roads, building clusters and fragmented forest edges",
          "Monsoon and tropical biomes suffer persistent cloud cover",
          "Single models generalise poorly across biomes, soils and seasons",
          "Raw bi-temporal differencing is noisy (phenology, registration jitter)",
          "GIS maps are static and disconnected from the satellites that capture the data",
        ]}
      />
    ),
    notes:
      "Spatial resolution is the ground sampling distance (GSD): one pixel averages everything inside a 10 m by 10 m square. A 6 m road under a 10 m pixel is blended with its surroundings (the mixed-pixel problem), so it cannot be classified cleanly. Phenology means seasonal greening and browning that look like change but are not land-cover change.",
  },
  {
    title: "Theory: from photons to pixels",
    bg: "s2",
    render: () => (
      <>
        <Bullets
          items={[
            "A passive optical sensor records sunlight reflected by the surface, band by band",
            "Healthy vegetation reflects strongly in near-infrared and absorbs red; water absorbs near-infrared",
            "Ratios of bands (indices) separate cover types and cancel part of the illumination effect",
            "Surface-reflectance (L2A) products remove most atmospheric scattering and absorption",
          ]}
        />
        <Formulas
          items={[
            [
              "Vegetation index",
              "NDVI = (B8 − B4) / (B8 + B4)",
              "High for dense canopy, near zero for bare soil",
            ],
            [
              "Water index",
              "NDWI = (B3 − B8) / (B3 + B8)",
              "Positive over open water",
            ],
          ]}
        />
        <Table
          head={["Band", "Name", "Centre (nm)", "GSD (m)"]}
          rows={[
            { c: ["B2", "Blue", 490, 10] },
            { c: ["B3", "Green", 560, 10] },
            { c: ["B4", "Red", 665, 10] },
            { c: ["B8", "Near-infrared", 842, 10] },
          ]}
        />
      </>
    ),
    notes:
      "These four 10 m bands are the ones that matter for this pipeline: they are the bands that OpenSR super-resolves. Indices are explained here only as intuition; the segmentation network learns richer features than NDVI or NDWI, but indices are a useful sanity check on its output.",
  },
  {
    title: "Related work",
    bg: "grid",
    render: () => (
      <Bullets
        items={[
          "Sentinel-2 and Landsat-8: baseline radiometry for vegetation and surface reflectance (Drusch, Roy)",
          "Super-resolution: SRCNN, SRGAN, then ESA OpenSR diffusion models (10 m → 2.5 m)",
          "LoveDA exposes urban/rural domain gaps; U-Net and DeepLabV3+ struggle with multi-scale objects",
          "ConvNeXt modernises ConvNets; FPN fuses shallow detail with deep semantics",
          "Deep ensembles and dihedral TTA reduce uncertainty and improve calibration",
          "Post-classification comparison needs confidence thresholds; SGP4 enables real-time orbit propagation",
        ]}
      />
    ),
    notes:
      "Position the work as an integration: each ingredient exists, but they are rarely chained together with confidence-aware change analysis and live orbital context. Regression-based SR (SRCNN, ESRGAN) optimises pixel loss and tends to blur or invent texture; diffusion models sample from a learned distribution conditioned on the low-resolution input.",
  },
  {
    title: "Six-stage pipeline",
    bg: "night",
    render: () => (
      <Steps
        items={[
          ["Coordinate ingestion", "Non-maximum spatial suppression, UTM zone"],
          [
            "Cloud-filtered harvest",
            "Google Earth Engine, Sentinel-2 SR, SCL mask",
          ],
          ["4× LDSR", "Tiled OpenSR, 10 m → 2.5 m"],
          ["Segmentation", "5-fold ConvNeXt-Small FPN + 8-view TTA"],
          [
            "Change analysis",
            "Confidence-gated differencing, transition matrix",
          ],
          ["Publishing", "GeoTIFF export, summary.json, 3D telemetry HUD"],
        ]}
      />
    ),
    notes:
      "Each stage writes an artefact that the next stage reads (plots, composites, super-resolved tiles, probability maps, change maps, GeoTIFFs). That makes the pipeline restartable and auditable: any intermediate result can be inspected or re-run without redoing the whole chain.",
  },
  {
    title: "Algorithm in eight phases",
    bg: "grid",
    render: () => (
      <Bullets
        items={[
          "NMS: keep largest non-overlapping plots; side = √acres × 4046.86 m",
          "Ingest S2_SR_HARMONIZED for T−10Y, T−5Y, now; SCL ∈ {4,5,6,7}; clear fraction ≥ 0.80 (fallback 0.30)",
          "LDSR on 96×96 core tiles with 16 px margins to avoid seams",
          "Ensemble mean over 5 folds × 8 dihedral views = 40 predictions",
          "Change Δ(p) = (ŷA ≠ ŷB) ∧ min(CA, CB) ≥ 0.50",
          "7×7 Markov transition matrix; severity Low < 5%, Moderate 5–15%, Severe > 15%",
          "Export 4-band GeoTIFF and 5-panel diagnostic sheets",
          "Propagate Sentinel-2 and Landsat orbits: T = 2π√(a³/μ)",
        ]}
      />
    ),
    notes:
      "This is the reference slide: every number used later comes from one of these eight lines. One acre is 4046.86 m², so a 200-acre plot is a square about 900 m on a side, and a 500-acre plot about 1.42 km.",
  },
  {
    title: "Method: site selection and cloud-aware compositing",
    bg: "wetland",
    render: () => (
      <>
        <Formulas
          items={[
            [
              "Plot geometry",
              "side = √(acres × 4046.86) m",
              "Square footprint centred on the coordinate",
            ],
            [
              "Clear fraction",
              "f = N(SCL ∈ {4,5,6,7}) / N(valid pixels)",
              "Keep a scene when f ≥ 0.80, fall back to 0.30",
            ],
          ]}
        />
        <Bullets
          items={[
            "Non-maximum suppression drops smaller plots that overlap a larger one, so no area is counted twice",
            "The UTM zone is chosen from longitude so that pixel size is metric and nearly distortion-free",
            "The SCL mask keeps vegetation, bare soil, water and unclassified land, and rejects cloud, shadow and snow",
            "Per-pixel median over the clear scenes in a season suppresses residual haze and single-date outliers",
          ]}
        />
        <Callout>
          The fallback threshold exists for monsoon and rainforest plots, where
          a strict 80% rule would leave no usable scene at all.
        </Callout>
      </>
    ),
    notes:
      "Median compositing is preferred over the mean because clouds and shadows are outliers in the reflectance distribution; a median ignores them as long as most observations are clear. The two-level threshold is a deliberate trade-off between image quality and temporal coverage.",
  },
  {
    title: "Method: diffusion super-resolution",
    bg: "s2",
    render: () => (
      <>
        <Formulas
          items={[
            [
              "Forward process",
              "q(z_t | z₀) = N(√ᾱ_t · z₀, (1 − ᾱ_t) I)",
              "Noise is added to the latent code step by step",
            ],
            [
              "Training objective",
              "L = E ‖ ε − ε_θ(z_t, t, c_LR) ‖²",
              "Network predicts the noise, given the low-resolution condition",
            ],
            [
              "Reverse process",
              "z_{t−1} = μ_θ(z_t, t, c_LR) + σ_t · ξ",
              "Start from noise and denoise to a 2.5 m latent, then decode",
            ],
          ]}
        />
        <Bullets
          items={[
            "Working in a latent space keeps the 4× upscaling affordable for large plots",
            "The low-resolution multispectral image conditions every denoising step, so structure follows the real scene",
            "Core tiles of 96×96 px with 16 px margins are blended so that tile seams do not appear",
          ]}
        />
      </>
    ),
    notes:
      "A diffusion model learns to undo gradual noising. Conditioning on the low-resolution image c_LR means the model refines what the satellite actually saw instead of drawing arbitrary detail. Super-resolution cannot create information that was never measured; it produces a plausible, spectrally consistent estimate, which is why SAM (spectral angle) is reported alongside PSNR and SSIM.",
  },
  {
    title: "Study sites and data",
    bg: "city",
    render: () => (
      <>
        <Table
          head={["Site", "Location", "Area", "Setting"]}
          rows={[
            {
              c: [
                "Nusantara",
                "−0.973 N, 116.709 E",
                "500 acres",
                "Rainforest and mangrove, capital construction",
              ],
            },
            {
              c: [
                "Phagwara",
                "31.253 N, 75.704 E",
                "200 acres",
                "Wheat-rice plain, peri-urban growth",
              ],
            },
            {
              c: [
                "Hasdeo Arand",
                "22.620 N, 82.550 E",
                "10,000 acres",
                "Sal forest under mining pressure",
              ],
            },
          ]}
        />
        <div className="wsm-tiles">
          {[
            ["nusantara", "Nusantara"],
            ["phagwara", "Phagwara"],
            ["hasdeo", "Hasdeo Arand"],
          ].map(([k, n]) => (
            <div className="wsm-tile" key={k}>
              <Photo k={k} alt={n} />
              <span>{n}</span>
            </div>
          ))}
        </div>
        <p className="wsm-note">
          Training: LoveDA, 5,987 aerial images (1024², 0.3 m), 7 classes:
          Background, Building, Road, Water, Barren, Forest, Agriculture.
        </p>
      </>
    ),
    notes:
      "The three sites differ on purpose: an equatorial wet biome, an intensively farmed alluvial plain and a dry deciduous forest. If one model handles all three, that is evidence of generalisation. Note the data mismatch: the model is trained on 0.3 m aerial imagery and applied to 2.5 m super-resolved satellite imagery, which is why the ensemble and confidence gating matter.",
  },
  {
    title: "Models",
    bg: "grid",
    render: () => (
      <div className="wsm-two">
        <div>
          <h4>OpenSR LDSR</h4>
          <Bullets
            items={[
              "Encode to latent space, denoise with ε-θ(z-t, t, c-LR)",
              "Loss: ‖ε − ε-θ‖² in latent space",
              "Conditioned on bicubic multispectral features",
            ]}
          />
        </div>
        <div>
          <h4>ConvNeXt-Small FPN</h4>
          <Bullets
            items={[
              "Stages [96, 192, 384, 768] projected to 128 channels",
              "Top-down merge, 1×1 head to 7 classes",
              "Loss = Cross-Entropy + Dice",
              "D4 TTA: 4 rotations × flip",
            ]}
          />
        </div>
      </div>
    ),
    notes:
      "ConvNeXt borrows design choices from transformers (large 7×7 kernels, LayerNorm, inverted bottlenecks) while staying fully convolutional, so it is fast and easy to tile. The FPN decoder is what keeps thin structures such as roads: shallow stages hold edges and texture, deep stages hold meaning, and the top-down path combines them.",
  },
  {
    title: "Method: loss, ensembling and test-time augmentation",
    bg: "night",
    render: () => (
      <>
        <Formulas
          items={[
            [
              "Training loss",
              "L = CE(p, y) + [1 − 2·Σ p·y / (Σ p + Σ y)]",
              "Cross-entropy for pixels, Dice for class balance",
            ],
            [
              "Ensemble mean",
              "p̄(x) = (1/40) Σₖ Σ_d T_d⁻¹ f_k(T_d x)",
              "5 folds k, 8 dihedral transforms d, undone before averaging",
            ],
            [
              "Prediction and confidence",
              "ŷ = argmax_c p̄_c,   C = max_c p̄_c",
              "C feeds the change gate",
            ],
          ]}
        />
        <Bullets
          items={[
            "Dice term stops rare classes such as Road and Building being swamped by Background and Agriculture",
            "Independent folds make different errors; averaging cancels part of them and calibrates the probabilities",
            "Satellite scenes have no preferred orientation, so the 8 rotations and flips are valid views of the same scene",
          ]}
        />
      </>
    ),
    notes:
      "The averaged probability is much better calibrated than a single softmax output, which is why it is a useful confidence score. The spread shrinks from ±8.7% to ±3.1% with TTA (shown later). Five-fold training also means every image was held out in exactly one fold, which gives an honest validation estimate.",
  },
  {
    title: "Segmentation accuracy (LoveDA)",
    bg: "farm",
    render: () => (
      <>
        <Stats
          items={[
            [80.7, 1, "%", "pixel accuracy"],
            [88.2, 1, "%", "peak class F1 (Water)"],
            [80.4, 1, "%", "mean F1 score"],
          ]}
        />
        <Table
          head={["Class", "IoU", "F1", "Area MAE (pts)", "Assessment"]}
          rows={[
            { c: ["Water", "0.789", "0.882", "0.782 pts", "Peak fidelity"], hl: true },
            { c: ["Agriculture", "0.780", "0.876", "2.965 pts", "High fidelity"], hl: true },
            { c: ["Forest", "0.743", "0.852", "2.675 pts", "High fidelity"], hl: true },
            { c: ["Road", "0.654", "0.791", "1.090 pts", "Nominal"] },
            { c: ["Background", "0.622", "0.767", "6.582 pts", "Nominal"] },
            { c: ["Building", "0.602", "0.751", "1.784 pts", "Nominal"] },
            { c: ["Barren", "0.545", "0.706", "2.203 pts", "Nominal"] },
            { hl: true, c: ["Overall (2,522 OOF)", "Acc: 80.7%", "mF1: 0.804", "<2.5 pt MAE", "5-Fold CV"] },
          ]}
        />
      </>
    ),
    notes:
      "IoU = TP / (TP + FP + FN) and is stricter than F1 = 2TP / (2TP + FP + FN). Water is easiest because it is spectrally distinct; Barren is hardest because it overlaps with dry agriculture and built surfaces. These scores are on LoveDA aerial imagery, so they describe the segmentation model, not end-to-end accuracy on super-resolved satellite scenes.",
  },
  {
    title: "Super-resolution quality",
    bg: "s2",
    fig: { k: "grid", cap: "Tiled 4× diffusion output, 10 m → 2.5 m" },
    render: () => (
      <>
        <Table
          head={["Method", "PSNR (dB)", "SSIM", "SAM (°)", "mIoU gain"]}
          rows={[
            { c: ["Bicubic 4×", 26.42, 0.781, 6.82, "+0.00%"] },
            { c: ["SRCNN", 28.15, 0.803, 5.94, "+0.92%"] },
            { c: ["ESRGAN", 29.18, 0.824, 5.41, "+1.84%"] },
            {
              hl: true,
              c: ["OpenSR LDSR (proposed)", 33.74, 0.912, 2.38, "+4.19%"],
            },
          ]}
        />
        <p className="wsm-note">
          Diffusion restores real structure with low spectral distortion rather
          than hallucinating artefacts.
        </p>
      </>
    ),
    notes:
      "PSNR measures pixel error in decibels (higher is better). SSIM compares local structure, contrast and luminance (closer to 1 is better). SAM is the angle between the spectral vectors of reference and output (lower is better), so it detects colour or spectral drift that PSNR can miss. The mIoU gain column ties image quality to the downstream task.",
  },
  {
    title: "Method: confidence-gated change detection",
    bg: "city",
    render: () => (
      <>
        <Formulas
          items={[
            [
              "Change mask",
              "Δ(p) = [ ŷ_A(p) ≠ ŷ_B(p) ] ∧ [ min(C_A(p), C_B(p)) ≥ 0.50 ]",
              "A pixel changes only if both dates agree they are confident",
            ],
            [
              "Transition matrix",
              "M_ij = N(ŷ_A = i, ŷ_B = j) / N",
              "Share of the plot moving from class i to class j",
            ],
            [
              "Change fraction",
              "ρ = Σ_{i≠j} M_ij",
              "Low < 5%, Moderate 5–15%, Severe > 15%",
            ],
          ]}
        />
        <Bullets
          items={[
            "Plain differencing reports every disagreement, including those caused by shadows, season and misregistration",
            "Requiring confidence on both dates removes most unstable pixels while keeping real conversions",
            "Off-diagonal cells of M explain what changed, for example Water → Barren, not only how much",
          ]}
        />
      </>
    ),
    notes:
      "This is post-classification comparison: each date is classified independently, then compared. Its strength is that no radiometric normalisation between dates is needed; its weakness is that errors in both maps add up, which is exactly what the confidence gate limits. The 0.50 threshold is a tunable operating point between missed change and false alarms.",
  },
  {
    title: "Nusantara: 45.91% change (Severe), 2021 → 2026",
    bg: "nusantara",
    render: () => (
      <>
        <div className="wsm-two wsm-two-wide">
          <Swipe a="nusA" b="nusB" la="2021" lb="2026" />
          <Compare
            a="2021"
            b="2026"
            rows={[
              ["Water", 41.88, 14.78],
              ["Barren", 3.9, 16.15],
              ["Road", 0.1, 3.29],
            ]}
          />
        </div>
        <p className="wsm-note">
          Water → Background 21.54% · Water → Barren 7.04%: canalisation,
          reclamation and soil levelling.
        </p>
      </>
    ),
    notes:
      "Drag the slider to compare the two dates. The dominant transitions all start from Water, which fits a wetland and mangrove landscape being drained, levelled and built over for capital-city construction. Road rising from 0.10% to 3.29% is the kind of narrow structure that only becomes measurable after 4× super-resolution.",
  },
  {
    title: "Phagwara: 20.80% change (Severe), 2016 → 2026",
    bg: "phagwara",
    render: () => (
      <div className="wsm-two wsm-two-wide">
        <Swipe a="phgA" b="phgB" la="2016" lb="2026" />
        <div>
          <Compare a="2016" b="2026" rows={[["Agriculture", 10.15, 0.83]]} />
          <Bullets
            items={[
              "Barren → Background 10.65%, Agriculture → Background 7.34%",
              "Building expansion 1.60%: farmland converting to industrial and residential use",
            ]}
          />
        </div>
      </div>
    ),
    notes:
      "Peri-urban growth on high-quality alluvial farmland is permanent: once converted, land rarely returns to agriculture. Remember the caveat about crop seasonality: Agriculture and Barren can swap with the harvest calendar, which is one reason the same-season composites and the confidence gate are important here.",
  },
  {
    title: "Hasdeo Arand: forest down 25.24% since 1990",
    bg: "hasdeo",
    render: () => (
      <>
        <div className="wsm-two wsm-two-wide">
          <Swipe a="hasA" b="hasB" la="1990" lb="2026" />
          <Trend
            unit="Dense forest, kHa"
            max={170}
            pts={[
              [1990, 170],
              [2026, 127.09],
            ]}
          />
        </div>
        <p className="wsm-note">
          Mining, washeries and transport corridors grew from 4.10 kHa to 31.42
          kHa, tracking clearance leases.
        </p>
      </>
    ),
    notes:
      "At 10,000 acres this is the largest plot, so it tests tiling and throughput as much as accuracy. Forest loss is rarely a single event: mine pits, coal washeries and haul roads open up the canopy and fragment what remains, which raises edge effects well beyond the cleared area.",
  },
  {
    title: "Confidence and efficiency",
    bg: "night",
    render: () => (
      <>
        <Stats
          items={[
            [91.4, 1, "%", "median confidence"],
            [3.1, 1, "%", "confidence spread (was 8.7%)"],
            [42.6, 1, " ms", "per 128×128 tile"],
            [100.65, 2, " min", "Sentinel-2 period"],
          ]}
        />
        <Bullets
          items={[
            "TTA narrows confidence spread from ±8.7% to ±3.1% (median 91.4%)",
            "42.6 ms per 128×128 super-resolved tile on the Pareto frontier",
            "Transformer backbones cost about 3× the latency for no gain",
            "Live 3D globe shows Sentinel-2 and Landsat positions in real time (S2 period 100.65 min)",
          ]}
        />
      </>
    ),
    notes:
      "A Pareto frontier point means no tested model is both faster and more accurate. Averaging 40 predictions costs compute, but the tiles are small and batched, so the total remains practical. The narrower spread matters operationally: it makes the 0.50 gate behave consistently from one scene to the next.",
  },
  {
    title: "Theory: orbital telemetry",
    bg: "hero",
    render: () => (
      <>
        <Formulas
          items={[
            [
              "Kepler's third law",
              "T = 2π √(a³ / μ)",
              "μ = 398 600.44 km³/s² for Earth, a = Earth radius + altitude",
            ],
            [
              "Propagation",
              "SGP4( TLE, t ) → position r, velocity v",
              "Two-line elements describe the orbit at an epoch",
            ],
          ]}
        />
        <Table
          head={["Mission", "Altitude", "Period", "Revisit"]}
          rows={[
            {
              c: [
                "Sentinel-2 (A/B)",
                "≈ 786 km",
                "100.65 min",
                "5 days (two satellites)",
              ],
            },
            {
              c: [
                "Landsat 8/9",
                "≈ 705 km",
                "≈ 99 min",
                "8 days (two satellites)",
              ],
            },
          ]}
        />
        <Bullets
          items={[
            "Both are sun-synchronous, so they cross the equator at a fixed local solar time and give consistent illumination",
            "SGP4 includes Earth oblateness and drag, which pure Kepler motion ignores, so it stays accurate over days",
          ]}
        />
      </>
    ),
    notes:
      "Check the arithmetic live if asked: with a mean radius of about 6371 km plus 786 km, a ≈ 7157 km and T ≈ 100 minutes, which agrees with the quoted 100.65 min once the exact mean orbital radius is used. The HUD globe is driven by the same propagation, so it shows where each satellite really is, not an animation.",
  },
  {
    title: "Validation and limitations",
    bg: "mine",
    render: () => (
      <div className="wsm-two">
        <div>
          <h4>What the results support</h4>
          <Bullets
            items={[
              "Segmentation quality measured on held-out LoveDA folds",
              "Super-resolution quality measured against reference imagery with PSNR, SSIM and SAM",
              "Change maps that are consistent with known land-use events at all three sites",
            ]}
          />
        </div>
        <div>
          <h4>What needs care</h4>
          <Bullets
            items={[
              "Domain shift: trained on 0.3 m aerial images, applied to 2.5 m super-resolved satellite scenes",
              "Super-resolution estimates detail; it does not measure it, so very small objects need field checks",
              "Seasonal crop cycles can mimic change between Agriculture and Barren",
              "Site-level change figures have no independent ground-truth survey yet",
            ]}
          />
        </div>
      </div>
    ),
    notes:
      "Be explicit about this slide in a research setting. The strongest next step is a small, independently labelled reference set (visual interpretation of very-high-resolution imagery or field points) at each site, followed by a standard area-adjusted accuracy assessment with confidence intervals on the change estimates.",
  },
  {
    title: "Conclusion and next steps",
    bg: "night",
    render: () => (
      <div className="wsm-two">
        <div>
          <h4>Delivered</h4>
          <Bullets
            items={[
              "Autonomous pipeline from harvest to publishing",
              "10 m → 2.5 m with 80.7% pixel accuracy (80.4% mF1, up to 88.2% class fidelity) on 7 classes",
              "Confidence gating suppresses false change",
            ]}
          />
        </div>
        <div>
          <h4>Future work</h4>
          <Bullets
            items={[
              "Sentinel-1 SAR fusion for all-weather cover",
              "Foundation models (Prithvi, SatMAE)",
              "Quantised on-orbit inference on CubeSats",
            ]}
          />
        </div>
      </div>
    ),
    notes:
      "Close on the future work that answers the earlier limitations: SAR sees through cloud and fixes the monsoon gap; foundation models pre-trained on satellite data should reduce domain shift; on-orbit inference would send down change maps instead of raw imagery.",
  },
];

/* ---------- modal ---------- */
const exitNative = () => {
  if (document.fullscreenElement)
    document.exitFullscreen?.()?.catch?.(() => {});
};

export default function SatelliteSlidesModal({ open, onClose, embedded = false }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const [notes, setNotes] = useState(false);
  const box = useRef(null);
  const touchX = useRef(null);
  const last = slides.length - 1;

  const go = useCallback(
    (d) => setI((v) => Math.min(last, Math.max(0, v + d))),
    [last],
  );

  // Stable refs so the window listeners are attached once per open
  const goRef = useRef(go);
  goRef.current = go;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const fullRef = useRef(full);
  fullRef.current = full;

  const toggleFull = useCallback(() => {
    const next = !fullRef.current;
    setFull(next);
    if (next) {
      if (!document.fullscreenElement)
        box.current?.requestFullscreen?.()?.catch?.(() => {});
    } else {
      exitNative();
    }
  }, []);

  // Reset to the first slide only when modal transitions from closed to open
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current && !embedded) {
      setI(0);
      setNotes(false);
    }
    wasOpenRef.current = open;
  }, [open, embedded]);

  // Preload the next slide's background
  useEffect(() => {
    if (!open) return;
    try {
      const nxt = slides[i + 1];
      if (nxt?.bg) {
        const file = IMG[nxt.bg] || nxt.bg;
        const im = new Image();
        im.src = getAssetUrl(file);
      }
    } catch {}
  }, [open, i]);

  // Keyboard navigation and body scroll lock
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      const onRange = e.target?.tagName === "INPUT";
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        if (onRange && e.key.startsWith("Arrow")) return;
        e.preventDefault();
        goRef.current(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (onRange && e.key.startsWith("Arrow")) return;
        e.preventDefault();
        goRef.current(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setI(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setI(last);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFull();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setNotes((v) => !v);
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) exitNative();
        else if (fullRef.current) setFull(false);
        else onCloseRef.current?.();
      }
    };

    const onFs = () => {
      if (!document.fullscreenElement && fullRef.current) setFull(false);
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);

    let prevOverflow = "";
    if (!embedded || full) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (!embedded || full) {
        document.body.style.overflow = prevOverflow;
      }
      exitNative();
    };
  }, [open, embedded, full, toggleFull, last]);

  // Subtle parallax on the background photo (no re-render)
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      "--mx",
      ((e.clientX - r.left) / r.width - 0.5).toFixed(3),
    );
    e.currentTarget.style.setProperty(
      "--my",
      ((e.clientY - r.top) / r.height - 0.5).toFixed(3),
    );
  };

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 60 && !e.target.closest?.(".wsm-swipe"))
      go(dx < 0 ? 1 : -1);
  };

  if (!open) return null;
  const s = slides[i];
  const isTitle = s.kind === "title";

  const slideContent = (
    <div
      ref={box}
      className={"wsm-modal" + (embedded ? " wsm-embedded" : "") + (full ? " is-full" : "")}
      role="dialog"
      aria-modal={!embedded}
      aria-label="World Satellite Monitor presentation"
      onClick={(e) => e.stopPropagation()}
    >
      <style>{css}</style>

        <div className="wsm-progress" aria-hidden="true">
          <div style={{ width: `${(i / last) * 100}%` }} />
        </div>

        <header className="wsm-bar">
          <div className="wsm-bar-title">
            <span className="wsm-badge">Presentation</span>
            <span>World Satellite Monitor</span>
          </div>
          <div className="wsm-bar-actions">
            <button
              onClick={() => setNotes((v) => !v)}
              className={`wsm-btn ${notes ? "active" : ""}`}
              aria-pressed={notes}
              title="Speaker notes and theory (N)"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 5h16M4 12h16M4 19h10" />
              </svg>
              <span>Notes</span>
            </button>
            <button
              onClick={toggleFull}
              className={`wsm-btn ${full ? "active" : ""}`}
              aria-label="Toggle full screen"
              title={full ? "Exit full screen (F)" : "Full screen (F)"}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {full ? (
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                ) : (
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                )}
              </svg>
              <span>{full ? "Exit full screen" : "Full screen"}</span>
            </button>
            {(!embedded || full || onClose) && (
              <button
                onClick={() => {
                  if (full) toggleFull();
                  else onClose?.();
                }}
                className="wsm-btn wsm-btn-close"
                aria-label={full ? "Exit full screen" : "Close presentation"}
                title={full ? "Exit full screen (F or Esc)" : "Close (Esc)"}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                <span>{full ? "Exit Full" : "Close"}</span>
              </button>
            )}
          </div>
        </header>

        <main
          className="wsm-stage"
          onMouseMove={onMove}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="wsm-bg" key={"bg" + i}>
            {s.bg && <Photo k={s.bg} className="wsm-bgimg" eager quiet />}
          </div>
          <div className="wsm-veil" />

          <div className="wsm-pane" key={"pane" + i}>
            <section className={"wsm-slide" + (isTitle ? " is-title" : "")}>
              {isTitle ? (
                <div className="wsm-title-wrap">
                  <div>
                    <h2>{s.title}</h2>
                    <p className="wsm-lead">{s.body}</p>
                    <div className="wsm-chips">
                      {s.foot.map((f) => (
                        <span key={f}>{f}</span>
                      ))}
                    </div>
                  </div>
                  <Orbit />
                </div>
              ) : (
                <>
                  <h2>{s.title}</h2>
                  {s.fig ? (
                    <div className="wsm-split">
                      <div className="wsm-split-main">{s.render()}</div>
                      <Fig k={s.fig.k} cap={s.fig.cap} />
                    </div>
                  ) : (
                    s.render()
                  )}
                </>
              )}
            </section>
          </div>

          <div className="wsm-scanline" key={"scan" + i} aria-hidden="true" />

          <aside
            className={"wsm-notes" + (notes ? " open" : "")}
            aria-hidden={!notes}
          >
            <h5>Speaker notes and theory</h5>
            <p>{s.notes}</p>
          </aside>
        </main>

        <footer className="wsm-nav">
          <button onClick={() => go(-1)} disabled={i === 0}>
            Previous
          </button>
          <div className="wsm-dots">
            {slides.map((_, k) => (
              <button
                key={k}
                className={k === i ? "on" : ""}
                onClick={() => setI(k)}
                aria-label={`Go to slide ${k + 1}`}
                aria-current={k === i}
              />
            ))}
          </div>
          <span className="wsm-count">
            {i + 1} / {slides.length}
          </span>
          <button onClick={() => go(1)} disabled={i === last}>
            Next
          </button>
        </footer>
      </div>
    );

  if (embedded && !full) {
    return slideContent;
  }

  const modalNode = (
    <div
      className={"wsm-backdrop" + (full ? " is-full" : "")}
      onClick={onClose}
    >
      {slideContent}
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalNode, document.body)
    : modalNode;
}

/* ---------- styles (scoped by wsm- prefix) ---------- */
const css = `
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&display=swap");

.wsm-modal{--ink:#071a22;--deep:#0c2b36;--sea:#3fb3c6;--ice:#e9f4f1;--mist:#9db8b8;--flare:#ff8a3d;
  --glass:rgba(10,36,46,.62);--line:rgba(233,244,241,.16);
  font-family:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ice)}
.wsm-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(3,10,13,.86);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:2vh 2vw}
.wsm-backdrop.is-full{padding:0 !important}
.wsm-modal{position:relative;width:min(1240px,96vw);height:min(840px,94vh);background:var(--ink);border-radius:14px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.7),0 0 0 1px var(--line);transition:width .2s ease,height .2s ease,border-radius .2s ease}
.wsm-modal.wsm-embedded{width:100% !important;height:100% !important;max-width:100% !important;max-height:100% !important;border-radius:8px !important;box-shadow:none !important}
.wsm-modal.is-full{position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;max-width:100vw !important;max-height:100vh !important;border-radius:0 !important;box-shadow:none !important;z-index:100000 !important}

.wsm-progress{position:absolute;top:0;left:0;right:0;height:3px;z-index:30;background:rgba(233,244,241,.08)}
.wsm-progress div{height:100%;background:linear-gradient(90deg,var(--sea),var(--flare));transition:width .45s cubic-bezier(.4,0,.2,1)}

.wsm-bar{position:relative;z-index:20;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 18px;background:rgba(5,18,23,.92);border-bottom:1px solid var(--line);font-size:15px}
.wsm-bar-title{display:flex;align-items:center;gap:10px;font-weight:600;min-width:0}
.wsm-badge{font-size:11px;font-weight:600;background:var(--flare);color:var(--ink);padding:2px 10px;border-radius:999px}
.wsm-bar-actions{display:flex;align-items:center;gap:8px}
.wsm-btn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:13px;font-weight:500;cursor:pointer;border-radius:8px;padding:6px 12px;background:rgba(233,244,241,.07);color:var(--ice);border:1px solid var(--line);transition:background .15s,border-color .15s,color .15s}
.wsm-btn:hover,.wsm-btn.active{background:rgba(63,179,198,.22);border-color:rgba(63,179,198,.7)}
.wsm-btn-close:hover{background:rgba(255,90,80,.22);border-color:rgba(255,120,110,.7);color:#ffc9c3}

/* stage layers */
.wsm-stage{position:relative;flex:1;overflow:hidden;--mx:0;--my:0}
.wsm-bg{position:absolute;inset:-3%;transform:translate3d(calc(var(--mx) * -18px),calc(var(--my) * -12px),0);transition:transform .5s ease-out;background:radial-gradient(120% 90% at 20% 10%,#12404d 0%,#0a2029 55%,#061219 100%)}
.wsm-photo{position:relative;overflow:hidden;background:linear-gradient(135deg,#0f3a46,#0a2029)}
.wsm-photo img{display:block;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .7s ease}
.wsm-photo.ok img{opacity:1}
.wsm-miss{position:absolute;left:10px;bottom:8px;font-size:11px;color:var(--mist);opacity:.7}
.wsm-bgimg{position:absolute;inset:0;background:transparent}
.wsm-bgimg.ok img{opacity:.5;animation:wsm-drift 32s ease-in-out infinite alternate}
@keyframes wsm-drift{from{transform:scale(1.04) translate(0,0)}to{transform:scale(1.17) translate(-2.2%,-1.6%)}}
.wsm-veil{position:absolute;inset:0;background:linear-gradient(95deg,rgba(7,26,34,.96) 0%,rgba(7,26,34,.8) 48%,rgba(7,26,34,.5) 100%),linear-gradient(0deg,rgba(7,26,34,.7),transparent 35%)}

/* the single orchestrated moment: a push-broom scan reveals each slide */
.wsm-pane{position:relative;z-index:2;height:100%;overflow:auto;display:flex;animation:wsm-reveal .95s cubic-bezier(.5,0,.25,1) both}
@keyframes wsm-reveal{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
.wsm-scanline{position:absolute;left:0;right:0;top:0;height:2px;z-index:6;pointer-events:none;background:linear-gradient(90deg,transparent,var(--sea) 20%,#fff 50%,var(--sea) 80%,transparent);box-shadow:0 0 26px 7px rgba(63,179,198,.5);animation:wsm-sweep .95s cubic-bezier(.5,0,.25,1) both}
@keyframes wsm-sweep{0%{top:0;opacity:1}88%{opacity:1}100%{top:100%;opacity:0}}

.wsm-slide{margin:auto;width:100%;max-width:1040px;padding:4vh 44px 5vh}
.wsm-slide h2{font-family:Fraunces,Georgia,"Times New Roman",serif;font-size:clamp(25px,3.3vw,42px);line-height:1.12;margin:0 0 26px;color:var(--ice);font-weight:700;letter-spacing:-.015em;max-width:22em;text-wrap:balance}
.wsm-slide.is-title h2{font-size:clamp(38px,6.2vw,78px);line-height:1.02;margin-bottom:22px}
.wsm-title-wrap{display:grid;grid-template-columns:1.15fr .85fr;align-items:center;gap:20px}
.wsm-lead{font-size:clamp(17px,2vw,24px);line-height:1.5;max-width:30em;margin:0 0 26px;color:#cfe3df}
.wsm-chips{display:flex;flex-wrap:wrap;gap:8px}
.wsm-chips span{border:1px solid rgba(233,244,241,.28);border-radius:999px;padding:5px 13px;font-size:13px;color:var(--mist)}
.wsm-orbit{width:100%;max-width:420px;justify-self:center;filter:drop-shadow(0 0 40px rgba(63,179,198,.25))}

/* lists, notes, callouts */
.wsm-list{margin:0;padding-left:1.15em;font-size:clamp(15px,1.75vw,21px);line-height:1.55;max-width:34em}
.wsm-list li{margin-bottom:.5em}
.wsm-list li::marker{color:var(--flare)}
.wsm-note{margin:20px 0 0;font-size:clamp(14px,1.55vw,18px);color:var(--mist);max-width:42em;line-height:1.55}
.wsm-callout{margin:18px 0 0;padding:12px 16px;border-left:3px solid var(--flare);background:var(--glass);font-size:clamp(14px,1.5vw,17px);line-height:1.5;max-width:44em;border-radius:0 8px 8px 0}

/* tables */
.wsm-scroll{overflow-x:auto;margin:14px 0 0;border:1px solid var(--line);border-radius:10px;background:var(--glass);backdrop-filter:blur(4px)}
.wsm-table{border-collapse:collapse;width:100%;font-size:clamp(13px,1.45vw,16px)}
.wsm-table th{text-align:left;background:rgba(63,179,198,.18);color:var(--ice);padding:9px 14px;font-weight:600;border-bottom:1px solid var(--line)}
.wsm-table td{padding:8px 14px;border-bottom:1px solid rgba(233,244,241,.09);font-variant-numeric:tabular-nums}
.wsm-table tbody tr:last-child td{border-bottom:0}
.wsm-table tr.hl td{background:rgba(255,138,61,.2);font-weight:600}
.wsm-table tbody tr{transition:background .15s}
.wsm-table tbody tr:hover td{background:rgba(233,244,241,.06)}
.wsm-table tr.hl:hover td{background:rgba(255,138,61,.28)}

/* pipeline steps: a real sequence, so numbered */
.wsm-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.wsm-step{position:relative;border:1px solid var(--line);background:var(--glass);backdrop-filter:blur(4px);padding:16px 18px 16px 52px;display:flex;flex-direction:column;gap:6px;border-radius:10px;animation:wsm-step-in .5s ease both;animation-delay:var(--d,.4s)}
@keyframes wsm-step-in{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.wsm-step em{position:absolute;left:14px;top:14px;width:26px;height:26px;border-radius:50%;background:var(--flare);color:var(--ink);font-style:normal;font-weight:700;font-size:14px;display:grid;place-items:center}
.wsm-step b{font-size:clamp(15px,1.7vw,19px);color:var(--ice)}
.wsm-step span{font-size:clamp(13px,1.35vw,15px);color:var(--mist);line-height:1.45}

/* formula cards */
.wsm-formulas{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px;margin:0 0 18px}
.wsm-formula{border:1px solid var(--line);border-top:2px solid var(--sea);background:var(--glass);backdrop-filter:blur(4px);border-radius:10px;padding:12px 16px;display:flex;flex-direction:column;gap:6px}
.wsm-formula small{font-size:13px;color:var(--mist)}
.wsm-formula code{font-family:"Cambria Math","STIX Two Math","Latin Modern Math",Georgia,serif;font-size:clamp(15px,1.7vw,20px);line-height:1.35;color:#fff;overflow-wrap:anywhere}
.wsm-formula span{font-size:13px;line-height:1.4;color:#b7ccca}

/* two-column and split layouts */
.wsm-two{display:grid;grid-template-columns:1fr 1fr;gap:34px;align-items:start}
.wsm-two-wide{align-items:center;gap:28px}
.wsm-two h4{margin:0 0 12px;font-family:Fraunces,Georgia,serif;font-size:clamp(18px,2vw,25px);color:var(--sea)}
.wsm-two .wsm-list{font-size:clamp(14px,1.55vw,19px)}
.wsm-split{display:grid;grid-template-columns:1.25fr .75fr;gap:30px;align-items:start}
.wsm-split-main{min-width:0}
.wsm-fig{position:relative;margin:0;border-radius:10px;overflow:hidden;border:1px solid var(--line)}
.wsm-fig .wsm-photo{aspect-ratio:4/5;width:100%}
.wsm-fig figcaption{position:absolute;left:0;right:0;bottom:0;padding:26px 14px 12px;font-size:13px;line-height:1.35;background:linear-gradient(0deg,rgba(4,14,18,.92),transparent);color:var(--ice)}
.wsm-fig::before,.wsm-fig::after{content:"";position:absolute;width:18px;height:18px;z-index:3;border:2px solid var(--flare);pointer-events:none}
.wsm-fig::before{top:8px;left:8px;border-right:0;border-bottom:0}
.wsm-fig::after{top:8px;right:8px;border-left:0;border-bottom:0}

.wsm-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.wsm-tile{position:relative;height:clamp(84px,14vh,138px);border-radius:10px;overflow:hidden;border:1px solid var(--line)}
.wsm-tile .wsm-photo{position:absolute;inset:0}
.wsm-tile:hover img{transform:scale(1.07)}
.wsm-tile img{transition:opacity .7s ease,transform .8s ease}
.wsm-tile span{position:absolute;left:0;right:0;bottom:0;padding:18px 12px 8px;font-size:13px;font-weight:600;background:linear-gradient(0deg,rgba(4,14,18,.9),transparent);z-index:2}

/* stats */
.wsm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:6px}
.wsm-stat{border-left:3px solid var(--flare);padding:4px 0 4px 14px}
.wsm-stat b{display:block;font-family:Fraunces,Georgia,serif;font-size:clamp(28px,4vw,52px);line-height:1.05;font-weight:700;font-variant-numeric:tabular-nums;color:#fff}
.wsm-stat span{display:block;margin-top:4px;font-size:13px;color:var(--mist)}

/* before / after swipe */
.wsm-swipe{position:relative;width:100%;aspect-ratio:4/3;border-radius:12px;overflow:hidden;border:1px solid var(--line);box-shadow:0 14px 40px rgba(0,0,0,.45);user-select:none;touch-action:pan-y}
.wsm-sw-layer{position:absolute;inset:0;width:100%;height:100%}
.wsm-sw-top{overflow:hidden}
.wsm-chip{position:absolute;top:10px;z-index:3;padding:3px 11px;border-radius:999px;font-size:12px;font-weight:600;background:rgba(5,18,23,.8);border:1px solid var(--line)}
.wsm-chip-l{left:10px}
.wsm-chip-r{right:10px;background:var(--flare);color:var(--ink);border-color:transparent}
.wsm-sw-handle{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#fff;z-index:4;box-shadow:0 0 14px rgba(255,255,255,.7);pointer-events:none}
.wsm-sw-handle span{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:50%;background:#fff;color:var(--ink);font-size:13px;font-weight:700;display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.5);letter-spacing:-1px}
.wsm-sw-range{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize;z-index:5}
.wsm-swipe:focus-within{outline:3px solid var(--sea);outline-offset:2px}

/* comparison bars */
.wsm-legend{display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:var(--mist)}
.wsm-legend i{width:14px;height:14px;display:inline-block;border-radius:3px;margin-left:10px}
.wsm-crow{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.wsm-cname{width:96px;flex:none;font-size:clamp(13px,1.5vw,17px);font-weight:600}
.wsm-bars{flex:1;display:flex;flex-direction:column;gap:5px}
.wsm-bars div{min-width:0;padding:5px 10px;border-radius:4px;font-size:13px;font-weight:700;color:var(--ink);white-space:nowrap;transition:width 1.1s cubic-bezier(.2,.7,.2,1)}

/* trend columns */
.wsm-trend{position:relative;height:250px;display:flex;align-items:flex-end;gap:50px;padding:26px 0 0 14px;border-bottom:2px solid var(--mist);max-width:460px;width:100%}
.wsm-col{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}
.wsm-col div{width:100%;background:linear-gradient(180deg,var(--sea),#1d6b7c);border-radius:5px 5px 0 0;transition:height 1.2s cubic-bezier(.2,.7,.2,1)}
.wsm-col:last-of-type div{background:linear-gradient(180deg,var(--flare),#b4561a)}
.wsm-col small{font-weight:700;margin-bottom:4px}
.wsm-col em{position:absolute;bottom:-26px;font-style:normal;color:var(--mist)}
.wsm-unit{position:absolute;top:0;left:14px;font-size:13px;color:var(--mist)}

/* speaker notes drawer (user triggered) */
.wsm-notes{position:absolute;left:0;right:0;bottom:0;z-index:8;padding:16px 28px 18px;background:rgba(4,14,18,.95);border-top:2px solid var(--sea);transform:translateY(102%);transition:transform .35s cubic-bezier(.3,.8,.3,1);max-height:46%;overflow:auto}
.wsm-notes.open{transform:none}
.wsm-notes h5{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--sea)}
.wsm-notes p{margin:0;font-size:clamp(14px,1.5vw,17px);line-height:1.6;color:#d6e6e3;max-width:60em}

/* footer navigation */
.wsm-nav{position:relative;z-index:20;display:flex;align-items:center;gap:14px;padding:10px 18px;background:rgba(5,18,23,.92);border-top:1px solid var(--line)}
.wsm-nav>button{font:inherit;font-size:13px;font-weight:500;cursor:pointer;border-radius:8px;padding:7px 16px;background:var(--sea);color:var(--ink);border:0;transition:filter .15s}
.wsm-nav>button:hover:not(:disabled){filter:brightness(1.12)}
.wsm-nav>button:disabled{opacity:.3;cursor:default}
.wsm-dots{flex:1;display:flex;justify-content:center;gap:7px;flex-wrap:wrap}
.wsm-dots button{width:10px;height:10px;padding:0;border-radius:50%;border:0;background:rgba(233,244,241,.25);cursor:pointer;transition:transform .2s,background .2s}
.wsm-dots button:hover{background:rgba(233,244,241,.55)}
.wsm-dots button.on{background:var(--flare);transform:scale(1.4)}
.wsm-count{font-size:14px;color:var(--mist);font-variant-numeric:tabular-nums}
.wsm-modal button:focus-visible,.wsm-modal input:focus-visible{outline:3px solid var(--sea);outline-offset:2px}

@media (max-width:860px){
  .wsm-title-wrap,.wsm-split,.wsm-two{grid-template-columns:1fr;gap:20px}
  .wsm-orbit{max-width:260px}
  .wsm-fig .wsm-photo{aspect-ratio:16/9}
}
@media (max-width:720px){
  .wsm-steps{grid-template-columns:1fr}
  .wsm-tiles{grid-template-columns:1fr}
  .wsm-slide{padding:3vh 18px 4vh}
  .wsm-count,.wsm-btn span{display:none}
}
@media (prefers-reduced-motion:reduce){
  .wsm-pane,.wsm-scanline,.wsm-step,.wsm-bgimg.ok img{animation:none !important}
  .wsm-scanline{display:none}
  .wsm-bars div,.wsm-col div,.wsm-progress div,.wsm-notes,.wsm-bg{transition:none !important}
}
`;
