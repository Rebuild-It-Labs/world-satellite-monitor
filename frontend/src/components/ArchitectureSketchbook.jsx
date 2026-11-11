import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { getRandomThemeQuote } from "../themes/themes.config.js";

/**
 * ArchitectureSketchbook
 * -----------------------------------------------------------------------------
 * Directly embeds the original hand-drawn "Land-cover segmentation: architecture sketchbook"
 * with responsive size fitting, zoom controls, full-screen toggle, and theme integration.
 */
export default function ArchitectureSketchbook() {
  const { currentTheme } = useTheme();
  const iframeRef = useRef(null);
  const [scale, setScale] = useState(85); // Default to 85% to comfortably fit viewports without over-zooming
  const [isFull, setIsFull] = useState(false);
  const [sketchQuote, setSketchQuote] = useState(() => getRandomThemeQuote(currentTheme));

  const shuffleQuote = useCallback(() => {
    if (!currentTheme.quotes?.banners?.length) return;
    setSketchQuote((prev) => {
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
    setSketchQuote(getRandomThemeQuote(currentTheme));
  }, [currentTheme.id]);

  const base = import.meta.env.BASE_URL || "./";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const sketchbookUrl = `${cleanBase}sketchbook.html?theme=dark`;

  // Send theme state to iframe whenever theme changes
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "SET_THEME",
            theme: "dark",
          },
          "*"
        );
      } catch {}
    }
  }, [currentTheme]);

  return (
    <div className={`flex flex-col gap-3 transition-all ${isFull ? "fixed inset-0 z-50 bg-[#0c121e] p-4" : "max-w-6xl mx-auto w-full"}`}>
      {/* Header bar with controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg border border-emerald-400/40 bg-emerald-500/10 flex items-center justify-center font-mono text-xs font-bold text-emerald-300">
            BP
          </div>
          <div>
            <h3 className="font-['Caveat'] text-xl font-bold tracking-wide text-white">
              Land-Cover Segmentation: Architecture Sketchbook
            </h3>
            <p className="font-mono text-[10px] text-zinc-400">
              Original hand-drawn vector blueprint • ConvNeXt-Small + FPN + 5-Fold Ensemble
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom scale pills */}
          <div className="flex items-center rounded-lg border border-white/10 bg-black/50 p-0.5 font-mono text-[11px]">
            {[75, 85, 100].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`rounded px-2.5 py-1 transition-all ${
                  scale === s
                    ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400/40"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {s}%
              </button>
            ))}
          </div>

          <a
            href={sketchbookUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
            title="Open in new window"
          >
            <span>↗ Popout</span>
          </a>

          <button
            onClick={() => setIsFull((f) => !f)}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-300 hover:bg-emerald-500/35 transition-all"
            title="Toggle Fullscreen"
          >
            {isFull ? "Exit Fullscreen" : "[FULL] Maximize"}
          </button>
        </div>
      </div>

      {/* Thematic quote banner if a custom theme is active */}
      {sketchQuote && (
        <div
          onClick={shuffleQuote}
          className="cursor-pointer select-none rounded-lg border border-[var(--primary)]/35 bg-[var(--surface-alt)] px-3 py-1.5 text-xs italic text-white/95 font-display flex items-center justify-between gap-3 shadow-[0_0_12px_var(--glow)] hover:border-[var(--primary)]/60 transition-all active:scale-[0.99]"
          title="Click to shuffle real dialogue quote ↺"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{currentTheme.icon}</span>
            <span>&ldquo;{sketchQuote}&rdquo;</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[var(--primary)] shrink-0">
            <span>{currentTheme.label}</span>
            <span className="opacity-70">↺</span>
          </div>
        </div>
      )}

      {/* Embedded Iframe Container with Scale Transform */}
      <div className={`relative w-full overflow-hidden rounded-xl border border-white/15 bg-[#111826] shadow-2xl ${isFull ? "flex-1 min-h-0" : "h-[76vh]"}`}>
        <div
          className="w-full h-full overflow-auto scroll-thin"
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: `${100 / (scale / 100)}%`,
              height: `${100 / (scale / 100)}%`,
              transform: `scale(${scale / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.2s ease-out",
            }}
          >
            <iframe
              ref={iframeRef}
              src={sketchbookUrl}
              title="Architecture Sketchbook"
              className="w-full h-full border-0"
              onLoad={() => {
                try {
                  iframeRef.current?.contentWindow?.postMessage(
                    {
                      type: "SET_THEME",
                      theme: "dark",
                    },
                    "*"
                  );
                } catch {}
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
