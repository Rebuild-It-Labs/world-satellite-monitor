import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import ImageryViewer from './panel/ImageryViewer.jsx';
import TrendChart from './panel/TrendChart.jsx';
import StatTile from './panel/StatTile.jsx';
import SignalBars from './ui/SignalBars.jsx';
import { useSmoothScroll } from '../hooks/useSmoothScroll.js';
import { SEVERITY_STYLE, fmtLat, fmtLng, fmtNum, fmtSigned, pad } from '../lib/format.js';

/**
 * DetailsPanel
 * ------------------------------------------------------------------------------------------------
 * Slides in from the right edge on desktop (bottom sheet with drag-to-dismiss on mobile).
 *
 * Props
 *  location   selected site object from data.json (or null → panel slides out)
 *  meta       data.json `meta` (assetBase, dataStatus …)
 *  onClose()  dismiss handler (close button, ESC, swipe-down)
 *  isMobile   boolean — switches layout + motion axis
 */
export default function DetailsPanel({ location, meta, onClose, isMobile }) {
  return (
    <AnimatePresence>
      {location && <Panel key="details-panel" location={location} meta={meta} onClose={onClose} isMobile={isMobile} />}
    </AnimatePresence>
  );
}

function Panel({ location: loc, meta, onClose, isMobile }) {
  const scrollRef = useRef(null);
  const drag = useDragControls();
  useSmoothScroll(scrollRef);

  // reset scroll when switching between sites while the panel stays open
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [loc.id]);

  const sev = SEVERITY_STYLE[loc.severity] || SEVERITY_STYLE.STABLE;
  const s = loc.stats;
  const demo = meta.dataStatus === 'SYNTHETIC_DEMO';
  const hasLiveChanges = Boolean(s.changes);

  return (
    <motion.aside
      role="dialog"
      aria-label={`${loc.name} details`}
      className={`glass-strong hud-corners fixed z-30 flex flex-col overflow-hidden ${
        isMobile
          ? 'inset-x-0 bottom-0 h-[64dvh] rounded-t-2xl'
          : 'bottom-3 right-3 top-3 w-[min(480px,calc(100vw-1.5rem))] rounded-xl'
      }`}
      initial={isMobile ? { y: '105%' } : { x: '108%', opacity: 0.4 }}
      animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
      exit={isMobile ? { y: '105%' } : { x: '108%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 24, mass: 0.9 }}
      drag={isMobile ? 'y' : false}
      dragControls={drag}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.7 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 110 || info.velocity.y > 650) onClose();
      }}
    >
      {/* ───────── header ───────── */}
      <header
        className="relative shrink-0 border-b border-neon/15 px-5 pb-4 pt-4"
        onPointerDown={(e) => isMobile && drag.start(e)}
        style={{ touchAction: isMobile ? 'none' : undefined }}
      >
        {isMobile && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10.5px] tracking-[0.3em] text-neon/70">
              SITE // {pad(loc.index)} · {loc.state.toUpperCase()}
            </div>
            <h2 className="mt-1 font-display text-[22px] font-bold leading-tight text-white text-glow">{loc.name}</h2>
            <p className="mt-0.5 text-[13px] text-white/55">{loc.biome}</p>
          </div>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close details panel"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neon/30 text-neon transition-colors hover:bg-neon/15 hover:shadow-neon"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px]">
          <span className="text-neon">
            {fmtLat(loc.lat)} <span className="text-white/30">/</span> {fmtLng(loc.lng)}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] tracking-[0.2em] ${sev.text} ${sev.border} ${sev.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} /> {loc.severity}
          </span>
          {s.acres && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
              {s.acres} ACRES
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded border border-neon/30 bg-neon/5 px-2.5 py-1.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inset-0 animate-ping-ring rounded-full bg-neon" />
            <span className="relative h-2.5 w-2.5 animate-blink rounded-full bg-neon" />
          </span>
          <span className="animate-blink font-mono text-[11px] tracking-[0.2em] text-neon text-glow">
            {hasLiveChanges ? 'LIVE SENTINEL-2 AI TELEMETRY' : 'LIVE SATELLITE FEED TRACKING'}
          </span>
          <SignalBars className="ml-auto" />
        </div>
      </header>

      {/* ───────── scrolling body ───────── */}
      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={loc.id}
            className="space-y-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <ImageryViewer imagery={loc.imagery} artifacts={loc.artifacts} assetBase={meta.assetBase} />

            {/* Land Cover Classification Distribution (satelliteCode.py) */}
            {loc.landCoverPct?.now && (
              <section aria-label="Land cover classification" className="glass-strong rounded-lg border border-neon/25 p-3.5 font-mono">
                <div className="flex items-center justify-between text-[10px] tracking-[0.25em] text-neon/85">
                  <span>AI LAND-COVER CLASSIFICATION</span>
                  <span className="text-white/40">7 CLASSES</span>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Forest', color: '#00ff00', pct: loc.landCoverPct.now.Forest || 0 },
                    { label: 'Agriculture', color: '#ffc380', pct: loc.landCoverPct.now.Agriculture || 0 },
                    { label: 'Building (Urban)', color: '#ff2e63', pct: loc.landCoverPct.now.Building || 0 },
                    { label: 'Water', color: '#00b4d8', pct: loc.landCoverPct.now.Water || 0 },
                    { label: 'Road', color: '#ffd166', pct: loc.landCoverPct.now.Road || 0 },
                    { label: 'Barren', color: '#9f81b7', pct: loc.landCoverPct.now.Barren || 0 },
                  ].map((c) => (
                    <div key={c.label} className="text-[11px]">
                      <div className="flex justify-between text-[10px]">
                        <span className="flex items-center gap-1.5 text-white/80">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.label}
                        </span>
                        <span className="font-semibold text-white">{c.pct.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section aria-label="Key statistics" className="grid grid-cols-2 gap-2.5">
              <StatTile
                label={loc.primaryLabel || 'LAND SHIFT'}
                value={fmtSigned(s.changePct ?? s.changePct10y ?? s.changePct5y ?? 0, 1)}
                unit="%"
                tone="alert"
                sub={`${fmtNum(s.totalLossHa ?? s.totalLossHa10y ?? 0)} ha shifted`}
              />
              <StatTile
                label="FOREST NET CHANGE"
                value={s.forestLossPct != null ? fmtSigned(-s.forestLossPct + (s.forestGainPct || 0), 1) : fmtNum(s.coverNowKha, 1)}
                unit="%"
                tone={s.forestLossPct > 5 ? 'alert' : 'neon'}
                sub={s.forestLossPct != null ? `-${s.forestLossPct}% loss · +${s.forestGainPct || 0}% gain` : `baseline: ${fmtNum(s.coverThenKha, 1)} kha`}
              />
              <StatTile label="PEAK SHIFT YEAR" value={s.peakLossYear} tone="white" sub={`${fmtNum(s.peakLossHa)} ha`} />
              <StatTile label="AI RISK HORIZON" value={Math.round(s.mlRisk12m * 100)} unit="%" tone="magenta" sub={`~${fmtNum(s.mlPredictedLossHa12m)} ha forecast`} />
            </section>

            {hasLiveChanges && (
              <section aria-label="Interval change matrix" className="glass-strong rounded-lg border border-neon/20 p-3 font-mono">
                <div className="mb-2 text-[10px] tracking-[0.25em] text-neon/80">MULTI-DATE CHANGE TELEMETRY</div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {Object.entries(s.changes).map(([period, data]) => (
                    <div key={period} className="rounded bg-black/50 p-2 border border-white/10">
                      <div className="text-[9px] text-white/50">{period.replace('_to_', ' → ').toUpperCase()}</div>
                      <div className="mt-1 font-bold text-white text-[13px]">{data.changed_pct ?? data.pct}%</div>
                      <div className="text-[9px] text-alert-amber">{data.severity}</div>
                    </div>
                  ))}
                </div>
                {(s.changes?.['10y_to_now']?.top_transitions || s.changes?.['5y_to_now']?.top_transitions) && (
                  <div className="mt-2.5 border-t border-white/10 pt-2">
                    <div className="text-[9px] tracking-wider text-white/40">
                      TOP DETECTED TRANSITIONS ({s.changes?.['10y_to_now'] ? '10Y' : '5Y'}):
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(s.changes?.['10y_to_now']?.top_transitions || s.changes?.['5y_to_now']?.top_transitions).map(([trans, val]) => (
                        <span key={trans} className="rounded bg-white/5 px-2 py-0.5 text-[9.5px] text-white/80 border border-white/10">
                          {trans}: <span className="text-neon">{val}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {s.note && <div className="mt-2 text-[9.5px] text-white/40 italic">{s.note}</div>}
              </section>
            )}

            <TrendChart key={loc.id} series={loc.series} forecast={loc.forecast} />

            <section aria-label="Model output" className="glass-alert hud-corners rounded-md p-3.5" style={{ '--hud': '#ff00aa' }}>
              <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em]">
                <span className="text-alert-magenta">SWIN-VIT INFERENCE</span>
                <span className="text-white/45">{loc.imagery.heatmap.model}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-alert-magenta to-alert-red"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(s.mlRisk12m * 100)}%` }}
                  transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <p className="mt-3 text-[13px] leading-snug text-white/70">
                The model flags <span className="text-white">{fmtNum(s.mlPredictedLossHa12m)} ha</span> of likely canopy loss over the next{' '}
                {loc.imagery.heatmap.horizonMonths || 12} months, with a mean patch confidence of{' '}
                <span className="text-white">{(loc.imagery.heatmap.confidence * 100).toFixed(1)}%</span>.
              </p>
            </section>

            {demo && (
              <p className="rounded border border-alert-amber/30 bg-alert-amber/5 px-3 py-2 font-mono text-[10px] leading-relaxed tracking-wider text-alert-amber/90">
                SIMULATED DEMO DATA — statistics, dates and imagery on this panel are procedurally generated placeholders, not real measurements.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
