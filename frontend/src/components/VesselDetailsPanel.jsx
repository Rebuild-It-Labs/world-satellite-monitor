import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { useSmoothScroll } from '../hooks/useSmoothScroll.js';
import { fmtLat, fmtLng } from '../lib/format.js';
import SignalBars from './ui/SignalBars.jsx';

/**
 * VesselDetailsPanel
 * ------------------------------------------------------------------------------------------------
 * Dedicated side view panel for individual commercial vessels tracked via live AIS kinematics.
 * Completely separated from the site monitoring panel.
 */
export default function VesselDetailsPanel({ vessel, onClose, isMobile, isLiveAis = true }) {
  return (
    <AnimatePresence>
      {vessel && <Panel key="vessel-panel" vessel={vessel} onClose={onClose} isMobile={isMobile} isLiveAis={isLiveAis} />}
    </AnimatePresence>
  );
}

function Panel({ vessel: vsl, onClose, isMobile, isLiveAis }) {
  const scrollRef = useRef(null);
  const drag = useDragControls();
  useSmoothScroll(scrollRef);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [vsl?.id]);

  if (!vsl) return null;

  return (
    <motion.aside
      role="dialog"
      aria-label={`${vsl.name} vessel telemetry`}
      className={`glass-strong hud-corners fixed z-30 flex flex-col overflow-hidden ${
        isMobile
          ? 'inset-x-0 bottom-0 h-[62dvh] rounded-t-2xl'
          : 'bottom-3 right-3 top-3 w-[min(460px,calc(100vw-1.5rem))] rounded-xl'
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
      {/* Header */}
      <header
        className="relative shrink-0 border-b border-sky-500/20 px-5 pb-4 pt-4 bg-slate-950/80"
        onPointerDown={(e) => isMobile && drag.start(e)}
        style={{ touchAction: isMobile ? 'none' : undefined }}
      >
        {isMobile && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10.5px] tracking-[0.3em] text-sky-400">
              COMMERCIAL FLEET // {vsl.flag}
            </div>
            <h2 className="mt-1 font-display text-[22px] font-bold leading-tight text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse shrink-0 inline-block" />
              <span className="truncate">{vsl.name}</span>
            </h2>
            <p className="mt-0.5 text-[13px] text-white/55 font-mono">{vsl.type}</p>
          </div>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close vessel details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-500/40 text-sky-400 transition-colors hover:bg-sky-500/20"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px]">
          <span className="text-sky-300">
            {fmtLat(vsl.lat)} <span className="text-white/30">/</span> {fmtLng(vsl.lng)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] tracking-[0.2em] text-sky-300">
            <span className={`h-1.5 w-1.5 rounded-full ${isLiveAis ? 'bg-sky-400 animate-blink' : 'bg-white/40'}`} />
            {isLiveAis ? 'LIVE AIS 10Hz' : 'AIS PAUSED'}
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
            MMSI: {vsl.mmsi}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded border border-sky-500/30 bg-sky-500/5 px-2.5 py-1.5 font-mono text-[11px] text-sky-300">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inset-0 animate-ping-ring rounded-full bg-sky-400" />
            <span className="relative h-2 w-2 rounded-full bg-sky-400" />
          </span>
          <span className="tracking-[0.18em]">REAL-TIME KINEMATICS TELEMETRY</span>
          <SignalBars className="ml-auto" />
        </div>
      </header>

      {/* Scrolling Details Body */}
      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-4 space-y-4 font-mono text-white"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Voyage Route */}
        <div className="rounded-lg border border-sky-500/25 bg-sky-950/20 p-3.5 space-y-2">
          <div className="text-[10px] text-sky-400 tracking-wider">CURRENT TRANSIT ROUTE</div>
          <div className="flex items-center justify-between text-sm font-bold text-white pt-1">
            <span className="truncate">{vsl.origin}</span>
            <span className="text-sky-400 px-2">&rarr;</span>
            <span className="truncate text-right">{vsl.destination}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/60 pt-1 border-t border-white/10">
            <span>ESTIMATED ARRIVAL (ETA):</span>
            <span className="text-sky-200 font-semibold">{vsl.eta}</span>
          </div>
        </div>

        {/* Speed, Heading, Draught */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded border border-white/10 bg-black/40 p-2.5">
            <div className="text-[9px] text-white/50">SPEED OVER GROUND</div>
            <div className="mt-1 text-base font-bold text-sky-300">{vsl.speedKts} kts</div>
          </div>
          <div className="rounded border border-white/10 bg-black/40 p-2.5">
            <div className="text-[9px] text-white/50">COURSE OVER GROUND</div>
            <div className="mt-1 text-base font-bold text-sky-300">{vsl.heading}°</div>
          </div>
          <div className="rounded border border-white/10 bg-black/40 p-2.5">
            <div className="text-[9px] text-white/50">DRAUGHT</div>
            <div className="mt-1 text-base font-bold text-white">{vsl.draughtM || 12.5} m</div>
          </div>
        </div>

        {/* Vessel Specifications */}
        <div className="rounded-lg border border-white/10 bg-black/30 p-3.5 space-y-2 text-[11px]">
          <div className="text-[10px] text-white/50 tracking-wider">TECHNICAL SPECIFICATIONS</div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-white/60">CARGO CLASSIFICATION</span>
            <span className="font-semibold text-white">{vsl.cargo || 'General Freight'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-white/60">LENGTH / BEAM</span>
            <span className="font-semibold text-white">{vsl.lengthM || 280}m × {vsl.beamM || 42}m</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-white/60">TRANSPONDER PROTOCOL</span>
            <span className="font-semibold text-sky-300">AIS Class-A High Rate</span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

