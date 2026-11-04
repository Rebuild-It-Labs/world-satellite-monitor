import { useState, useRef } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { useSmoothScroll } from '../hooks/useSmoothScroll.js';
import { MAJOR_LANDPOINTS, getLiveVesselPositions } from '../lib/maritimeData.js';
import SignalBars from './ui/SignalBars.jsx';

/**
 * MaritimeSidePanel
 * ------------------------------------------------------------------------------------------------
 * Dedicated side view panel for maritime overview, listing fleet vessels and ports.
 * Completely separated from the site monitoring panel.
 */
export default function MaritimeSidePanel({
  isOpen,
  onClose,
  isMobile,
  onSelectVessel,
  onSelectLandpoint,
  showShips,
  setShowShips,
  showPorts,
  setShowPorts,
  showRoutes,
  setShowRoutes,
  isLiveAis,
  setIsLiveAis,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Panel
          key="maritime-overview-panel"
          onClose={onClose}
          isMobile={isMobile}
          onSelectVessel={onSelectVessel}
          onSelectLandpoint={onSelectLandpoint}
          showShips={showShips}
          setShowShips={setShowShips}
          showPorts={showPorts}
          setShowPorts={setShowPorts}
          showRoutes={showRoutes}
          setShowRoutes={setShowRoutes}
          isLiveAis={isLiveAis}
          setIsLiveAis={setIsLiveAis}
        />
      )}
    </AnimatePresence>
  );
}

function Panel({
  onClose,
  isMobile,
  onSelectVessel,
  onSelectLandpoint,
  showShips,
  setShowShips,
  showPorts,
  setShowPorts,
  showRoutes,
  setShowRoutes,
  isLiveAis,
  setIsLiveAis,
}) {
  const [tab, setTab] = useState('ships'); // 'ships' | 'ports'
  const scrollRef = useRef(null);
  const drag = useDragControls();
  useSmoothScroll(scrollRef);

  const fleet = getLiveVesselPositions();

  return (
    <motion.aside
      role="dialog"
      aria-label="Maritime tracking overview"
      className={`glass-strong hud-corners fixed z-30 flex flex-col overflow-hidden ${
        isMobile
          ? 'inset-x-0 bottom-0 h-[68dvh] rounded-t-2xl'
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
      {/* Header */}
      <header
        className="relative shrink-0 border-b border-sky-500/20 px-5 pb-3.5 pt-4 bg-slate-950/85"
        onPointerDown={(e) => isMobile && drag.start(e)}
        style={{ touchAction: isMobile ? 'none' : undefined }}
      >
        {isMobile && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10.5px] tracking-[0.3em] text-sky-400">
              MARITIME // AIS TRAFFIC & FLEET
            </div>
            <h2 className="mt-1 font-display text-[22px] font-bold leading-tight text-white flex items-center gap-2">
              <span className="text-sky-400">🌊</span>
              <span>OCEAN TRANSIT OPS</span>
            </h2>
            <p className="mt-0.5 text-[12.5px] text-white/55 font-mono">
              Real-time commercial shipping corridors & global chokepoints
            </p>
          </div>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close maritime panel"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-500/40 text-sky-400 transition-colors hover:bg-sky-500/20"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {/* Layer Visibility Quick Controls */}
        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <button
            onClick={() => setShowShips?.((v) => !v)}
            className={`px-2.5 py-1 rounded border transition-all ${
              showShips ? 'border-sky-400 bg-sky-500/20 text-sky-300 font-bold' : 'border-white/10 text-white/40'
            }`}
          >
            🚢 SHIPS: {showShips ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowPorts?.((v) => !v)}
            className={`px-2.5 py-1 rounded border transition-all ${
              showPorts ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold' : 'border-white/10 text-white/40'
            }`}
          >
            ⚓ PORTS: {showPorts ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowRoutes?.((v) => !v)}
            className={`px-2.5 py-1 rounded border transition-all ${
              showRoutes ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold' : 'border-white/10 text-white/40'
            }`}
          >
            🌐 ROUTES: {showRoutes ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setIsLiveAis?.((v) => !v)}
            className={`px-2.5 py-1 rounded border transition-all ml-auto ${
              isLiveAis ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300' : 'border-white/10 text-white/40'
            }`}
          >
            {isLiveAis ? 'LIVE AIS: 10Hz' : 'AIS PAUSED'}
          </button>
        </div>

        {/* Tabs: Ships vs Ports */}
        <div className="mt-3 flex border-b border-white/10 font-mono text-[11px]">
          <button
            onClick={() => setTab('ships')}
            className={`flex-1 py-1.5 font-bold transition-all text-center border-b-2 ${
              tab === 'ships'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            🚢 FLEET VESSELS ({fleet.length})
          </button>
          <button
            onClick={() => setTab('ports')}
            className={`flex-1 py-1.5 font-bold transition-all text-center border-b-2 ${
              tab === 'ports'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            ⚓ PORTS & CHOKEPOINTS ({MAJOR_LANDPOINTS.length})
          </button>
        </div>
      </header>

      {/* Scrolling List */}
      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-4 space-y-2.5 font-mono text-white"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {tab === 'ships' && (
          <div className="space-y-2">
            {fleet.map((vsl) => (
              <button
                key={vsl.id}
                onClick={() => {
                  onSelectVessel?.(vsl);
                }}
                className="w-full text-left p-3 rounded-lg border border-sky-500/20 bg-black/40 hover:bg-sky-950/30 hover:border-sky-400/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-200 group-hover:text-sky-300 text-sm flex items-center gap-1.5">
                    <span>🚢</span>
                    <span>{vsl.name}</span>
                  </span>
                  <span className="text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded">
                    {vsl.speedKts} kts
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-white/60">
                  <span>{vsl.type} • {vsl.flag}</span>
                  <span>HDG {vsl.heading}°</span>
                </div>
                <div className="mt-1.5 text-[10px] text-white/40 flex items-center gap-1">
                  <span>{vsl.origin}</span>
                  <span>➔</span>
                  <span>{vsl.destination}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'ports' && (
          <div className="space-y-2">
            {MAJOR_LANDPOINTS.map((lp) => (
              <button
                key={lp.id}
                onClick={() => {
                  onSelectLandpoint?.(lp);
                }}
                className="w-full text-left p-3 rounded-lg border border-amber-500/20 bg-black/40 hover:bg-amber-950/30 hover:border-amber-400/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200 group-hover:text-amber-300 text-sm flex items-center gap-1.5">
                    <span>⚓</span>
                    <span>{lp.name}</span>
                  </span>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                    {lp.dailyVessels} v/d
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-white/60">
                  {lp.type} • {lp.region}
                </div>
                <div className="mt-1 text-[10px] text-white/40 truncate">
                  {lp.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
}

