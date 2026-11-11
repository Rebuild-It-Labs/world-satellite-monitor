import { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeParticles({ isMobile = false }) {
  const { currentTheme, particlesEnabled } = useTheme();
  const canvasRef = useRef(null);

  useEffect(() => {
    const effect = currentTheme.effect;
    if (!particlesEnabled || effect === "none") return;

    // Check prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const maxCount = isMobile ? 22 : 55;
    const particles = [];

    // Initialize particles according to theme effect
    for (let i = 0; i < maxCount; i++) {
      particles.push(initParticle(effect, width, height, true));
    }

    let isHidden = document.hidden;
    const handleVisibility = () => {
      isHidden = document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let lastTime = performance.now();

    function render(now) {
      animId = requestAnimationFrame(render);
      if (isHidden) return;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age += dt;

        if (effect === "candles") {
          // Floating warm candle flames drifting gently upward
          p.y -= p.speedY * dt;
          p.x += Math.sin(p.age * p.wobbleSpeed) * p.wobbleDist * dt;
          p.flicker = 0.8 + 0.3 * Math.sin(p.age * 9 + p.seed);

          if (p.y < -20) {
            particles[i] = initParticle(effect, width, height, false);
          }

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 0.7, p.size * 1.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245, 200, 90, ${p.opacity * p.flicker})`;
          ctx.shadowColor = "#d4af37";
          ctx.shadowBlur = 10;
          ctx.fill();

          // Candle flame center
          ctx.beginPath();
          ctx.arc(p.x, p.y + 2, p.size * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 250, 220, ${p.opacity * p.flicker * 1.2})`;
          ctx.fill();
          ctx.restore();
        } else if (effect === "energy") {
          // Arcane green energy sparks with sudden jitter
          p.x += (Math.random() - 0.5) * 2;
          p.y -= p.speedY * dt;
          if (Math.random() < 0.05) {
            p.x += (Math.random() - 0.5) * 16;
            p.y += (Math.random() - 0.5) * 16;
          }
          if (p.y < -10) {
            particles[i] = initParticle(effect, width, height, false);
          }

          ctx.save();
          ctx.fillStyle = `rgba(0, 255, 119, ${p.opacity * (0.6 + 0.4 * Math.random())})`;
          ctx.shadowColor = "#39ff14";
          ctx.shadowBlur = 8;
          ctx.fillRect(p.x, p.y, p.size, p.size * (1 + Math.random()));
          ctx.restore();
        } else if (effect === "webs") {
          // Drifting subtle web nodes
          p.x += Math.cos(p.age * 0.4) * p.speedX * dt;
          p.y += Math.sin(p.age * 0.4) * p.speedY * dt;

          if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
            particles[i] = initParticle(effect, width, height, false);
          }

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.shadowColor = "#0066cc";
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.restore();
        } else if (effect === "petals") {
          // Falling rose petals fluttering down
          p.y += p.speedY * dt;
          p.x += Math.sin(p.age * 1.5 + p.seed) * p.wobbleDist * dt;
          p.rotation += p.rotSpeed * dt;

          if (p.y > height + 20) {
            particles[i] = initParticle(effect, width, height, false);
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 1.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(224, 33, 84, ${p.opacity})`;
          ctx.shadowColor = "rgba(224, 33, 84, 0.4)";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();
        } else if (effect === "banknotes") {
          // Money banknotes / gold confetti slips fluttering down
          p.y += p.speedY * dt;
          p.x += Math.cos(p.age * 2 + p.seed) * p.wobbleDist * dt;
          p.rotation += p.rotSpeed * dt;

          if (p.y > height + 20) {
            particles[i] = initParticle(effect, width, height, false);
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.isGold
            ? `rgba(245, 184, 0, ${p.opacity})`
            : `rgba(217, 20, 36, ${p.opacity})`;
          ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
          ctx.restore();
        }
      }
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentTheme.effect, particlesEnabled, isMobile]);

  if (!particlesEnabled || currentTheme.effect === "none") {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10"
      aria-hidden="true"
    />
  );
}

function initParticle(effect, w, h, randomY = true) {
  const y = randomY ? Math.random() * h : effect === "candles" || effect === "energy" ? h + 10 : -15;
  const x = Math.random() * w;

  return {
    x,
    y,
    size: 2 + Math.random() * 4,
    speedY:
      effect === "candles"
        ? 18 + Math.random() * 22
        : effect === "energy"
        ? 35 + Math.random() * 50
        : effect === "webs"
        ? 6 + Math.random() * 10
        : 28 + Math.random() * 40,
    speedX: 5 + Math.random() * 15,
    wobbleDist: 20 + Math.random() * 30,
    wobbleSpeed: 1.2 + Math.random() * 1.5,
    opacity: 0.35 + Math.random() * 0.5,
    age: Math.random() * 10,
    seed: Math.random() * 100,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 3,
    isGold: Math.random() > 0.4,
  };
}
