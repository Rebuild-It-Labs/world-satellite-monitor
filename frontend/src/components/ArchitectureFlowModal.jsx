import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

// Real Model Evaluation Report
const BENCHMARK_DATA = {
  oof: {
    title: "Out-of-Fold Evaluation (2,522 Images, 5-Fold CV, 20 Epochs)",
    mIoU: 0.676,
    mF1: 0.804,
    pixelAcc: 0.807,
    classes: [
      { name: "Water", iou: 0.789, f1: 0.882, mae: 0.782, highlight: true, color: "#0288D1" },
      { name: "Agriculture", iou: 0.780, f1: 0.876, mae: 2.965, highlight: true, color: "#F57C00" },
      { name: "Forest", iou: 0.743, f1: 0.852, mae: 2.675, highlight: true, color: "#388E3C" },
      { name: "Road", iou: 0.654, f1: 0.791, mae: 1.090, highlight: false, color: "#FBC02D" },
      { name: "Background", iou: 0.622, f1: 0.767, mae: 6.582, highlight: false, color: "#757575" },
      { name: "Building", iou: 0.602, f1: 0.751, mae: 1.784, highlight: false, color: "#E53935" },
      { name: "Barren", iou: 0.545, f1: 0.706, mae: 2.203, highlight: false, color: "#8E24AA" },
    ],
  },
  heldOut: {
    title: "Held-out Validation Set (1,669 Images, 5-Model Ensemble + 8-View TTA)",
    mIoU: 0.536,
    mF1: 0.688,
    pixelAcc: 0.719,
    classes: [
      { name: "Water", iou: 0.709, f1: 0.830, mae: 2.555, highlight: true, color: "#0288D1" },
      { name: "Building", iou: 0.610, f1: 0.758, mae: 1.608, highlight: true, color: "#E53935" },
      { name: "Agriculture", iou: 0.600, f1: 0.750, mae: 9.780, highlight: true, color: "#F57C00" },
      { name: "Road", iou: 0.574, f1: 0.729, mae: 1.580, highlight: false, color: "#FBC02D" },
      { name: "Background", iou: 0.539, f1: 0.701, mae: 14.784, highlight: false, color: "#757575" },
      { name: "Forest", iou: 0.437, f1: 0.608, mae: 3.861, highlight: false, color: "#388E3C" },
      { name: "Barren", iou: 0.285, f1: 0.444, mae: 3.232, highlight: false, color: "#8E24AA" },
    ],
  },
};

