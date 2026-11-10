import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HudCard from "./ui/HudCard.jsx";
import AnimatedNumber from "./ui/AnimatedNumber.jsx";
import SignalBars from "./ui/SignalBars.jsx";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry.js";
import { fmtClock, fmtNum } from "../lib/format.js";
import SatelliteSlidesModal from "./SatelliteSlidesModal.jsx";

const TYPE_STYLE = {
  ALERT: "text-alert-red border-alert-red/40 bg-alert-red/10",
  PASS: "text-neon border-neon/40 bg-neon/10",
  MODEL: "text-alert-magenta border-alert-magenta/40 bg-alert-magenta/10",
  INFO: "text-white/60 border-white/20 bg-white/5",
};
const TONE_TEXT = {
  neon: "text-neon text-glow",
  alert: "text-alert-red text-glow-red",
};

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px] font-mono text-[11px]">
      <span className="tracking-[0.18em] text-white/45">{label}</span>
      <span className="text-right text-neon">{children}</span>
    </div>
  );
}

const NAME_TO_ID = {
  "SENTINEL-2A": "sentinel-2a",
  "SENTINEL-2B": "sentinel-2b",
  "LANDSAT-9": "landsat-9",
  "LANDSAT-8": "landsat-8",
  "RESOURCESAT-2A": "landsat-8",
};

/**
 * Left-hand floating telemetry stack: brand + clock, system status, key metrics and a live event feed.
 * On small screens it collapses to a single header bar that expands on tap.
 */
