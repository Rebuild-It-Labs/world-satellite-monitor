/**
 * Procedural Web Audio API sound effects for theme switching.
 * Requires zero external audio files and works instantaneously.
 */

class ThemeAudioPlayer {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.suspendTimer = null;
    this.currentAudio = null;
  }

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // Offload all audio resources and release memory
  offload() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.removeAttribute("src");
        this.currentAudio.load();
      } catch {}
      this.currentAudio = null;
    }
    if (this.ctx && this.ctx.state === "running") {
      this.ctx.suspend().catch(() => {});
    }
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
  }

  playThemeCue(themeId, folder) {
    if (this.muted) return;

    // Release any previous active audio buffer
    this.offload();

    // If user provided a custom audio clip in public/themes/<folder>/sound.mp3, attempt to play it
    if (folder && typeof Audio !== "undefined") {
      try {
        const base = import.meta.env.BASE_URL || "./";
        const cleanBase = base.endsWith("/") ? base : `${base}/`;
        const audioUrl = `${cleanBase}themes/${folder}/sound.mp3`;
        const audio = new Audio(audioUrl);
        audio.volume = 0.7;
        this.currentAudio = audio;

        let played = false;
        const cleanup = () => {
          if (this.currentAudio === audio) {
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
            this.currentAudio = null;
          }
        };

        const onEnded = () => cleanup();
        const onError = () => {
          cleanup();
          if (!played) {
            this.playSynthesizedCue(themeId);
          }
        };

        audio.addEventListener("playing", () => {
          played = true;
        }, { once: true });
        audio.addEventListener("ended", onEnded, { once: true });
        audio.addEventListener("error", onError, { once: true });

        const p = audio.play();
        if (p !== undefined) {
          p.catch(() => {
            onError();
          });
          return;
        }
      } catch {
        // Fall back to procedural synthesizer
      }
    }

    this.playSynthesizedCue(themeId);
  }

  playSynthesizedCue(themeId) {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Auto-suspend audio thread after sound finishes to free CPU/audio hardware
      if (this.suspendTimer) clearTimeout(this.suspendTimer);
      this.suspendTimer = setTimeout(() => {
        if (this.ctx && this.ctx.state === "running") {
          this.ctx.suspend().catch(() => {});
        }
      }, 1500);

      switch (themeId) {
        case "harry-potter":
          // Magical sparkling bell arpeggio (celesta / wand sparkle)
          [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t + i * 0.08);

            gain.gain.setValueAtTime(0, t + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.18, t + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.55);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.6);
          });
          break;

        case "dr-doom":
          // Heavy industrial mechanical power surge
          {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.exponentialRampToValueAtTime(260, t + 0.25);
            osc.frequency.exponentialRampToValueAtTime(110, t + 0.5);

            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.65);
          }
          break;

        case "spider-man":
          // Quick dual web-zip / thwip snap
          [900, 1800].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "triangle";
            const delay = idx * 0.09;
            osc.frequency.setValueAtTime(freq, t + delay);
            osc.frequency.exponentialRampToValueAtTime(240, t + delay + 0.12);

            gain.gain.setValueAtTime(0.2, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t + delay);
            osc.stop(t + delay + 0.16);
          });
          break;

        case "beauty-beast":
          // Romantic music box chime
          [440, 554.37, 659.25, 880].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            const delay = i * 0.11;
            osc.frequency.setValueAtTime(freq, t + delay);

            gain.gain.setValueAtTime(0.14, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.7);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t + delay);
            osc.stop(t + delay + 0.75);
          });
          break;

        case "money-heist":
          // Dramatic resistance Morse beep & vault buzzer
          [740, 740, 987].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "square";
            const delay = i * 0.12;
            osc.frequency.setValueAtTime(freq, t + delay);

            gain.gain.setValueAtTime(0.08, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t + delay);
            osc.stop(t + delay + 0.11);
          });
          break;

        case "mission-control":
        default:
          // Clean futuristic radar chirp
          {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(600, t + 0.18);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
          }
          break;
      }
    } catch {}
  }
}

export const themeAudio = new ThemeAudioPlayer();
