import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HudCard from "./ui/HudCard.jsx";
import AnimatedNumber from "./ui/AnimatedNumber.jsx";
import SignalBars from "./ui/SignalBars.jsx";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry.js";
import { fmtClock, fmtNum } from "../lib/format.js";
import { useTheme } from "../context/ThemeContext.jsx";
import {
  getThemeAssetUrl,
  getRandomThemeQuote,
} from "../themes/themes.config.js";

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
  onOpenDocs,
}) {
  const { currentTheme } = useTheme();
  const { now, vals, feed } = useLiveTelemetry(telemetry);
  const [open, setOpen] = useState(false);
  const [hudQuote, setHudQuote] = useState(() =>
    getRandomThemeQuote(currentTheme),
  );
  const expanded = !isMobile || open;
  const sys = telemetry.system;
  const nameOf = (id) => locations.find((l) => l.id === id)?.name;
  const stickerUrl = getThemeAssetUrl(currentTheme.folder, "sticker.png");

  const shuffleQuote = useCallback(() => {
    if (!currentTheme.quotes?.banners?.length) return;
    setHudQuote((prev) => {
      const list = currentTheme.quotes.banners;
      if (list.length <= 1) return list[0];
      let next;
      do {
        next = list[Math.floor(Math.random() * list.length)];
      } while (next === prev);
      return next;
    });
  }, [currentTheme]);

  // Set random quote whenever theme changes
  useEffect(() => {
    setHudQuote(getRandomThemeQuote(currentTheme));
  }, [currentTheme.id]);

  // Periodically cycle to another random quote from the theme's pool every 15 seconds
  useEffect(() => {
    if (!currentTheme.quotes?.banners?.length) return;
    const interval = setInterval(() => {
      shuffleQuote();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentTheme.id, shuffleQuote]);

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
            <div className="flex items-center gap-2">
              {/* Theme Circular Mascot Sticker / Avatar */}
              <div className="relative h-9 w-9 rounded-full overflow-hidden shrink-0 border border-[var(--primary)]/60 bg-black/60 shadow-[0_0_10px_var(--glow)] flex items-center justify-center p-0.5">
                <img
                  src={stickerUrl}
                  alt={currentTheme.label}
                  className="h-full w-full rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = getThemeAssetUrl(
                      currentTheme.folder,
                      "emblem.svg",
                    );
                  }}
                />
              </div>
              <div>
                <h1 className="font-display text-[14.5px] font-bold leading-none tracking-[0.12em] text-white text-glow">
                  WORLD
                  <span style={{ color: currentTheme.palette.primary }}>
                    {" "}
                    SATELLITE
                  </span>{" "}
                  MONITOR
                </h1>
                <p className="mt-1 font-mono text-[9px] tracking-[0.18em] text-white/50">
                  GLOBAL AI OBSERVATION
                </p>
              </div>
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
              <span className="font-mono text-[10px] text-white/50">
                {open ? "[-]" : "[+]"}
              </span>
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

          {/* Dynamic Theme Quote / Lore Line (Theme-only, changes randomly from pool, hidden on default Mission Control) */}
          {hudQuote && (
            <div
              onClick={shuffleQuote}
              className="mt-2.5 cursor-pointer select-none rounded-md border border-[var(--primary)]/35 bg-[var(--surface-alt)] p-2 backdrop-blur-md shadow-[0_0_12px_var(--glow)] transition-all hover:border-[var(--primary)]/60 active:scale-[0.99]"
              title="Click to shuffle real dialogue quote ↺"
            >
              <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-[var(--primary)]">
                <span className="flex items-center gap-1">
                  <span>{currentTheme.icon}</span>
                  <span>{currentTheme.label.toUpperCase()} TRANSMISSION</span>
                </span>
                <span className="flex items-center gap-1 opacity-70 text-[8px] hover:opacity-100">
                  <span>↺</span>
                  <span>SHUFFLE</span>
                </span>
              </div>
              <p className="mt-1 text-[10.5px] italic leading-tight text-white/95 font-display">
                &ldquo;{hudQuote}&rdquo;
              </p>
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
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>SITES</span>
                </button>
                <button
                  onClick={onOpenMaritime}
                  className="flex items-center justify-center gap-1.5 rounded border border-sky-400/50 bg-sky-500/20 py-1.5 font-bold text-sky-300 hover:bg-sky-500/30 transition-all shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
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
                    <span>SHIPS:</span>
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
                    <span>PORTS:</span>
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
                    <span>SATS TRACKER</span>
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
                  <span>RECENTER GLOBE</span>
                </button>
              )}

              {/* Dedicated Documentation & Architecture Hub Page Button */}
              <button
                onClick={onOpenDocs}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--primary)] bg-[var(--primary)]/15 py-2 font-display text-[11px] font-bold tracking-wider text-[var(--text)] hover:bg-[var(--primary)]/25 transition-all shadow-[0_0_12px_var(--border)] focus-visible:outline-[var(--primary)]"
                title="Open Fullscreen Documentation, Architecture Sketchbook, Pipeline Flow & Presentation Hub"
              >
                <svg
                  className="h-3.5 w-3.5 text-[var(--primary)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span>DOCS & SYSTEM HUB</span>
                <span className="rounded bg-[var(--primary)]/25 px-1 font-mono text-[8.5px] text-[var(--primary)]">
                  HUB
                </span>
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
                        <span
                          className={isSelected ? "text-neon font-bold" : ""}
                        >
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
              title="LIVE SATELLITE and MODEL FEED"
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
    </>
  );
}