export default function TelemetryOverlay({
  telemetry,
  meta,
  locations,
  selectedId,
  onSelect,
  onSelectSatellite,
  selectedSatelliteId,
  isMobile,
  onOpenSites,
  onOpenMaritime,
  showShips = true,
  onToggleShips,
  showPorts = true,
  onTogglePorts,
  onToggleSatelliteTracker,
  satelliteTrackerOpen,
  lowDataMode,
  onToggleLowData,
  onRecenter,
}) {
  const { now, vals, feed } = useLiveTelemetry(telemetry);
  const [open, setOpen] = useState(false);
  const expanded = !isMobile || open;
  const sys = telemetry.system;
  const nameOf = (id) => locations.find((l) => l.id === id)?.name;
  // ShowSlides
  const [showSlides, setShowSlides] = useState(false);
  const handleCloseSlides = () => setShowSlides(false);

  return (
    <>
      <aside
        className={`pointer-events-none fixed left-3 top-3 z-20 flex w-[min(300px,calc(100vw-1.5rem))] flex-col gap-2.5 ${
          isMobile ? "max-h-[78dvh]" : "bottom-3"
        }`}
      >
      {/* brand */}
      <HudCard
        className="pointer-events-auto animate-fade-up"
        bodyClassName="px-3 py-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-[15px] font-bold leading-none tracking-[0.12em] text-white text-glow">
              WORLD<span className="text-neon"> SATELLITE</span> MONITOR
            </h1>
            <p className="mt-1.5 font-mono text-[9.5px] tracking-[0.2em] text-white/45">
              GLOBAL AI EARTH OBSERVATION
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[13px] tabular-nums text-neon">
              {fmtClock(now)}
            </div>
            <div className="font-mono text-[9px] tracking-[0.25em] text-white/40">
              UTC
            </div>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-2 flex w-full items-center justify-between rounded border border-neon/25 bg-neon/5 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-neon"
          >
            <span>CONTROLS & TELEMETRY</span>
            <span>{open ? "▾" : "▸"}</span>
          </button>
        )}
        {meta.dataStatus === "SYNTHETIC_DEMO" ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-alert-amber/40 bg-alert-amber/10 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-alert-amber">
            <span className="h-1.5 w-1.5 rounded-full bg-alert-amber" />{" "}
            SIMULATED DEMO DATA
          </div>
        ) : (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-neon/40 bg-neon/10 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-neon">
            <span className="h-1.5 w-1.5 rounded-full bg-neon animate-blink" />{" "}
            LIVE GEE / REBUILD-IT DATA
          </div>
        )}
      </HudCard>

      {expanded && (
        <div className="scroll-thin pointer-events-none flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
          {/* OPERATIONS & CONTROLS HUD CARD */}
          <HudCard
            title="OPERATIONS & CONTROLS"
            className="pointer-events-auto animate-fade-up"
          >
            {/* View Launchers */}
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <button
                onClick={onOpenSites}
                className="flex items-center justify-center gap-1.5 rounded border border-cyan-400/50 bg-cyan-500/20 py-1.5 font-bold text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
              >
                <span>🛰️</span>
                <span>SITES</span>
              </button>
              <button
                onClick={onOpenMaritime}
                className="flex items-center justify-center gap-1.5 rounded border border-sky-400/50 bg-sky-500/20 py-1.5 font-bold text-sky-300 hover:bg-sky-500/30 transition-all shadow-[0_0_10px_rgba(14,165,233,0.2)]"
              >
                <span>🚢</span>
                <span>MARITIME</span>
              </button>
            </div>

            {/* Quick Layer Toggles */}
            <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[9.5px]">
              {onToggleShips && (
                <button
                  onClick={onToggleShips}
                  className={`flex items-center justify-center gap-1 rounded border py-1 transition-all ${
                    showShips
                      ? "border-sky-400 bg-sky-500/20 text-sky-200 font-semibold"
                      : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  <span>🚢 SHIPS:</span>
                  <span>{showShips ? "ON" : "OFF"}</span>
                </button>
              )}

              {onTogglePorts && (
                <button
                  onClick={onTogglePorts}
                  className={`flex items-center justify-center gap-1 rounded border py-1 transition-all ${
                    showPorts
                      ? "border-amber-400 bg-amber-500/20 text-amber-200 font-semibold"
                      : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  <span>⚓ PORTS:</span>
                  <span>{showPorts ? "ON" : "OFF"}</span>
                </button>
              )}

              {onToggleSatelliteTracker && (
                <button
                  onClick={onToggleSatelliteTracker}
                  className={`flex items-center justify-center gap-1 rounded border py-1 transition-all ${
                    satelliteTrackerOpen
                      ? "border-neon bg-neon/20 text-neon font-semibold shadow-neon"
                      : "border-white/15 bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  <span>🛰️ SATS</span>
                </button>
              )}

              {onToggleLowData && (
                <button
                  onClick={onToggleLowData}
                  className={`flex items-center justify-center gap-1 rounded border py-1 transition-all ${
                    lowDataMode
                      ? "border-emerald-400 bg-emerald-500/30 text-emerald-300 font-bold"
                      : "border-white/15 bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  <span>{lowDataMode ? "⚡ LOW DATA" : "⚡ HD RES"}</span>
                </button>
              )}
            </div>

            {/* Recenter Button */}
            {onRecenter && (
              <button
                onClick={onRecenter}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-neon/40 bg-neon/10 py-1 font-mono text-[10px] tracking-widest text-neon hover:bg-neon/20 transition-all focus-visible:outline-neon"
              >
                <span>🎯 RECENTER GLOBE</span>
              </button>
            )}

            {/* Show Slides Button */}
            <button
              onClick={() => setShowSlides(true)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-amber-400/50 bg-amber-500/15 py-1.5 font-mono text-[10px] font-bold tracking-widest text-amber-300 hover:bg-amber-500/25 transition-all shadow-[0_0_8px_rgba(245,158,11,0.2)] focus-visible:outline-amber-400"
              title="Open World Satellite Monitor presentation slides"
            >
              <span>📽️ VIEW PRESENTATION</span>
            </button>

            {/* Legend */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 border-t border-white/10 pt-2 font-mono text-[9px] tracking-wider text-white/60">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3.5 rounded-sm bg-gradient-to-r from-[#0b3a1a] to-neon" />{" "}
                VEG
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3.5 rounded-sm bg-gradient-to-r from-alert-magenta to-alert-red" />{" "}
                SHIFT
              </span>
              <span className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping-ring rounded-full bg-neon" />
                  <span className="h-2 w-2 rounded-full bg-neon" />
                </span>
                SITE
              </span>
            </div>
          </HudCard>
          {/* system status */}
          <HudCard
            title="SYSTEM STATUS"
            className="pointer-events-auto animate-fade-up [animation-delay:80ms]"
            right={
              <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-neon">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-neon" />{" "}
                {sys.uplink}
                <SignalBars />
              </span>
            }
          >
            <Row label="LATENCY">{vals.latency} ms</Row>
            <Row label="INGEST">{vals.ingest} MB/s</Row>
            <Row label="GPU LOAD">
              <span className="inline-flex items-center gap-2">
                <span className="relative h-1 w-14 overflow-hidden rounded bg-white/10">
                  <span
                    className="absolute inset-y-0 left-0 bg-neon transition-all duration-700"
                    style={{ width: `${vals.gpu}%` }}
                  />
                </span>
                {vals.gpu}%
              </span>
            </Row>
            <Row label="MODEL">{sys.modelVersion}</Row>
            <Row label="LAST COMPOSITE">
              {sys.lastCompositeUtc.slice(5, 16).replace("T", " ")}Z
            </Row>

            {/* Constellation Live Status Buttons */}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {sys.constellation.map((s) => {
                const satId = NAME_TO_ID[s.name] || "sentinel-2a";
                const isSelected = selectedSatelliteId === satId;
                return (
                  <button
                    key={s.name}
                    onClick={() => onSelectSatellite?.(satId)}
                    title={`Click to track ${s.name}`}
                    className={`rounded border text-left px-1.5 py-1 font-mono text-[9px] leading-tight transition-all ${
                      isSelected
                        ? "border-neon bg-neon/20 shadow-neon"
                        : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between text-white/80">
                      <span className={isSelected ? "text-neon font-bold" : ""}>
                        {s.name}
                      </span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${s.status === "NOMINAL" ? "bg-neon animate-blink" : "bg-alert-amber"}`}
                      />
                    </div>
                    <div className="text-white/40 flex justify-between mt-0.5">
                      <span>T-{s.nextPassMin}m</span>
                      <span className="text-neon/70">TRACK ↗</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </HudCard>

          {/* key metrics */}
          <HudCard
            title="KEY METRICS"
            className="pointer-events-auto animate-fade-up [animation-delay:160ms]"
          >
            <div className="grid grid-cols-2 gap-2">
              {telemetry.metrics.map((m) => (
                <div
                  key={m.id}
                  className="rounded border border-white/10 bg-black/40 p-2 font-mono"
                >
                  <div className="text-[9px] tracking-wider text-white/45">
                    {m.label}
                  </div>
                  <div
                    className={`mt-0.5 font-display text-[17px] font-bold ${TONE_TEXT[m.tone]}`}
                  >
                    <AnimatedNumber
                      value={m.value}
                      decimals={m.id === "confidence" ? 1 : 0}
                    />
                    {m.unit && (
                      <span className="ml-1 text-[11px] font-normal text-white/60">
                        {m.unit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </HudCard>

          {/* live alert / model inference feed */}
          <HudCard
            title="LIVE SATELLITE & MODEL FEED"
            className="pointer-events-auto animate-fade-up [animation-delay:240ms]"
          >
            <ul
              className="space-y-1.5 font-mono text-[10px]"
              aria-live="polite"
            >
              {feed.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 rounded border px-1 py-0.5 text-[8.5px] font-bold tracking-wider ${TYPE_STYLE[item.type]}`}
                  >
                    {item.type}
                  </span>
                  <div className="min-w-0 flex-1 leading-snug">
                    <span className="text-white/80">{item.text}</span>
                    {item.locationId && (
                      <button
                        onClick={() => onSelect(item.locationId)}
                        className={`ml-1 text-neon underline decoration-neon/40 hover:decoration-neon ${
                          selectedId === item.locationId ? "text-white" : ""
                        }`}
                      >
                        [{nameOf(item.locationId) || item.locationId}]
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </HudCard>
        </div>
      )}
      </aside>

      {/* Main presentation modal rendered at the screen root level */}
      <SatelliteSlidesModal
        open={showSlides}
        onClose={handleCloseSlides}
      />
    </>
  );
}
