import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

/* ---------- small building blocks ---------- */
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
        <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.hl ? "hl" : ""}>
            {r.c.map((c, j) => <td key={j}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Steps = ({ items }) => (
  <div className="wsm-steps">
    {items.map(([t, d], i) => (
      <div className="wsm-step" key={i}>
        <b>{t}</b>
        <span>{d}</span>
      </div>
    ))}
  </div>
);

const Compare = ({ rows, a, b }) => (
  <div className="wsm-compare">
    <div className="wsm-legend">
      <i style={{ background: "var(--sand3)" }} /> {a}
      <i style={{ background: "var(--amber)" }} /> {b}
    </div>
    {rows.map(([name, x, y]) => (
      <div className="wsm-crow" key={name}>
        <span className="wsm-cname">{name}</span>
        <div className="wsm-bars">
          <div style={{ width: `${x * 2}%`, background: "var(--sand3)" }}>{x}%</div>
          <div style={{ width: `${y * 2}%`, background: "var(--amber)" }}>{y}%</div>
        </div>
      </div>
    ))}
  </div>
);

const Trend = ({ pts, max, unit }) => (
  <div className="wsm-trend">
    {pts.map(([yr, v]) => (
      <div key={yr} className="wsm-col">
        <small>{v}</small>
        <div style={{ height: `${(v / max) * 100}%` }} />
        <em>{yr}</em>
      </div>
    ))}
    <span className="wsm-unit">{unit}</span>
  </div>
);

/* ---------- slide content ---------- */
const slides = [
  {
    kind: "title",
    title: "World Satellite Monitor",
    body: "AI-integrated global Earth observation and multi-class land-cover monitoring with deep super-resolution and orbital telemetry",
    foot: "Sentinel-2 · OpenSR LDSR · ConvNeXt-FPN ensemble · Keplerian telemetry",
  },
  {
    title: "Why monitoring needs to change",
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
  },
  {
    title: "Related work",
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
  },
  {
    title: "Six-stage pipeline",
    render: () => (
      <Steps
        items={[
          ["Coordinate ingestion", "Non-maximum spatial suppression, UTM zone"],
          ["Cloud-filtered harvest", "Google Earth Engine, Sentinel-2 SR, SCL mask"],
          ["4× LDSR", "Tiled OpenSR, 10 m → 2.5 m"],
          ["Segmentation", "5-fold ConvNeXt-Small FPN + 8-view TTA"],
          ["Change analysis", "Confidence-gated differencing, transition matrix"],
          ["Publishing", "GeoTIFF export, summary.json, 3D telemetry HUD"],
        ]}
      />
    ),
  },
  {
    title: "Algorithm in eight phases",
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
  },
  {
    title: "Study sites and data",
    render: () => (
      <>
        <Table
          head={["Site", "Location", "Area", "Setting"]}
          rows={[
            { c: ["Nusantara", "−0.973 N, 116.709 E", "500 acres", "Rainforest and mangrove, capital construction"] },
            { c: ["Phagwara", "31.253 N, 75.704 E", "200 acres", "Wheat-rice plain, peri-urban growth"] },
            { c: ["Hasdeo Arand", "22.620 N, 82.550 E", "10,000 acres", "Sal forest under mining pressure"] },
          ]}
        />
        <p className="wsm-note">
          Training: LoveDA, 5,987 aerial images (1024², 0.3 m), 7 classes: Background, Building, Road, Water, Barren, Forest, Agriculture.
        </p>
      </>
    ),
  },
  {
    title: "Models",
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
  },
  {
    title: "Segmentation accuracy (LoveDA)",
    render: () => (
      <>
        <Table
          head={["Class", "Precision", "Recall", "F1", "IoU"]}
          rows={[
            { c: ["Background", 94.2, 93.5, 93.8, 88.4] },
            { c: ["Building", 94.6, 92.3, 93.5, 87.7] },
            { c: ["Road", 92.8, 91.4, 92.1, 85.4] },
            { c: ["Water", 98.6, 97.8, 98.2, 96.5] },
            { c: ["Barren", 91.5, 89.1, 90.3, 82.3] },
            { c: ["Forest", 95.1, 94.3, 94.7, 89.9] },
            { c: ["Agriculture", 93.9, 93.1, 93.5, 87.8] },
            { hl: true, c: ["Mean", 94.4, 93.1, 93.7, 88.3] },
          ]}
        />
        <p className="wsm-note">Pixel accuracy 93.85% · mIoU 88.28% · mean F1 93.73%</p>
      </>
    ),
  },
  {
    title: "Super-resolution quality",
    render: () => (
      <>
        <Table
          head={["Method", "PSNR (dB)", "SSIM", "SAM (°)", "mIoU gain"]}
          rows={[
            { c: ["Bicubic 4×", 26.42, 0.781, 6.82, "+0.00%"] },
            { c: ["SRCNN", 28.15, 0.803, 5.94, "+0.92%"] },
            { c: ["ESRGAN", 29.18, 0.824, 5.41, "+1.84%"] },
            { hl: true, c: ["OpenSR LDSR (proposed)", 33.74, 0.912, 2.38, "+4.19%"] },
          ]}
        />
        <p className="wsm-note">Diffusion restores real structure with low spectral distortion rather than hallucinating artefacts.</p>
      </>
    ),
  },
  {
    title: "Nusantara: 45.91% change (Severe), 2021 → 2026",
    render: () => (
      <>
        <Compare
          a="2021"
          b="2026"
          rows={[
            ["Water", 41.88, 14.78],
            ["Barren", 3.9, 16.15],
            ["Road", 0.1, 3.29],
          ]}
        />
        <p className="wsm-note">Water → Background 21.54% · Water → Barren 7.04%: canalisation, reclamation and soil levelling.</p>
      </>
    ),
  },
  {
    title: "Phagwara: 20.80% change (Severe), 2016 → 2026",
    render: () => (
      <>
        <Compare
          a="2016"
          b="2026"
          rows={[["Agriculture", 10.15, 0.83]]}
        />
        <Bullets
          items={[
            "Barren → Background 10.65%, Agriculture → Background 7.34%",
            "Building expansion 1.60%: farmland converting to industrial and residential use",
          ]}
        />
      </>
    ),
  },
  {
    title: "Hasdeo Arand: forest down 25.24% since 1990",
    render: () => (
      <>
        <Trend unit="Dense forest, kHa" max={170} pts={[[1990, 170], [2026, 127.09]]} />
        <p className="wsm-note">Mining, washeries and transport corridors grew from 4.10 kHa to 31.42 kHa, tracking clearance leases.</p>
      </>
    ),
  },
  {
    title: "Confidence and efficiency",
    render: () => (
      <Bullets
        items={[
          "TTA narrows confidence spread from ±8.7% to ±3.1% (median 91.4%)",
          "42.6 ms per 128×128 super-resolved tile on the Pareto frontier",
          "Transformer backbones cost about 3× the latency for no gain",
          "Live 3D globe shows Sentinel-2 and Landsat positions in real time (S2 period 100.65 min)",
        ]}
      />
    ),
  },
  {
    title: "Conclusion and next steps",
    render: () => (
      <div className="wsm-two">
        <div>
          <h4>Delivered</h4>
          <Bullets
            items={[
              "Autonomous pipeline from harvest to publishing",
              "10 m → 2.5 m with 88.28% mIoU on 7 classes",
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
  },
];

/* ---------- modal ---------- */
export default function SatelliteSlidesModal({ open, onClose }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const box = useRef(null);
  const last = slides.length - 1;

  const go = useCallback((d) => {
    setI((v) => Math.min(last, Math.max(0, v + d)));
  }, [last]);

  // Stable refs for callbacks and dynamic state so event listeners don't re-trigger slide resets
  const goRef = useRef(go);
  goRef.current = go;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const fullRef = useRef(full);
  fullRef.current = full;

  // Toggle fullscreen (both CSS full-screen expansion and native browser fullscreen)
  const toggleFull = useCallback(() => {
    setFull((prev) => {
      const next = !prev;
      if (next) {
        if (box.current?.requestFullscreen && !document.fullscreenElement) {
          box.current.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  // ONLY reset slide index to 0 when the modal opens initially
  useEffect(() => {
    if (open) {
      setI(0);
    }
  }, [open]);

  // Keyboard navigation & body scroll lock (stable: only attaches on open/close)
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goRef.current(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goRef.current(-1);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFull();
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if (fullRef.current) {
          setFull(false);
        } else {
          onCloseRef.current?.();
        }
      }
    };

    const onFs = () => {
      if (!document.fullscreenElement && fullRef.current) {
        setFull(false);
      }
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      document.body.style.overflow = prev;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [open, toggleFull]);

  if (!open) return null;
  const s = slides[i];

  const modalNode = (
    <div
      className={"wsm-backdrop" + (full ? " is-full" : "")}
      onClick={onClose}
    >
      <div
        ref={box}
        className={"wsm-modal" + (full ? " is-full" : "")}
        role="dialog"
        aria-modal="true"
        aria-label="World Satellite Monitor presentation"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{css}</style>
        <header className="wsm-bar">
          <div className="wsm-bar-title">
            <span className="wsm-badge">PRESENTATION</span>
            <span>World Satellite Monitor</span>
          </div>
          <div className="wsm-bar-actions">
            <button
              onClick={toggleFull}
              className={`wsm-btn-fs ${full ? "active" : ""}`}
              aria-label="Toggle full screen"
              title={full ? "Exit full screen (F)" : "Make modal full screen (F)"}
            >
              {full ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                  <span>Exit Full Screen</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  <span>Full Screen</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="wsm-btn-close"
              aria-label="Close presentation"
              title="Close modal (Esc)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <span>Close</span>
            </button>
          </div>
        </header>

        <main className="wsm-stage">
          <section key={i} className={"wsm-slide" + (s.kind === "title" ? " is-title" : "")}>
            <h2>{s.title}</h2>
            {s.kind === "title" ? (
              <>
                <p className="wsm-lead">{s.body}</p>
                <p className="wsm-foot">{s.foot}</p>
              </>
            ) : (
              s.render()
            )}
          </section>
        </main>

        <footer className="wsm-nav">
          <button onClick={() => go(-1)} disabled={i === 0}>Previous</button>
          <div className="wsm-dots">
            {slides.map((_, k) => (
              <button
                key={k}
                className={k === i ? "on" : ""}
                onClick={() => setI(k)}
                aria-label={`Go to slide ${k + 1}`}
              />
            ))}
          </div>
          <span className="wsm-count">{i + 1} / {slides.length}</span>
          <button onClick={() => go(1)} disabled={i === last}>Next</button>
        </footer>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}

/* ---------- styles (scoped by wsm- prefix) ---------- */
const css = `
.wsm-modal{--ink:#0f1c19;--moss:#1f4a3f;--sand:#f3efe2;--sand3:#b9b29b;--amber:#d9962b;--water:#2f7fa6;
  --text:#16231f;--muted:#5a665f;
  font-family:Georgia,"Iowan Old Style","Times New Roman",serif;color:var(--text)}
.wsm-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(8,16,14,.84);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:2vh 2vw;pointer-events:auto}
.wsm-backdrop.is-full{padding:0 !important}
.wsm-modal{width:min(1200px,96vw);height:min(820px,94vh);background:var(--sand);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 70px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.08);pointer-events:auto;transition:width .2s ease, height .2s ease, border-radius .2s ease}
.wsm-modal.is-full{position:fixed !important;inset:0 !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;max-width:100vw !important;max-height:100vh !important;border-radius:0 !important;box-shadow:none !important;z-index:100000 !important}
.wsm-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 18px;background:var(--ink);color:var(--sand);font-size:15px;border-bottom:1px solid rgba(255,255,255,.08)}
.wsm-bar-title{display:flex;align-items:center;gap:10px;font-weight:600;letter-spacing:.02em}
.wsm-badge{font-family:system-ui,-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;background:var(--amber);color:var(--ink);padding:2px 8px;border-radius:4px}
.wsm-bar-actions{display:flex;align-items:center;gap:10px}
.wsm-bar button,.wsm-nav button:not(.wsm-dots button){font:inherit;font-size:13px;cursor:pointer;border-radius:6px;padding:6px 14px}
.wsm-btn-fs,.wsm-btn-close{display:inline-flex;align-items:center;gap:6px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:600;cursor:pointer;border-radius:6px;padding:6px 14px;transition:all .15s ease}
.wsm-btn-fs{background:rgba(217,150,43,.18);color:#f5b85a;border:1px solid rgba(217,150,43,.45)}
.wsm-btn-fs:hover,.wsm-btn-fs.active{background:rgba(217,150,43,.32);border-color:rgba(217,150,43,.8);color:#fff}
.wsm-btn-close{background:rgba(255,255,255,.08);color:var(--sand);border:1px solid rgba(243,239,226,.3)}
.wsm-btn-close:hover{background:rgba(239,68,68,.25);border-color:rgba(239,68,68,.6);color:#fca5a5}
.wsm-stage{flex:1;overflow:auto;display:flex}
.wsm-slide{margin:auto;width:100%;max-width:980px;padding:4vh 40px;animation:wsm-in .25s ease-out}
@keyframes wsm-in{from{opacity:0}to{opacity:1}}
.wsm-slide h2{font-size:clamp(24px,3.4vw,40px);line-height:1.15;margin:0 0 26px;color:var(--moss);font-weight:700;letter-spacing:-.01em}
.wsm-slide.is-title h2{font-size:clamp(36px,6vw,72px);color:var(--ink)}
.wsm-lead{font-size:clamp(18px,2.2vw,26px);line-height:1.45;max-width:760px;margin:0 0 28px}
.wsm-foot{color:var(--muted);font-size:16px;border-top:3px solid var(--amber);padding-top:14px;display:inline-block}
.wsm-list{margin:0;padding-left:1.2em;font-size:clamp(16px,1.9vw,22px);line-height:1.5;max-width:860px}
.wsm-list li{margin-bottom:.55em}
.wsm-list li::marker{color:var(--amber)}
.wsm-note{margin-top:20px;font-size:clamp(15px,1.7vw,19px);color:var(--muted);max-width:820px;line-height:1.5}
.wsm-scroll{overflow-x:auto}
.wsm-table{border-collapse:collapse;width:100%;font-family:system-ui,sans-serif;font-size:clamp(13px,1.5vw,17px)}
.wsm-table th{text-align:left;background:var(--moss);color:var(--sand);padding:9px 12px;font-weight:600}
.wsm-table td{padding:8px 12px;border-bottom:1px solid rgba(22,35,31,.14)}
.wsm-table tr.hl td{background:rgba(217,150,43,.22);font-weight:700}
.wsm-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.wsm-step{border-left:4px solid var(--amber);background:#fff9;padding:12px 16px;display:flex;flex-direction:column;gap:6px}
.wsm-step b{font-size:clamp(16px,1.8vw,21px);color:var(--moss)}
.wsm-step span{font-family:system-ui,sans-serif;font-size:clamp(13px,1.4vw,16px);color:var(--muted);line-height:1.4}
.wsm-two{display:grid;grid-template-columns:1fr 1fr;gap:36px}
.wsm-two h4{margin:0 0 12px;font-size:clamp(18px,2vw,24px);color:var(--water)}
.wsm-two .wsm-list{font-size:clamp(15px,1.7vw,20px)}
.wsm-compare{font-family:system-ui,sans-serif}
.wsm-legend{display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:15px;color:var(--muted)}
.wsm-legend i{width:14px;height:14px;display:inline-block;border-radius:3px;margin-left:10px}
.wsm-crow{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.wsm-cname{width:110px;font-size:clamp(14px,1.6vw,18px);font-weight:600}
.wsm-bars{flex:1;display:flex;flex-direction:column;gap:5px}
.wsm-bars div{min-width:56px;padding:5px 10px;border-radius:3px;font-size:14px;font-weight:700;color:var(--ink);transition:width .4s}
.wsm-trend{position:relative;height:260px;display:flex;align-items:flex-end;gap:60px;padding:24px 0 0 20px;border-bottom:2px solid var(--ink);max-width:520px}
.wsm-col{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;font-family:system-ui,sans-serif;position:relative}
.wsm-col div{width:100%;background:var(--moss);border-radius:4px 4px 0 0}
.wsm-col small{font-weight:700;margin-bottom:4px}
.wsm-col em{position:absolute;bottom:-26px;font-style:normal;color:var(--muted)}
.wsm-unit{position:absolute;top:0;left:20px;font-family:system-ui,sans-serif;font-size:13px;color:var(--muted)}
.wsm-nav{display:flex;align-items:center;gap:14px;padding:10px 18px;background:#e6e0cc}
.wsm-nav>button{background:var(--moss);color:var(--sand);border:0}
.wsm-nav>button:disabled{opacity:.35;cursor:default}
.wsm-dots{flex:1;display:flex;justify-content:center;gap:7px;flex-wrap:wrap}
.wsm-dots button{width:10px;height:10px;padding:0;border-radius:50%;border:0;background:var(--sand3);cursor:pointer}
.wsm-dots button.on{background:var(--amber);transform:scale(1.35)}
.wsm-count{font-family:system-ui,sans-serif;font-size:14px;color:var(--muted)}
.wsm-modal button:focus-visible{outline:3px solid var(--water);outline-offset:2px}
@media (max-width:720px){.wsm-steps{grid-template-columns:1fr}.wsm-two{grid-template-columns:1fr;gap:18px}.wsm-slide{padding:3vh 18px}.wsm-count{display:none}}
@media (prefers-reduced-motion:reduce){.wsm-slide{animation:none}.wsm-bars div{transition:none}}
`;
