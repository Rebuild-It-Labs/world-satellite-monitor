import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { THEMES, DEFAULT_THEME_ID, getThemeById, getThemeAssetUrl } from "../themes/themes.config.js";

const THEME_FONTS = {
  "harry-potter": "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=MedievalSharp&display=swap",
  "dr-doom": "https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Chakra+Petch:wght@600;700&display=swap",
  "spider-man": "https://fonts.googleapis.com/css2?family=Bangers&family=Russo+One&display=swap",
  "beauty-beast": "https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,600;1,600&display=swap",
  "money-heist": "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    // 1. URL parameter takes highest precedence
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTheme = params.get("theme");
      if (urlTheme && THEMES.some((t) => t.id === urlTheme)) {
        return urlTheme;
      }
      // 2. localStorage
      try {
        const saved = localStorage.getItem("wsm-theme");
        if (saved && THEMES.some((t) => t.id === saved)) {
          return saved;
        }
      } catch {}
    }
    return DEFAULT_THEME_ID;
  });

  const [particlesEnabled, setParticlesEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const pref = localStorage.getItem("wsm-theme-particles");
        if (pref !== null) return pref === "true";
      } catch {}
    }
    return false; // Default OFF for all themes per user requirement
  });

  const [splashVisible, setSplashVisible] = useState(false);

  const currentTheme = useMemo(() => getThemeById(themeId), [themeId]);

  const setTheme = useCallback((id) => {
    const found = THEMES.find((t) => t.id === id);
    if (!found) return;
    setThemeId(found.id);
    setSplashVisible(true);
    try {
      localStorage.setItem("wsm-theme", found.id);
    } catch {}
  }, []);

  const toggleParticles = useCallback(() => {
    setParticlesEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("wsm-theme-particles", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Synchronize DOM attributes, metadata, favicon, and title
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", currentTheme.id);

    // Update <meta name="theme-color">
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", currentTheme.palette.bg);

    // Update Favicon with cache buster and type
    const faviconHref = getThemeAssetUrl(currentTheme.folder, "favicon.svg");
    let faviconLink = document.querySelector("link[rel*='icon']");
    if (faviconLink) {
      faviconLink.setAttribute("type", "image/svg+xml");
      faviconLink.setAttribute("href", `${faviconHref}?v=${currentTheme.id}`);
    } else {
      const newFavicon = document.createElement("link");
      newFavicon.rel = "icon";
      newFavicon.type = "image/svg+xml";
      newFavicon.href = `${faviconHref}?v=${currentTheme.id}`;
      document.head.appendChild(newFavicon);
    }

    // Lazy-load special theme typography on-demand (keeps initial site load featherweight)
    const fontUrl = THEME_FONTS[currentTheme.id];
    if (fontUrl) {
      const linkId = `wsm-font-${currentTheme.id}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = fontUrl;
        document.head.appendChild(link);
      }
    }

    // Document title suffix
    const baseTitle = "World Satellite Monitor";
    if (currentTheme.id === DEFAULT_THEME_ID) {
      document.title = `${baseTitle} — Global AI Earth Observation`;
    } else {
      document.title = `${baseTitle} [${currentTheme.label}]`;
    }
  }, [currentTheme]);

  const value = useMemo(
    () => ({
      currentTheme,
      themeId,
      setTheme,
      themes: THEMES,
      particlesEnabled,
      setParticlesEnabled,
      toggleParticles,
      splashVisible,
      setSplashVisible,
    }),
    [currentTheme, themeId, setTheme, particlesEnabled, toggleParticles, splashVisible]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
