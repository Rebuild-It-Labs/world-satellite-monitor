import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { getThemeAssetUrl } from "../themes/themes.config.js";

export default function ThemeSwitcher() {
  const { currentTheme, themeId, setTheme, themes, particlesEnabled, toggleParticles } = useTheme();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    themes.findIndex((t) => t.id === themeId)
  );

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Keep active index in sync with themeId
  useEffect(() => {
    const idx = themes.findIndex((t) => t.id === themeId);
    if (idx !== -1) setActiveIndex(idx);
  }, [themeId, themes]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!open) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = (prev + 1) % themes.length;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = (prev - 1 + themes.length) % themes.length;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const selected = themes[activeIndex];
        if (selected) {
          setTheme(selected.id);
          setOpen(false);
          triggerRef.current?.focus();
        }
      }
    },
    [open, themes, activeIndex, setTheme]
  );

  const handleSelect = (id) => {
    setTheme(id);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 text-white"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        right: "calc(env(safe-area-inset-right, 0px) + 12px)",
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Toggle Theme Menu"
        onClick={() => setOpen((o) => !o)}
        className="glass flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs font-semibold tracking-wider text-[var(--text)] shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
        style={{
          boxShadow: `0 0 14px ${currentTheme.palette.border}`,
        }}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/>
        </svg>
        <span className="hidden sm:inline font-bold">Themes</span>
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: currentTheme.palette.primary }}
        />
        <svg
          className={`h-3 w-3 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          role="menu"
          aria-label="Select Interface Theme"
          className="glass-strong hud-corners absolute right-0 mt-2.5 w-[min(380px,calc(100vw-24px))] rounded-xl border border-[var(--border)] p-3 shadow-2xl backdrop-blur-xl animate-fade-up"
          style={{
            background: "var(--surface-alt)",
            maxHeight: "calc(88dvh - 50px)",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-xs font-bold tracking-widest text-[var(--text)]">
                VISUAL THEMES
              </h3>
            </div>
            <span className="font-mono text-[10px] tracking-wider text-[var(--text-muted)]">
              6 STYLES
            </span>
          </div>

          {/* Theme Grid */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {themes.map((t, idx) => {
              const isSelected = t.id === themeId;
              const previewUrl = getThemeAssetUrl(t.folder, "preview.webp");
              const stickerUrl = getThemeAssetUrl(t.folder, "sticker.png");

              return (
                <div
                  key={t.id}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  role="menuitem"
                  tabIndex={0}
                  aria-checked={isSelected}
                  onClick={() => handleSelect(t.id)}
                  className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border p-1.5 transition-all outline-none ${
                    isSelected
                      ? "border-[var(--primary)] bg-white/10 shadow-[0_0_12px_var(--border)] ring-1 ring-[var(--primary)]"
                      : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                  }`}
                >
                  {/* Thumbnail with circle cropped sticker badge */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded bg-black/60">
                    <img
                      src={previewUrl}
                      alt={`${t.label} preview`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Circle-cropped Mascot Avatar */}
                    <div
                      className="absolute left-1.5 top-1.5 h-6 w-6 rounded-full overflow-hidden border border-white/50 bg-black/70 shadow-md flex items-center justify-center p-0.5"
                      style={{ borderColor: t.palette.primary }}
                    >
                      <img
                        src={stickerUrl}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = getThemeAssetUrl(t.folder, "emblem.svg");
                        }}
                      />
                    </div>
                    {/* Active badge */}
                    {isSelected && (
                      <div
                        className="absolute right-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                        style={{
                          backgroundColor: t.palette.primary,
                          color: t.id === "harry-potter" || t.id === "dr-doom" || t.id === "mission-control" ? "#000" : "#fff",
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        ACTIVE
                      </div>
                    )}
                  </div>

                  {/* Title & 3 Swatches */}
                  <div className="mt-1.5 flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="h-4 w-4 rounded-full overflow-hidden shrink-0 border border-white/20 bg-black/40">
                        <img
                          src={stickerUrl}
                          alt=""
                          className="h-full w-full object-cover rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="truncate font-display text-[11px] font-bold text-white">
                        {t.label}
                      </span>
                    </div>

                    {/* 3 Color Swatches */}
                    <div className="flex items-center gap-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-white/20"
                        style={{ backgroundColor: t.palette.primary }}
                        title="Primary"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-white/20"
                        style={{ backgroundColor: t.palette.secondary }}
                        title="Secondary"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-white/20"
                        style={{ backgroundColor: t.palette.accent }}
                        title="Accent"
                      />
                    </div>
                  </div>

                  <p className="mt-1 line-clamp-1 px-0.5 text-[9.5px] text-[var(--text-muted)]">
                    {t.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 font-mono text-[10px]">
            <span className="text-[var(--text-muted)]">Ambient Particles</span>
            <button
              type="button"
              onClick={toggleParticles}
              className={`rounded border px-2 py-0.5 font-bold transition-all ${
                particlesEnabled
                  ? "border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--primary)]"
                  : "border-white/20 bg-white/5 text-white/50"
              }`}
            >
              {particlesEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
