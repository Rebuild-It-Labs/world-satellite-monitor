import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getThemeAssetUrl } from "../themes/themes.config.js";
import { themeAudio } from "../lib/themeAudio.js";

const THEME_LORE = {
  "mission-control": {
    quote: "All telemetry nominal. Earth observation grid active.",
    badge: "SYSTEM STANDARD",
  },
  "harry-potter": {
    quote: "I solemnly swear that I am up to no good.",
    badge: "WIZARDING GRID",
  },
  "dr-doom": {
    quote: "None shall stand before the supreme intellect of Doom.",
    badge: "LATVERIA MONARCH",
  },
  "spider-man": {
    quote: "With great power comes great responsibility.",
    badge: "QUEENS VIGIL",
  },
  "beauty-beast": {
    quote: "Certain as the sun rising in the east — tale as old as time.",
    badge: "ENCHANTED ROSE",
  },
  "money-heist": {
    quote: "Una mattina mi son alzato... O bella ciao, bella ciao!",
    badge: "LA RESISTENCIA",
  },
};

export default function ThemeSplashModal({ activeTheme, isVisible, onDone }) {
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    if (isVisible && activeTheme) {
      setShow(true);
      // Play custom audio file or synthesized procedural theme audio cue
      themeAudio.playThemeCue(activeTheme.id, activeTheme.folder);

      const timer = setTimeout(() => {
        setShow(false);
        onDone?.();
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [isVisible, activeTheme, onDone]);

  if (!show || !activeTheme) return null;

  const lore = THEME_LORE[activeTheme.id] || THEME_LORE["mission-control"];
  const stickerUrl = getThemeAssetUrl(activeTheme.folder, "sticker.png");

  const content = (
    <div
      onClick={() => {
        setShow(false);
        onDone?.();
      }}
      className="fixed inset-0 z-[100000] flex cursor-pointer items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-300"
    >
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 p-8 text-center shadow-2xl transition-all duration-500 animate-fade-up"
        style={{
          width: "min(460px, 90vw)",
          background: activeTheme.palette.surfaceAlt || "#101010",
          borderColor: activeTheme.palette.primary,
          boxShadow: `0 0 60px ${activeTheme.palette.glow || activeTheme.palette.primary}`,
        }}
      >
        {/* Animated Radial Halo */}
        <div
          className="absolute -top-24 h-64 w-64 rounded-full opacity-35 blur-3xl"
          style={{ backgroundColor: activeTheme.palette.primary }}
        />

        {/* Mascot / Sticker Center Image (Default Crop Circle Medallion) */}
        <div className="relative mb-4 flex items-center justify-center">
          <div
            className="h-32 w-32 md:h-36 md:w-36 rounded-full overflow-hidden border-2 p-1.5 flex items-center justify-center bg-black/60 shadow-2xl transition-transform duration-500 hover:scale-105"
            style={{
              borderColor: activeTheme.palette.primary,
              boxShadow: `0 0 35px ${activeTheme.palette.glow || activeTheme.palette.primary}`,
            }}
          >
            <img
              src={stickerUrl}
              alt={activeTheme.label}
              className="h-full w-full rounded-full object-cover"
              onError={(e) => {
                // fallback to emblem.svg if sticker fails
                e.currentTarget.src = getThemeAssetUrl(
                  activeTheme.folder,
                  "emblem.svg",
                );
              }}
            />
          </div>
        </div>

        {/* Badge */}
        <span
          className="rounded-full px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase"
          style={{
            backgroundColor: `${activeTheme.palette.primary}25`,
            color: activeTheme.palette.primary,
            border: `1px solid ${activeTheme.palette.primary}60`,
          }}
        >
          {lore.badge}
        </span>

        {/* Theme Title in Grand Typography */}
        <h2
          className="mt-3 text-3xl font-extrabold uppercase tracking-wider"
          style={{
            fontFamily: activeTheme.fonts.display,
            color: activeTheme.palette.text,
            textShadow: `0 0 16px ${activeTheme.palette.primary}`,
          }}
        >
          {activeTheme.label}
        </h2>

        {/* Theme Quote / Tagline */}
        <p
          className="mt-2 text-xs italic opacity-85 leading-relaxed max-w-[340px]"
          style={{
            fontFamily: activeTheme.fonts.body,
            color: activeTheme.palette.textMuted || "#ddd",
          }}
        >
          "{lore.quote}"
        </p>

        {/* Color Swatch Ribbon */}
        <div className="mt-5 flex items-center gap-2">
          <span
            className="h-2.5 w-8 rounded-full shadow-sm"
            style={{ backgroundColor: activeTheme.palette.primary }}
          />
          <span
            className="h-2.5 w-8 rounded-full shadow-sm"
            style={{ backgroundColor: activeTheme.palette.secondary }}
          />
          <span
            className="h-2.5 w-8 rounded-full shadow-sm"
            style={{ backgroundColor: activeTheme.palette.accent }}
          />
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
}
