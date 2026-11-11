import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { useSmoothScroll } from '../hooks/useSmoothScroll.js';
import { fmtLat, fmtLng, fmtNum } from '../lib/format.js';
import SignalBars from './ui/SignalBars.jsx';

/**
 * PortDetailsPanel
 * ------------------------------------------------------------------------------------------------
 * Dedicated side view panel for maritime ports, straits & strategic chokepoints.
 * Completely separated from the site monitoring panel.
 */
export default function PortDetailsPanel({ landpoint, onClose, isMobile }) {
  return (
    <AnimatePresence>
      {landpoint && <Panel key="port-panel" landpoint={landpoint} onClose={onClose} isMobile={isMobile} />}
    </AnimatePresence>
  );
}

function Panel({ landpoint: lp, onClose, isMobile }) {
  const scrollRef = useRef(null);
  const drag = useDragControls();
  useSmoothScroll(scrollRef);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [lp?.id]);

  if (!lp) return null;

  return (
    <motion.aside
      role="dialog"
      aria-label={`${lp.name} port details`}
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
        className="relative shrink-0 border-b border-amber-500/20 px-5 pb-4 pt-4 bg-slate-950/80"
        onPointerDown={(e) => isMobile && drag.start(e)}
        style={{ touchAction: isMobile ? 'none' : undefined }}
      >
        {isMobile && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10.5px] tracking-[0.3em] text-amber-400">
              MARITIME // {lp.type.toUpperCase()}
            </div>
            <h2 className="mt-1 font-display text-[22px] font-bold leading-tight text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0 inline-block" />
              <span className="truncate">{lp.name}</span>
            </h2>
            <p className="mt-0.5 text-[13px] text-white/55 font-mono">{lp.description || 'Global maritime transit node'}</p>
          </div>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close port details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-500/40 text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px]">
          <span className="text-amber-300">
            {fmtLat(lp.lat)} <span className="text-white/30">/</span> {fmtLng(lp.lng)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] tracking-[0.2em] text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-blink" /> ACTIVE NODE
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
            {lp.dailyVessels} VESSELS / DAY
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 font-mono text-[11px] text-amber-300">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inset-0 animate-ping-ring rounded-full bg-amber-400" />
            <span className="relative h-2 w-2 rounded-full bg-amber-400" />
          </span>
          <span className="tracking-[0.18em]">OPEN-SOURCE AIS TRAFFIC MONITORED</span>
          <SignalBars className="ml-auto" />
        </div>
      </header>

      {/* Scrolling Details Body */}
      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-4 space-y-4 font-mono text-white"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-amber-500/20 bg-black/40 p-3">
            <div className="text-[10px] text-white/50 tracking-wider">DAILY PASSING FLEET</div>
            <div className="mt-1 text-xl font-bold text-amber-300">{lp.dailyVessels}</div>
            <div className="text-[9.5px] text-white/40">commercial hulls / 24h</div>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-3">
            <div className="text-[10px] text-white/50 tracking-wider">ANNUAL GLOBAL SHARE</div>
            <div className="mt-1 text-xl font-bold text-cyan-300">
              {lp.type === 'Strategic Chokepoint' ? '~14% World Sea Cargo' : '~6% World Sea Cargo'}
            </div>
            <div className="text-[9.5px] text-white/40">estimated global throughput</div>
          </div>
        </div>

        {/* Primary Commodities */}
        <div className="rounded-lg border border-white/10 bg-black/30 p-3.5 space-y-2">
          <div className="text-[10px] tracking-[0.2em] text-white/60">PRIMARY COMMODITIES & TRANSIT GOODS</div>
          <p className="text-[12px] leading-relaxed text-white/80">
            {lp.strategicImportance ||
              'Crucial global shipping artery connecting oceanic trade basins. Handles heavy crude, refined oil tankers, container freight, and bulk grains.'}
          </p>
        </div>

        {/* Real-time Tracking Protocol */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-2">
          <div className="text-[10px] tracking-[0.2em] text-amber-400">DATA PROTOCOL & VERIFICATION</div>
          <div className="text-[11px] text-white/75 leading-relaxed">
            Positioned along standard International Maritime Organization (IMO) vessel traffic separation schemes (TSS). Telemetry derived from open AIS transponder protocols (Class A/B).
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

