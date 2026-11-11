import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { resolveAsset } from '../../lib/format.js';

export const DEFAULT_ORDER = ['tenYearsAgo', 'fiveYearsAgo', 'current', 'heatmap'];
const STEP_MS = 3000;

function HeatLegend() {
  return (
    <div className="absolute bottom-2 right-2 rounded border border-alert-magenta/40 bg-black/70 px-2 py-1 font-mono text-[9px] tracking-widest text-white/70">
      <div className="mb-0.5 flex justify-between">
        <span>LOW</span>
        <span>12-MO LOSS RISK</span>
        <span>HIGH</span>
      </div>
      <div className="h-1.5 w-40 rounded-sm bg-gradient-to-r from-transparent via-alert-magenta to-alert-red" />
    </div>
  );
}

function Meta({ item }) {
  if (!item) return null;
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2.5 pb-2 pt-8 font-mono text-[9.5px] tracking-wider text-white/70">
      <span>
        {item.date} · {item.sensor || item.model}
        {item.resolutionM ? ` · ${item.resolutionM} m` : ''}
        {item.horizonMonths ? ` · +${item.horizonMonths} mo` : ''}
      </span>
      <span className="text-white/45">
        {item.cloudCover != null ? `CLOUD ${item.cloudCover}%` : item.confidence != null ? `CONF ${(item.confidence * 100).toFixed(1)}%` : ''}
      </span>
    </div>
  );
}