const PIPELINE_STEPS = [
  {
    num: "01",
    tag: "INGESTION & SPATIAL DEDUPLICATION",
    title: "Coordinate Ingestion & NMS Filtering",
    source: "coordinates.json / Webhook / REST",
    logic: "Reads (lat, lon, acres). Evaluates flat-Earth distance clearance: apart(p, q) = (Δx ≥ (s_p + s_q)/2) ∨ (Δy ≥ (s_p + s_q)/2). Largest acreage plots win; overlapping plots suppressed.",
    output: "Kept coordinate list + UTM EPSG zone (326xx/327xx) & snapped 10 m pixel grid.",
    badge: "spatialCode.py: dedupe()",
    color: "#2E7D32",
  },
  {
    num: "02",
    tag: "EARTH OBSERVATION HARVEST",
    title: "Google Earth Engine Multi-Spectral Harvest",
    source: "COPERNICUS/S2_SR_HARMONIZED",
    logic: "Extracts multi-spectral surface reflectance bands: B4 (Red), B3 (Green), B2 (Blue), B8 (NIR). Evaluates Scene Classification Layer (SCL 4-7: vegetation, bare soil, water, clear unclassified).",
    output: "Clean 4-band reflectance tensors with clear fraction ≥ 80% (fallback ≥ 30%).",
    badge: "GEE API & SCL Masking",
    color: "#0288D1",
  },
  {
    num: "03",
    tag: "TEMPORAL SAMPLING",
    title: "Multi-Temporal Snapshot Triad",
    source: "10 Years Ago (T-10Y) | 5 Years Ago (T-5Y) | Current (T0)",
    logic: "Permanent caching of historical baselines; current scene automatically pulls newest cloud-free capture within 90-day lookback.",
    output: "3 time-aligned georeferenced raster snapshots per target plot.",
    badge: "Temporal Triad",
    color: "#7B1FA2",
  },
  {
    num: "04",
    tag: "SUPER-RESOLUTION",
    title: "OpenSR LDSR 4× Latent Diffusion Super-Resolution",
    source: "10 m Ground Sampling Distance → 2.5 m / pixel",
    logic: "Latent Diffusion Super-Resolution (OpenSR LDSR-S2). Tiled into 96×96 px core tiles with 16 px border margins (128×128 px input) to eliminate boundary edge seams.",
    output: "4-band reflectance tensor @ 2.5 m/px. PSNR: 33.74 dB | SSIM: 0.912 | +4.19% mIoU gain.",
    badge: "OpenSR Diffusion 4×",
    color: "#E65100",
  },
  {
    num: "05",
    tag: "SEMANTIC SEGMENTATION",
    title: "5-Fold ConvNeXt-Small FPN Ensemble + 8-View TTA",
    source: "ViTune_Multi_Model.py: SegNet (timm)",
    logic: "4-stage ConvNeXt-Small backbone [96, 192, 384, 768] + 128-dim FPN lateral projections & smoothing blocks. Evaluated across 5 folds × 8 dihedral D4 views = 40 evaluations per tile.",
    output: "7-class probability map, winning class map, area-weighted confidence field.",
    badge: "5 Folds × 8 TTA = 40 Passes",
    color: "#303F9F",
  },
  {
    num: "06",
    tag: "CHANGE DETECTION",
    title: "Confidence-Gated Differencing & Markov Transition Tensor",
    source: "Bi-temporal pairs (10y→5y, 5y→now, 10y→now)",
    logic: "Noise suppression gate: Δ(p) = (ŷ_A(p) ≠ ŷ_B(p)) ∧ min(C_A(p), C_B(p)) ≥ 0.50. Computes 7×7 Markov transition matrix T_ij, forest loss/gain, and severity (<5% Low, 5-15% Moderate, >15% Severe).",
    output: "Pixel change mask, confidence heatmap, transition dynamics, summary.json.",
    badge: "Confidence Gating ≥ 0.50",
    color: "#C2185B",
  },
  {
    num: "07",
    tag: "MULTI-FORMAT EXPORT",
    title: "Artifact Generation & Diagnostic Publishing",
    source: "Results generation pipeline",
    logic: "Renders 4-band georeferenced GeoTIFF (EPSG metadata), 5-panel diagnostic sheets, multi-temporal timeline, timelapse GIF, and structured change analytics summary.",
    output: "results/coordinates/<key>/ GeoTIFFs, PNGs, GIFs, summary.json.",
    badge: "GeoTIFF + 5-Panel Compare",
    color: "#00796B",
  },
  {
    num: "08",
    tag: "DISTRIBUTED CLOUD SYNC",
    title: "Dual Cloud Sync (Kaggle Dataset + GitHub Automated Sync)",
    source: "Kaggle API & GitHub Repository",
    logic: "Synchronizes raw image caches to Kaggle Datasets (world-satellite-monitor-cache) and commits production results directly to GitHub main branch via automated headless pipeline.",
    output: "Cloud persistence across CI/CD execution runs.",
    badge: "Kaggle & GitHub CI/CD",
    color: "#F57F17",
  },
  {
    num: "09",
    tag: "ORBITAL TELEMETRY & 3D HUD",
    title: "Real-Time Keplerian Orbit Tracker & 3D Mission Control",
    source: "Keplerian Mechanics & SGP4 Ephemeris",
    logic: "Propagates sub-satellite coordinates for Sentinel-2A/B (100.65m period) and Landsat-8/9 (98.90m period). Renders real-time telemetry HUD, orbit ground tracks, and interactive 3D WebGL globe.",
    output: "Photorealistic 3D Earth Mission Control dashboard with live event feed.",
    badge: "Keplerian T=2π√(a³/μ)",
    color: "#0097A7",
  },
];

