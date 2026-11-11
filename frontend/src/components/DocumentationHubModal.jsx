import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import { getRandomThemeQuote } from "../themes/themes.config.js";

// Offloaded on-demand to keep documentation hub feather-light
const ArchitectureSketchbook = lazy(() => import("./ArchitectureSketchbook.jsx"));
const ArchitectureFlowModal = lazy(() => import("./ArchitectureFlowModal.jsx"));
const SatelliteSlidesModal = lazy(() => import("./SatelliteSlidesModal.jsx"));

export default function DocumentationHubModal({ open, onClose, initialTab = "sketchbook" }) {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showSlidesModal, setShowSlidesModal] = useState(false);
  const [hubQuote, setHubQuote] = useState(() => getRandomThemeQuote(currentTheme));

  const shuffleHubQuote = useCallback(() => {
    if (!currentTheme.quotes?.banners?.length) return;
    setHubQuote((prev) => {
      const list = currentTheme.quotes.banners;
      if (list.length <= 1) return list[0];
      let next;
      do {
        next = list[Math.floor(Math.random() * list.length)];
      } while (next === prev);
      return next;
    });
  }, [currentTheme]);

  useEffect(() => {
    if (open) {
      setHubQuote(getRandomThemeQuote(currentTheme));
    }
  }, [open, currentTheme.id]);

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open && !showSlidesModal) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, showSlidesModal]);

  if (!open) return null;

  const tabs = [
    { id: "sketchbook", label: "Architecture Sketchbook", desc: "Hand-drawn 9-stage tensor blueprint" },
    { id: "pipeline", label: "Services & Pipeline Flow", desc: "Interactive neural & cloud architecture" },
    { id: "slides", label: "Presentation Slides Deck", desc: "16:9 interactive briefing deck" },
  ];

  const modalContent = (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050a08] text-white overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3 bg-black/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 font-mono text-xs font-bold text-emerald-300 hover:bg-emerald-500/35 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          >
            <span>← BACK TO GLOBE MONITOR</span>
          </button>

          <div className="hidden sm:block h-6 w-px bg-white/15" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold tracking-wider text-white">
                DOCUMENTATION & ARCHITECTURE HUB
              </h2>
              {hubQuote && (
                <button
                  onClick={shuffleHubQuote}
                  title="Click to shuffle real dialogue quote ↺"
                  className="hidden xl:inline-flex items-center gap-1 rounded bg-[var(--primary)]/15 border border-[var(--primary)]/35 px-2 py-0.5 font-display text-[10.5px] italic text-[var(--primary)] hover:bg-[var(--primary)]/25 transition-all cursor-pointer shadow-[0_0_8px_var(--glow)]"
                >
                  <span>{currentTheme.icon}</span>
                  <span>&ldquo;{hubQuote}&rdquo;</span>
                  <span className="ml-1 text-[8px] font-mono opacity-70">↺</span>
                </button>
              )}
            </div>
            <p className="font-mono text-[9.5px] tracking-wider text-emerald-400">
              WORLD SATELLITE MONITOR • DEEP LEARNING & ORBITAL PIPELINE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-zinc-400 hidden md:inline">
            PRESS ESC TO RETURN
          </span>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 font-mono text-base text-zinc-400 hover:border-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all leading-none"
            title="Return to Globe (Esc)"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Tab Selection Bar */}
      <div className="flex overflow-x-auto border-b border-white/10 bg-zinc-950/80 px-4 sm:px-6 py-2 gap-2 scroll-thin">
        {tabs.map((t) => {
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-left transition-all ${
                isSelected
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] font-bold"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/10 hover:text-zinc-200"
              }`}
            >
              <div>
                <div className="font-display text-xs">{t.label}</div>
                <div className="font-mono text-[9px] text-zinc-500">{t.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Tab View Body - completely isolated and smoothly scrollable */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-thin">
        <Suspense fallback={<div className="flex h-64 items-center justify-center font-mono text-xs text-white/40">LOADING MODULE...</div>}>
          {/* 1. SKETCHBOOK TAB */}
          {activeTab === "sketchbook" && <ArchitectureSketchbook />}

          {/* 2. PIPELINE & SERVICES FLOW TAB */}
          {activeTab === "pipeline" && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                <h3 className="font-display text-base font-bold text-cyan-300">
                  Interactive Neural & Microservice Architecture Flow
                </h3>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                  Explore the multi-model architecture: Sentinel-2 automated ingest, OpenSR LDSR 4× super-resolution, ConvNeXt-Small multi-scale feature pyramid network, confidence-gated change detection, and orbital telemetry tracker.
                </p>
              </div>

              <div className="relative min-h-[500px]">
                <ArchitectureFlowModal open={true} embedded={true} />
              </div>
            </div>
          )}

          {/* 3. SLIDES PRESENTATION TAB */}
          {activeTab === "slides" && (
            <div className="max-w-6xl mx-auto space-y-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm font-bold text-amber-300">
                    World Satellite Monitor Briefing Deck
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-300">
                    Interactive 16:9 presentation slides connected to real multi-temporal satellite runs.
                  </p>
                </div>
                <button
                  onClick={() => setShowSlidesModal(true)}
                  className="rounded border border-amber-400/50 bg-amber-500/25 px-3 py-1.5 font-mono text-xs font-bold text-amber-300 hover:bg-amber-500/40 transition-all shadow-[0_0_8px_rgba(245,158,11,0.25)] flex items-center gap-1.5"
                >
                  <span>[FULLSCREEN]</span>
                  <span>THEATER MODE</span>
                </button>
              </div>

              <div className="h-[72vh] w-full rounded-xl overflow-hidden border border-white/15 bg-black shadow-2xl">
                <SatelliteSlidesModal open={true} embedded={true} />
              </div>
            </div>
          )}
        </Suspense>
      </div>

      {/* Separate Pop-out presentation modal */}
      {showSlidesModal && (
        <Suspense fallback={null}>
          <SatelliteSlidesModal
            open={showSlidesModal}
            onClose={() => setShowSlidesModal(false)}
          />
        </Suspense>
      )}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