export default function ImageryViewer({ imagery = {}, artifacts, assetBase }) {
  const [mode, setMode] = useState('sequence'); // 'sequence' | 'compare' | 'timelapse' | 'diagnostic'
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Dynamic time slices: gracefully ignore 10-year image if missing and use 5-year image as base
  const availableKeys = (imagery.tenYearsAgo ? ['tenYearsAgo', 'fiveYearsAgo', 'current', 'heatmap'] : ['fiveYearsAgo', 'current', 'heatmap'])
    .filter((k) => Boolean(imagery[k]));

  const [pair, setPair] = useState(() => ({
    a: imagery.tenYearsAgo ? 'tenYearsAgo' : (imagery.fiveYearsAgo ? 'fiveYearsAgo' : 'current'),
    b: 'current',
  }));

  useEffect(() => {
    setPair({
      a: imagery.tenYearsAgo ? 'tenYearsAgo' : (imagery.fiveYearsAgo ? 'fiveYearsAgo' : 'current'),
      b: 'current',
    });
    setIdx(0);
  }, [imagery]);

  const [pos, setPos] = useState(50);
  const src = (k) => {
    const item = imagery[k];
    if (!item?.src) return '';
    return resolveAsset(assetBase, item.src);
  };
  const preloaded = useRef(false);

  const handleImgError = (k) => (e) => {
    const raw = imagery[k]?.rawSrc;
    if (raw && e.currentTarget.src !== raw) {
      e.currentTarget.src = raw;
    }
  };

  // preload available frames so cross-fades never flash empty
  useEffect(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    availableKeys.forEach((k) => {
      const i = new Image();
      i.src = src(k);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableKeys]);

  useEffect(() => {
    if (mode !== 'sequence' || !playing || availableKeys.length === 0) return undefined;
    const id = setInterval(() => setIdx((i) => (i + 1) % availableKeys.length), STEP_MS);
    return () => clearInterval(id);
  }, [mode, playing, availableKeys.length]);

  const safeIdx = availableKeys.length > 0 ? idx % availableKeys.length : 0;
  const key = availableKeys[safeIdx] || 'current';
  const item = imagery[key];
  const pick = (i) => {
    setIdx(i);
    setPlaying(false);
  };

  const hasTimelapse = Boolean(artifacts?.timelapse);
  const hasDiagnostic = Boolean(artifacts?.compare);
  const hasLandCover = Boolean(artifacts?.landcoverNow);

  const availableModes = [
    ['sequence', 'SEQUENCE'],
    ['compare', 'COMPARE'],
    ...(hasLandCover ? [['landcover', 'LAND COVER']] : []),
    ...(hasTimelapse ? [['timelapse', 'TIMELAPSE']] : []),
    ...(hasDiagnostic ? [['diagnostic', 'DIAGNOSTIC']] : []),
  ];

  return (
    <section aria-label="Temporal imagery">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-neon/85">TEMPORAL IMAGERY</h3>
        <div className="flex overflow-hidden rounded border border-neon/30 font-mono text-[9px] tracking-widest">
          {availableModes.map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`px-2 py-1 transition-colors ${mode === m ? 'bg-neon/20 text-neon' : 'text-white/50 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'sequence' && (
        <>
          <div className="hud-corners relative aspect-[8/5] overflow-hidden rounded-lg border border-neon/25 bg-black">
            <AnimatePresence initial={false}>
              <motion.img
                key={key}
                src={src(key)}
                alt={`${item.label} satellite view`}
                draggable={false}
                onError={handleImgError(key)}
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
              />
            </AnimatePresence>
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded border border-neon/40 bg-black/70 px-2 py-1 font-mono text-[10px] tracking-widest text-neon">
              <span className={`h-1.5 w-1.5 rounded-full ${key === 'heatmap' ? 'bg-alert-magenta' : 'bg-neon'} animate-blink`} />
              {item.label}
            </div>
            <Meta item={item} />
            {key === 'heatmap' && <HeatLegend />}
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause sequence' : 'Play sequence'}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded border border-neon/40 bg-black/70 font-mono text-[11px] text-neon hover:bg-neon/15"
            >
              {playing ? (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>
          </div>

          <div className={`mt-2 grid gap-2 ${availableKeys.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {availableKeys.map((k, i) => {
              const active = i === safeIdx;
              const heat = k === 'heatmap';
              return (
                <button
                  key={k}
                  onClick={() => pick(i)}
                  aria-label={imagery[k]?.label}
                  aria-current={active}
                  className={`group relative overflow-hidden rounded border text-left transition-all ${
                    active ? (heat ? 'border-alert-magenta shadow-alert' : 'border-neon shadow-neon') : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  <img
                    src={src(k)}
                    alt=""
                    draggable={false}
                    onError={handleImgError(k)}
                    className={`h-11 w-full object-cover transition-opacity ${active ? 'opacity-100' : 'opacity-55 group-hover:opacity-90'}`}
                  />
                  <span className={`block px-1.5 py-1 font-mono text-[9px] tracking-widest ${active ? (heat ? 'text-alert-magenta' : 'text-neon') : 'text-white/50'}`}>
                    {imagery[k]?.short}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {mode === 'compare' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <select
              value={pair.a}
              onChange={(e) => setPair((p) => ({ ...p, a: e.target.value }))}
              aria-label="Before frame"
              className="rounded border border-neon/30 bg-black/80 px-2 py-1 text-neon focus:outline-none"
            >
              {availableKeys.map((k) => (
                <option key={k} value={k} disabled={k === pair.b} className="bg-black text-white">
                  {imagery[k]?.label}
                </option>
              ))}
            </select>
            <span className="text-white/40">VS</span>
            <select
              value={pair.b}
              onChange={(e) => setPair((p) => ({ ...p, b: e.target.value }))}
              aria-label="After frame"
              className="rounded border border-neon/30 bg-black/80 px-2 py-1 text-neon focus:outline-none"
            >
              {availableKeys.map((k) => (
                <option key={k} value={k} disabled={k === pair.a} className="bg-black text-white">
                  {imagery[k]?.label}
                </option>
              ))}
            </select>
          </div>

          <div
            className="hud-corners relative aspect-[8/5] cursor-ew-resize select-none overflow-hidden rounded-lg border border-neon/25 bg-black touch-none"
            onPointerDown={(e) => {
              const el = e.currentTarget;
              const update = (clientX) => {
                const rect = el.getBoundingClientRect();
                const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
                setPos((x / rect.width) * 100);
              };
              update(e.clientX);
              const move = (evt) => update(evt.clientX);
              const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
              };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', up);
            }}
          >
            {/* Background / After frame (pair.b) */}
            <img
              src={src(pair.b)}
              alt={imagery[pair.b].label}
              draggable={false}
              onError={handleImgError(pair.b)}
              className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
            />

            {/* Foreground / Before frame (pair.a) - clipped seamlessly with standard CSS clipPath */}
            <img
              src={src(pair.a)}
              alt={imagery[pair.a].label}
              draggable={false}
              onError={handleImgError(pair.a)}
              className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
              style={{
                clipPath: `polygon(0 0, ${pos}% 0, ${pos}% 100%, 0 100%)`,
                WebkitClipPath: `polygon(0 0, ${pos}% 0, ${pos}% 100%, 0 100%)`,
              }}
            />

            {/* Divider line & handle */}
            <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
              <div className="absolute -left-px inset-y-0 w-0.5 bg-neon shadow-neon" />
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-neon bg-black/90 font-mono text-[10px] text-neon shadow-md shadow-neon/40">
                ↔
              </div>
            </div>

            {/* Labels */}
            <div className="pointer-events-none absolute left-2 top-2 rounded border border-white/20 bg-black/80 px-2 py-0.5 font-mono text-[9px] font-medium tracking-wide text-white/90">
              {imagery[pair.a].short} ({imagery[pair.a].date})
            </div>
            <div className="pointer-events-none absolute right-2 top-2 rounded border border-white/20 bg-black/80 px-2 py-0.5 font-mono text-[9px] font-medium tracking-wide text-white/90">
              {imagery[pair.b].short} ({imagery[pair.b].date})
            </div>
          </div>
        </div>
      )}

      {mode === 'landcover' && hasLandCover && (
        <div className="hud-corners relative aspect-[8/5] overflow-hidden rounded-lg border border-neon/30 bg-black">
          <img
            src={resolveAsset(assetBase, artifacts.landcoverNow)}
            alt="AI Land Cover Segmentation Map"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded border border-neon/60 bg-black/80 px-2 py-1 font-mono text-[10px] tracking-widest text-neon">
            <span className="h-1.5 w-1.5 rounded-full bg-neon animate-blink" />
            7-CLASS SEGMENTATION MAP
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/80 px-2 py-1 font-mono text-[9.5px] text-white/70">
            Current Land-Cover Classes · LoveDA SegNet
          </div>
        </div>
      )}

      {mode === 'timelapse' && hasTimelapse && (
        <div className="hud-corners relative aspect-[8/5] overflow-hidden rounded-lg border border-alert-magenta/40 bg-black">
          <img
            src={resolveAsset(assetBase, artifacts.timelapse)}
            alt="Multi-year animated timelapse"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded border border-alert-magenta/60 bg-black/80 px-2 py-1 font-mono text-[10px] tracking-widest text-alert-magenta">
            <span className="h-1.5 w-1.5 rounded-full bg-alert-magenta animate-blink" />
            MULTI-YEAR TIMELAPSE
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/80 px-2 py-1 font-mono text-[9.5px] text-white/70">
            Looping 10Y → 5Y → Now Sentinel-2 Composite
          </div>
        </div>
      )}

      {mode === 'diagnostic' && hasDiagnostic && (
        <div className="hud-corners relative aspect-[8/5] overflow-hidden rounded-lg border border-neon/30 bg-black">
          <img
            src={resolveAsset(assetBase, artifacts.compare)}
            alt="Multi-channel comparison diagnostic"
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain bg-black"
          />
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded border border-neon/60 bg-black/80 px-2 py-1 font-mono text-[10px] tracking-widest text-neon">
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            4-PANEL AI COMPARISON
          </div>
        </div>
      )}
    </section>
  );
}