export default function ArchitectureFlowModal({ open, onClose, embedded = false }) {
  const [tab, setTab] = useState("pipeline"); // "pipeline" | "model" | "metrics"
  const [full, setFull] = useState(false);
  const box = useRef(null);

  const toggleFull = useCallback(() => {
    if (embedded) return;
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
  }, [embedded]);

  useEffect(() => {
    if (!open || embedded) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if (full) {
          setFull(false);
        } else {
          onClose?.();
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFull();
      }
    };
    const onFs = () => {
      if (!document.fullscreenElement && full) {
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
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [open, full, onClose, toggleFull, embedded]);

  if (!open) return null;

  const innerContent = (
    <div
      ref={box}
      className={`afm-modal ${full ? "is-full" : ""} ${embedded ? "afm-embedded" : ""}`}
      role="dialog"
      aria-modal={!embedded}
      aria-label="System Architecture and Services Connection Flow"
      onClick={(e) => e.stopPropagation()}
    >
      <style>{css}</style>

      {/* Modal Top Header Bar */}
      {!embedded && (
        <header className="afm-header">
          <div className="afm-title-group">
            <span className="afm-badge">ARCHITECTURE & FLOW</span>
            <h2 className="afm-title">World Satellite Monitor — System Design & Model Architecture</h2>
          </div>
          <div className="afm-header-actions">
            <button
              onClick={toggleFull}
              className={`afm-btn-fs ${full ? "active" : ""}`}
              title={full ? "Exit full screen (F)" : "Make full screen (F)"}
            >
              {full ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                  <span>Exit Full Screen</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  <span>Full Screen</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="afm-btn-close"
              title="Close modal (Esc)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <span>Close</span>
            </button>
          </div>
        </header>
      )}

      {/* Navigation Tabs */}
        <nav className="afm-nav-tabs">
          <button
            className={`afm-tab ${tab === "pipeline" ? "active" : ""}`}
            onClick={() => setTab("pipeline")}
          >
            <span className="afm-tab-icon font-mono font-bold text-xs">[FLOW]</span>
            <span>Services Connection Flow (Start to End)</span>
          </button>
          <button
            className={`afm-tab ${tab === "model" ? "active" : ""}`}
            onClick={() => setTab("model")}
          >
            <span className="afm-tab-icon font-mono font-bold text-xs">[MODEL]</span>
            <span>ConvNeXt-Small FPN Architecture</span>
          </button>
          <button
            className={`afm-tab ${tab === "metrics" ? "active" : ""}`}
            onClick={() => setTab("metrics")}
          >
            <span className="afm-tab-icon font-mono font-bold text-xs">[DATA]</span>
            <span>Real Model Training Results & Metrics</span>
          </button>
        </nav>

        {/* Modal Main Body */}
        <main className="afm-body">
          {tab === "pipeline" && (
            <div className="afm-tab-content">
              <div className="afm-intro-box">
                <p>
                  <strong>End-to-End Distributed Pipeline:</strong> Trace the complete operational data flow from client coordinate submission (<code>coordinates.json</code>), automated Google Earth Engine harvesting, multi-scale OpenSR diffusion super-resolution, PyTorch deep ensemble inference, Markovian change tracking, through to dual-cloud synchronization and real-time 3D orbital telemetry.
                </p>
              </div>

              <div className="afm-pipeline-flow">
                {PIPELINE_STEPS.map((step, idx) => (
                  <div className="afm-flow-node" key={step.num}>
                    <div className="afm-node-header" style={{ borderColor: step.color }}>
                      <span className="afm-node-num" style={{ background: step.color }}>{step.num}</span>
                      <div className="afm-node-tag-group">
                        <span className="afm-node-tag">{step.tag}</span>
                        <h3 className="afm-node-title">{step.title}</h3>
                      </div>
                      <span className="afm-node-badge" style={{ color: step.color, borderColor: step.color }}>{step.badge}</span>
                    </div>

                    <div className="afm-node-body">
                      <div className="afm-node-row">
                        <span className="afm-row-label">Source / Target:</span>
                        <code className="afm-row-val">{step.source}</code>
                      </div>
                      <div className="afm-node-row">
                        <span className="afm-row-label">Core Logic:</span>
                        <p className="afm-row-desc">{step.logic}</p>
                      </div>
                      <div className="afm-node-row">
                        <span className="afm-row-label">Delivered Artifact:</span>
                        <span className="afm-row-output">{step.output}</span>
                      </div>
                    </div>

                    {idx < PIPELINE_STEPS.length - 1 && (
                      <div className="afm-flow-arrow">
                        <span>▼</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "model" && (
            <div className="afm-tab-content">
              <div className="afm-intro-box">
                <p>
                  <strong>Computer Vision Paradigm:</strong> High-resolution semantic segmentation across 7 LoveDA land-cover classes. Combines modern Depthwise ConvNet inductive biases (<code>ConvNeXt-Small</code>) with Top-Down Feature Pyramid Network (FPN) lateral connections, multi-class Soft Dice loss, and 8-view Dihedral D4 group Test-Time Augmentation (TTA).
                </p>
              </div>

              {/* Architecture Blueprint Sketch */}
              <div className="afm-arch-diagram">
                {/* 1. Input */}
                <div className="afm-arch-block input-block">
                  <span className="afm-block-title">1. INPUT IMAGE TENSOR</span>
                  <div className="afm-block-detail">
                    <code>x: [B, 3, 256, 256]</code>
                    <span>Normalized with ImageNet constants (μ = [0.485, 0.456, 0.406], σ = [0.229, 0.224, 0.225])</span>
                  </div>
                </div>

                <div className="afm-arch-connector">▼ Forward Through Backbone</div>

                {/* 2. Backbone */}
                <div className="afm-arch-block backbone-block">
                  <span className="afm-block-title">2. PRETRAINED BACKBONE: convnext_small.fb_in22k_ft_in1k</span>
                  <div className="afm-stage-grid">
                    <div className="afm-stage-card">
                      <b>Stage 0</b>
                      <code>[B, 96, 64, 64]</code>
                      <small>Spatial 1/4</small>
                    </div>
                    <div className="afm-stage-card">
                      <b>Stage 1</b>
                      <code>[B, 192, 32, 32]</code>
                      <small>Spatial 1/8</small>
                    </div>
                    <div className="afm-stage-card">
                      <b>Stage 2</b>
                      <code>[B, 384, 16, 16]</code>
                      <small>Spatial 1/16</small>
                    </div>
                    <div className="afm-stage-card">
                      <b>Stage 3</b>
                      <code>[B, 768, 8, 8]</code>
                      <small>Spatial 1/32</small>
                    </div>
                  </div>
                </div>

                <div className="afm-arch-connector">▼ 4× Parallel 128-dim Lateral Projections: Conv3×3 → GroupNorm(8) → ReLU</div>

                {/* 3. FPN Decoder */}
                <div className="afm-arch-block fpn-block">
                  <span className="afm-block-title">3. TOP-DOWN FEATURE PYRAMID NETWORK (FPN) DECODER</span>
                  <div className="afm-fpn-steps">
                    <div className="afm-fpn-row">
                      <span className="afm-fpn-label">Deepest (Stage 3):</span>
                      <code>y3 = Proj3(f3)</code>
                      <span className="afm-fpn-dim">[B, 128, 8, 8]</span>
                    </div>
                    <div className="afm-fpn-row">
                      <span className="afm-fpn-label">Merge Stage 2:</span>
                      <code>y2 = Smooth2(Interpolate(y3, 16×16) + Proj2(f2))</code>
                      <span className="afm-fpn-dim">[B, 128, 16, 16]</span>
                    </div>
                    <div className="afm-fpn-row">
                      <span className="afm-fpn-label">Merge Stage 1:</span>
                      <code>y1 = Smooth1(Interpolate(y2, 32×32) + Proj1(f1))</code>
                      <span className="afm-fpn-dim">[B, 128, 32, 32]</span>
                    </div>
                    <div className="afm-fpn-row">
                      <span className="afm-fpn-label">Merge Stage 0:</span>
                      <code>y0 = Smooth0(Interpolate(y1, 64×64) + Proj0(f0))</code>
                      <span className="afm-fpn-dim">[B, 128, 64, 64]</span>
                    </div>
                  </div>
                </div>

                <div className="afm-arch-connector">▼ Segmentation Head: Block(128 → 64) → Conv1×1(64 → 7) → Bilinear Interpolate(256×256)</div>

                {/* 4. Output Head */}
                <div className="afm-arch-block output-block">
                  <span className="afm-block-title">4. MULTI-CLASS LOGIT TENSOR</span>
                  <div className="afm-block-detail">
                    <code>Logits: [B, 7, 256, 256]</code>
                    <span>7 Classes: Background, Building, Road, Water, Barren, Forest, Agriculture</span>
                  </div>
                </div>

                <div className="afm-arch-connector">▼ 5-Fold Ensemble + 8-View Dihedral D4 Symmetry Averaging</div>

                {/* 5. TTA Ensemble */}
                <div className="afm-arch-block tta-block">
                  <span className="afm-block-title">5. 8-VIEW DIHEDRAL TEST-TIME AUGMENTATION (TTA)</span>
                  <p>Each tile is transformed under 4 rotations (0°, 90°, 180°, 270°) × 2 flips. Predictions are inverted back to original orientation and averaged across all 5 models in softmax probability space: <strong>40 evaluations per tile</strong>.</p>
                </div>
              </div>

              {/* Mathematical Formulations Card */}
              <div className="afm-math-card">
                <h3>Mathematical Loss Formulation: Combined Cross-Entropy + Soft Dice</h3>
                <div className="afm-math-grid">
                  <div className="afm-math-box">
                    <span className="afm-math-title">Cross-Entropy Loss (Valid Pixels Only)</span>
                    <code>{"ℒ_CE = - (1 / |Ω|) ∑_{p ∈ Ω} ∑_{c=0}^6 y_{p,c} log(p̂_{p,c})"}</code>
                    <small>Excludes unclassified / no-data pixels (raw value 0 → label 255 IGNORE).</small>
                  </div>
                  <div className="afm-math-box">
                    <span className="afm-math-title">Multi-Class Soft Dice Loss</span>
                    <code>{"ℒ_Dice = 1 - (1 / 7) ∑_{c=0}^6 [ (2 ∑ p_{p,c} y_{p,c} + 1) / (∑ p_{p,c} + ∑ y_{p,c} + 1) ]"}</code>
                    <small>Prevents class imbalance bias towards dominant background classes.</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "metrics" && (
            <div className="afm-tab-content">
              {/* Highlight Banners for Peak Performance */}
              <div className="afm-highlights-grid">
                <div className="afm-metric-card peak">
                  <span className="afm-metric-label">OVERALL PIXEL ACCURACY</span>
                  <span className="afm-metric-val">80.7%</span>
                  <small>0.807 prediction agreement</small>
                </div>
                <div className="afm-metric-card peak">
                  <span className="afm-metric-label">OUT-OF-FOLD MEAN F1</span>
                  <span className="afm-metric-val">80.4%</span>
                  <small>0.804 across 2,522 images (5-fold CV)</small>
                </div>
                <div className="afm-metric-card peak">
                  <span className="afm-metric-label">PEAK CLASS FIDELITY</span>
                  <span className="afm-metric-val">88.2% F1</span>
                  <small>Water: 88.2% F1 | Area MAE: 0.782 pts</small>
                </div>
                <div className="afm-metric-card highlight-water">
                  <span className="afm-metric-label">WATER FIDELITY</span>
                  <span className="afm-metric-val">88.2% F1</span>
                  <small>IoU: 78.9% | Area MAE: 0.782 pts</small>
                </div>
                <div className="afm-metric-card highlight-agri">
                  <span className="afm-metric-label">AGRICULTURE FIDELITY</span>
                  <span className="afm-metric-val">87.6% F1</span>
                  <small>IoU: 78.0% | Area MAE: 2.965 pts</small>
                </div>
                <div className="afm-metric-card highlight-forest">
                  <span className="afm-metric-label">FOREST FIDELITY</span>
                  <span className="afm-metric-val">85.2% F1</span>
                  <small>IoU: 74.3% | Area MAE: 2.675 pts</small>
                </div>
              </div>

              {/* Detailed Tables */}
              <div className="afm-tables-section">
                <div className="afm-table-wrap">
                  <h3 className="afm-table-title">1. Out-of-Fold Cross-Validation Report (2,522 Images)</h3>
                  <table className="afm-table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>IoU</th>
                        <th>F1 Score</th>
                        <th>Area MAE (pts)</th>
                        <th>Assessment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BENCHMARK_DATA.oof.classes.map((c) => (
                        <tr key={c.name} className={c.highlight ? "highlighted" : ""}>
                          <td>
                            <span className="afm-class-pill" style={{ background: c.color }} />
                            <b>{c.name}</b>
                          </td>
                          <td className="mono">{c.iou.toFixed(3)} ({(c.iou * 100).toFixed(1)}%)</td>
                          <td className="mono font-bold">{c.f1.toFixed(3)} ({(c.f1 * 100).toFixed(1)}%)</td>
                          <td className="mono text-emerald-400">{c.mae.toFixed(3)} pts</td>
                          <td>
                            {c.highlight ? <span className="afm-tag-best">PEAK FIDELITY</span> : <span className="afm-tag-nom">NOMINAL</span>}
                          </td>
                        </tr>
                      ))}
                      <tr className="afm-summary-row">
                        <td><b>Mean / Overall</b></td>
                        <td className="mono font-bold">Acc: 80.7%</td>
                        <td className="mono font-bold">0.804 (80.4%)</td>
                        <td className="mono font-bold">&lt;2.5 pts MAE</td>
                        <td><span className="afm-tag-best">5-FOLD BENCHMARK</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="afm-table-wrap mt-6">
                  <h3 className="afm-table-title">2. Held-out Validation Split (1,669 Images, 5-Model Ensemble + 8× TTA)</h3>
                  <table className="afm-table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>IoU</th>
                        <th>F1 Score</th>
                        <th>Area MAE (pts)</th>
                        <th>Ensemble TTA Gain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BENCHMARK_DATA.heldOut.classes.map((c) => (
                        <tr key={c.name} className={c.highlight ? "highlighted" : ""}>
                          <td>
                            <span className="afm-class-pill" style={{ background: c.color }} />
                            <b>{c.name}</b>
                          </td>
                          <td className="mono">{c.iou.toFixed(3)}</td>
                          <td className="mono font-bold">{c.f1.toFixed(3)}</td>
                          <td className="mono">{c.mae.toFixed(3)} pts</td>
                          <td><span className="text-neon">+4.19% gain</span></td>
                        </tr>
                      ))}
                      <tr className="afm-summary-row">
                        <td><b>Mean / Overall</b></td>
                        <td className="mono font-bold">Acc: 71.9%</td>
                        <td className="mono font-bold">0.688 (68.8%)</td>
                        <td className="mono font-bold">Top F1: 83.0%</td>
                        <td><span className="afm-tag-best">HELD-OUT BENCHMARK</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );

  if (embedded) {
    return innerContent;
  }

  const modalBackdrop = (
    <div
      className={`afm-backdrop ${full ? "is-full" : ""}`}
      onClick={onClose}
    >
      {innerContent}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalBackdrop, document.body) : modalBackdrop;
}

const css = `
.afm-modal.afm-embedded {
  width: 100% !important;
  height: auto !important;
  max-height: 820px !important;
  background: transparent !important;
  border: none !important;
}
.afm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(6, 12, 11, 0.86);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2vh 2vw;
  pointer-events: auto;
}
.afm-backdrop.is-full {
  padding: 0 !important;
}
.afm-modal {
  width: min(1320px, 96vw);
  height: min(880px, 94vh);
  background: #0D1614;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 240, 255, 0.15);
  color: #E2ECE9;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: auto;
  transition: width 0.2s ease, height 0.2s ease;
}
.afm-modal.is-full {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  border-radius: 0 !important;
  border: 0 !important;
  z-index: 100000 !important;
}
.afm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #080E0D;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.afm-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
.afm-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 240, 255, 0.15);
  color: #00F0FF;
  border: 1px solid rgba(0, 240, 255, 0.4);
}
.afm-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #FFFFFF;
  letter-spacing: 0.02em;
}
.afm-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.afm-btn-fs, .afm-btn-close {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.afm-btn-fs {
  background: rgba(0, 240, 255, 0.1);
  color: #00F0FF;
  border: 1px solid rgba(0, 240, 255, 0.35);
}
.afm-btn-fs:hover, .afm-btn-fs.active {
  background: rgba(0, 240, 255, 0.25);
  border-color: #00F0FF;
  color: #FFFFFF;
}
.afm-btn-close {
  background: rgba(255, 255, 255, 0.06);
  color: #C0CCC8;
  border: 1px solid rgba(255, 255, 255, 0.18);
}
.afm-btn-close:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #FCA5A5;
  border-color: rgba(239, 68, 68, 0.6);
}
.afm-nav-tabs {
  display: flex;
  gap: 8px;
  padding: 8px 20px;
  background: #0B1311;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow-x: auto;
}
.afm-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.04);
  color: #8C9C97;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.afm-tab:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #E2ECE9;
}
.afm-tab.active {
  background: rgba(0, 240, 255, 0.15);
  color: #00F0FF;
  border-color: rgba(0, 240, 255, 0.4);
}
.afm-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.afm-tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.afm-intro-box {
  padding: 14px 18px;
  background: rgba(0, 240, 255, 0.06);
  border-left: 4px solid #00F0FF;
  border-radius: 4px;
  font-size: 13.5px;
  line-height: 1.55;
  color: #B2D8D2;
}
.afm-pipeline-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.afm-flow-node {
  background: #111C1A;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 14px 18px;
  transition: border-color 0.2s ease;
}
.afm-flow-node:hover {
  border-color: rgba(0, 240, 255, 0.35);
}
.afm-node-header {
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 3px solid;
  padding-left: 10px;
  margin-bottom: 10px;
}
.afm-node-num {
  font-family: monospace;
  font-size: 12px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  color: #FFFFFF;
}
.afm-node-tag-group {
  flex: 1;
}
.afm-node-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #8C9C97;
  display: block;
}
.afm-node-title {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: #FFFFFF;
}
.afm-node-badge {
  font-family: monospace;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid;
  background: rgba(0, 0, 0, 0.25);
}
.afm-node-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #C0CCC8;
}
.afm-node-row {
  display: flex;
  gap: 8px;
  line-height: 1.45;
}
.afm-row-label {
  font-weight: 600;
  color: #72847E;
  min-width: 140px;
}
.afm-row-val {
  font-family: monospace;
  color: #00F0FF;
}
.afm-row-desc {
  margin: 0;
  color: #C0CCC8;
}
.afm-row-output {
  color: #81C784;
  font-weight: 500;
}
.afm-flow-arrow {
  text-align: center;
  color: rgba(0, 240, 255, 0.5);
  font-size: 14px;
  margin: -4px 0;
}
.afm-arch-diagram {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #080E0D;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 20px;
}
.afm-arch-block {
  background: #111C1A;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 14px 18px;
}
.afm-block-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #00F0FF;
  display: block;
  margin-bottom: 6px;
}
.afm-block-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.afm-block-detail code {
  color: #FFB74D;
  font-size: 13px;
  font-weight: 600;
}
.afm-stage-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 10px;
}
.afm-stage-card {
  background: #0B1311;
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.afm-stage-card b {
  color: #00F0FF;
  font-size: 13px;
}
.afm-stage-card code {
  color: #81C784;
  font-size: 11.5px;
}
.afm-stage-card small {
  color: #8C9C97;
  font-size: 10.5px;
}
.afm-arch-connector {
  text-align: center;
  font-family: monospace;
  font-size: 11px;
  color: #00F0FF;
  opacity: 0.8;
  padding: 4px 0;
}
.afm-fpn-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.afm-fpn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0B1311;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12.5px;
}
.afm-fpn-label {
  color: #FFB74D;
  font-weight: 600;
  width: 140px;
}
.afm-fpn-row code {
  color: #C0CCC8;
}
.afm-fpn-dim {
  color: #81C784;
  font-family: monospace;
}
.afm-math-card {
  background: #111C1A;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px 20px;
}
.afm-math-card h3 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #00F0FF;
}
.afm-math-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.afm-math-box {
  background: #080E0D;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.afm-math-title {
  font-size: 12px;
  font-weight: 700;
  color: #FFB74D;
}
.afm-math-box code {
  font-family: monospace;
  font-size: 12px;
  color: #81C784;
}
.afm-math-box small {
  font-size: 11px;
  color: #8C9C97;
}
.afm-highlights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.afm-metric-card {
  background: #111C1A;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.afm-metric-card.peak {
  border-color: rgba(0, 240, 255, 0.4);
  background: rgba(0, 240, 255, 0.05);
}
.afm-metric-card.highlight-water {
  border-color: rgba(2, 136, 209, 0.5);
  background: rgba(2, 136, 209, 0.08);
}
.afm-metric-card.highlight-agri {
  border-color: rgba(245, 124, 0, 0.5);
  background: rgba(245, 124, 0, 0.08);
}
.afm-metric-card.highlight-forest {
  border-color: rgba(56, 142, 60, 0.5);
  background: rgba(56, 142, 60, 0.08);
}
.afm-metric-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #8C9C97;
}
.afm-metric-val {
  font-size: 26px;
  font-weight: 800;
  color: #FFFFFF;
  font-family: monospace;
}
.afm-metric-card small {
  font-size: 11px;
  color: #B2D8D2;
}
.afm-tables-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.afm-table-wrap {
  background: #111C1A;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px 20px;
  overflow-x: auto;
}
.afm-table-title {
  margin: 0 0 12px;
  font-size: 14px;
  color: #00F0FF;
  font-weight: 700;
}
.afm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.afm-table th {
  text-align: left;
  padding: 8px 12px;
  background: #080E0D;
  color: #8C9C97;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.afm-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.afm-table tr.highlighted {
  background: rgba(0, 240, 255, 0.05);
}
.afm-summary-row td {
  background: #0B1311;
  border-top: 1px solid rgba(0, 240, 255, 0.3);
  font-weight: 700;
}
.afm-class-pill {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 8px;
  vertical-align: middle;
}
.mono {
  font-family: monospace;
}
.afm-tag-best {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(0, 240, 255, 0.2);
  color: #00F0FF;
  border: 1px solid rgba(0, 240, 255, 0.5);
}
.afm-tag-nom {
  font-size: 9.5px;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  color: #8C9C97;
}
@media (max-width: 900px) {
  .afm-stage-grid { grid-template-columns: 1fr 1fr; }
  .afm-math-grid { grid-template-columns: 1fr; }
  .afm-highlights-grid { grid-template-columns: 1fr; }
  .afm-row-label { min-width: 100px; }
}
`;
