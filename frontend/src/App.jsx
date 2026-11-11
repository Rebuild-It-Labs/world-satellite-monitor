import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import InteractiveGlobe from './components/InteractiveGlobe.jsx';
import DetailsPanel from './components/DetailsPanel.jsx';
import PortDetailsPanel from './components/PortDetailsPanel.jsx';
import VesselDetailsPanel from './components/VesselDetailsPanel.jsx';
import MaritimeSidePanel from './components/MaritimeSidePanel.jsx';
import TelemetryOverlay from './components/TelemetryOverlay.jsx';
import BootScreen from './components/BootScreen.jsx';
import ScreenFX from './components/ui/ScreenFX.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SatelliteTrackerCard from './components/panel/SatelliteTrackerCard.jsx';
import ThemeSwitcher from './components/ThemeSwitcher.jsx';
import ThemeParticles from './components/ThemeParticles.jsx';
import ThemeSplashModal from './components/ThemeSplashModal.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { useMonitoringData } from './hooks/useMonitoringData.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';

// Lazy-loaded on-demand modal to keep initial website load lightweight
const DocumentationHubModal = lazy(() => import('./components/DocumentationHubModal.jsx'));

const MIN_BOOT_MS = 1500;

export default function App() {
  const { currentTheme, splashVisible, setSplashVisible } = useTheme();
  const { status, data, error } = useMonitoringData();
  const [selectedId, setSelectedId] = useState(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [selectedLandpoint, setSelectedLandpoint] = useState(null);
  const [maritimePanelOpen, setMaritimePanelOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);
  const [stages, setStages] = useState({ data: false, geo: false, texture: false });
  const [bootDelayDone, setBootDelayDone] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // Low data mode optimization (persisted)
  const [lowDataMode, setLowDataMode] = useState(() => {
    try {
      return localStorage.getItem('WSM_LOW_DATA') === 'true';
    } catch {
      return false;
    }
  });

  // Maritime & Vessel Tracking Layer States
  const [showShips, setShowShips] = useState(true);
  const [showPorts, setShowPorts] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [isLiveAis, setIsLiveAis] = useState(true);

  const handleToggleLowData = useCallback(() => {
    setLowDataMode((prev) => {
      const next = !prev;
      try { localStorage.setItem('WSM_LOW_DATA', String(next)); } catch {}
      return next;
    });
  }, []);

  // Satellite tracking states
  const [selectedSatelliteId, setSelectedSatelliteId] = useState(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [focusTargetOverride, setFocusTargetOverride] = useState(null);
  const [satelliteTrackerOpen, setSatelliteTrackerOpen] = useState(false);

  const isMobile = useMediaQuery('(max-width: 1023px)');

  useEffect(() => {
    const t = setTimeout(() => setBootDelayDone(true), MIN_BOOT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status === 'ready') setStages((s) => ({ ...s, data: true }));
  }, [status]);

  const onStage = useCallback((name) => setStages((s) => (s[name] ? s : { ...s, [name]: true })), []);

  const select = useCallback((id) => {
    setSelectedId(id);
    setSelectedVessel(null);
    setSelectedLandpoint(null);
    setMaritimePanelOpen(false);
    setFocusTargetOverride(null);
  }, []);

  const handleSelectVessel = useCallback((vsl) => {
    setSelectedVessel(vsl);
    setSelectedId(null);
    setSelectedLandpoint(null);
    setMaritimePanelOpen(false);
  }, []);

  const handleSelectLandpoint = useCallback((lp) => {
    setSelectedLandpoint(lp);
    setSelectedId(null);
    setSelectedVessel(null);
    setMaritimePanelOpen(false);
  }, []);

  const handleOpenDashboard = useCallback((tab = 'sites') => {
    if (tab === 'maritime') {
      setMaritimePanelOpen(true);
      setSelectedId(null);
      setSelectedVessel(null);
      setSelectedLandpoint(null);
    } else {
      setSelectedId((prev) => prev || data?.locations?.[0]?.id || null);
      setSelectedVessel(null);
      setSelectedLandpoint(null);
      setMaritimePanelOpen(false);
    }
  }, [data]);

  const handleSelectSatellite = useCallback((satOrId) => {
    const satId = typeof satOrId === 'string' ? satOrId : satOrId.id;
    setSelectedSatelliteId(satId);
    setSatelliteTrackerOpen(true);
  }, []);

  const handleFocusSatellite = useCallback((sat, state) => {
    setSelectedId(null);
    setSelectedVessel(null);
    setSelectedLandpoint(null);
    setMaritimePanelOpen(false);
    setFocusTargetOverride({
      id: `sat-focus-${sat.id}-${Date.now()}`,
      lat: state.lat,
      lng: state.lng,
    });
  }, []);

  const handleCloseSatelliteTracker = useCallback(() => {
    setSatelliteTrackerOpen(false);
    setSelectedSatelliteId(null);
    setFocusTargetOverride(null);
  }, []);

  const handleToggleSatelliteTracker = useCallback(() => {
    setSatelliteTrackerOpen((o) => {
      const next = !o;
      if (next && !selectedSatelliteId) {
        setSelectedSatelliteId('sentinel-2a');
      }
      return next;
    });
  }, [selectedSatelliteId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedVessel(null);
        setSelectedLandpoint(null);
        setMaritimePanelOpen(false);
        handleCloseSatelliteTracker();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCloseSatelliteTracker]);

  const selectedLocation = useMemo(
    () => data?.locations?.find((l) => l.id === selectedId) || null,
    [data, selectedId]
  );

  const hasAnySidePanel = Boolean(selectedId || selectedVessel || selectedLandpoint || maritimePanelOpen);
  const booting = !(stages.data && stages.geo && stages.texture && bootDelayDone) && status !== 'error';

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-black font-body text-white">
      {/* Dynamic Themed Ambient Particles (Candles, Energy, Webs, Petals, Banknotes) */}
      <ThemeParticles isMobile={isMobile} />

      {/* Top-Right Theming Switcher */}
      <ThemeSwitcher />

      {/* Center Theme Opening Splash Portal (with Audio & Sticker) */}
      <ThemeSplashModal
        activeTheme={currentTheme}
        isVisible={splashVisible}
        onDone={() => setSplashVisible(false)}
      />

      {/* Dedicated Documentation, Architecture Sketchbook & Slides Hub Page (Offloaded until requested) */}
      {docsOpen && (
        <Suspense fallback={null}>
          <DocumentationHubModal
            open={docsOpen}
            onClose={() => setDocsOpen(false)}
          />
        </Suspense>
      )}

      {/* 3D layer (unmounted/hidden when docs page is active to eliminate GPU/CPU lag) */}
      <div className={`absolute inset-0 z-0 ${docsOpen ? 'hidden' : ''}`}>
        <ErrorBoundary>
          {data && !docsOpen && (
            <InteractiveGlobe
              locations={data.locations}
              selectedId={selectedId}
              onSelect={select}
              selectedSatelliteId={selectedSatelliteId}
              onSelectSatellite={handleSelectSatellite}
              showOrbits={showOrbits}
              showMaritime={true}
              showRoutes={showRoutes}
              showPorts={showPorts}
              showShips={showShips}
              isLiveAis={isLiveAis}
              lowDataMode={lowDataMode}
              onSelectVessel={handleSelectVessel}
              onSelectLandpoint={handleSelectLandpoint}
              focusTargetOverride={focusTargetOverride}
              panelInset={{ x: isMobile ? 0 : hasAnySidePanel ? 460 : 0, y: 0 }}
              recenterToken={recenterToken}
              onStage={onStage}
              onError={setGeoError}
            />
          )}
        </ErrorBoundary>
      </div>

      <ScreenFX />

      {data && (
        <>
          <TelemetryOverlay
            telemetry={data.telemetry}
            meta={data.meta}
            locations={data.locations}
            selectedId={selectedId}
            onSelect={select}
            onSelectSatellite={handleSelectSatellite}
            selectedSatelliteId={selectedSatelliteId}
            isMobile={isMobile}
            onOpenSites={() => handleOpenDashboard('sites')}
            onOpenMaritime={() => handleOpenDashboard('maritime')}
            showShips={showShips}
            onToggleShips={() => setShowShips((s) => !s)}
            showPorts={showPorts}
            onTogglePorts={() => setShowPorts((p) => !p)}
            onToggleSatelliteTracker={handleToggleSatelliteTracker}
            satelliteTrackerOpen={satelliteTrackerOpen}
            lowDataMode={lowDataMode}
            onToggleLowData={handleToggleLowData}
            onOpenDocs={() => setDocsOpen(true)}
            onRecenter={() => {
              setFocusTargetOverride(null);
              setRecenterToken((t) => t + 1);
            }}
          />

          {/* DEDICATED SEPARATE SIDE PANELS */}

          {/* 1. Sites Details Side View Panel */}
          <DetailsPanel
            location={selectedLocation}
            meta={data.meta}
            onClose={() => setSelectedId(null)}
            isMobile={isMobile}
          />

          {/* 2. Ports & Strategic Chokepoints Side View Panel */}
          <PortDetailsPanel
            landpoint={selectedLandpoint}
            onClose={() => setSelectedLandpoint(null)}
            isMobile={isMobile}
          />

          {/* 3. Live Vessel Kinematics Side View Panel */}
          <VesselDetailsPanel
            vessel={selectedVessel}
            onClose={() => setSelectedVessel(null)}
            isMobile={isMobile}
            isLiveAis={isLiveAis}
          />

          {/* 4. Maritime Transit Fleet Overview Drawer */}
          <MaritimeSidePanel
            isOpen={maritimePanelOpen}
            onClose={() => setMaritimePanelOpen(false)}
            isMobile={isMobile}
            onSelectVessel={(vsl) => {
              setSelectedVessel(vsl);
              setMaritimePanelOpen(false);
            }}
            onSelectLandpoint={(lp) => {
              setSelectedLandpoint(lp);
              setMaritimePanelOpen(false);
            }}
            showShips={showShips}
            setShowShips={setShowShips}
            showPorts={showPorts}
            setShowPorts={setShowPorts}
            showRoutes={showRoutes}
            setShowRoutes={setShowRoutes}
            isLiveAis={isLiveAis}
            setIsLiveAis={setIsLiveAis}
          />

          {/* Satellite Tracker Floating HUD Card */}
          {satelliteTrackerOpen && (
            <SatelliteTrackerCard
              selectedSatelliteId={selectedSatelliteId || 'sentinel-2a'}
              onSelectSatellite={handleSelectSatellite}
              showOrbits={showOrbits}
              onToggleOrbits={() => setShowOrbits((s) => !s)}
              onFocusSatellite={handleFocusSatellite}
              onClose={handleCloseSatelliteTracker}
              isMobile={isMobile}
            />
          )}
        </>
      )}

      <BootScreen visible={booting} stages={stages} />

      {(status === 'error' || geoError) && (
        <div className="fixed inset-x-0 top-4 z-[60] mx-auto w-[min(520px,92vw)]">
          <div className="glass-alert hud-corners rounded-md p-4" style={{ '--hud': '#ff2e63' }}>
            <h2 className="font-display text-xs font-bold tracking-[0.25em] text-alert-red text-glow-red">
              {status === 'error' ? 'DATA LINK FAILURE' : 'GEOMETRY FAULT'}
            </h2>
            <p className="mt-2 text-sm text-white/75">{status === 'error' ? error : geoError}</p>
            {status === 'error' && (
              <p className="mt-1 font-mono text-[10px] text-white/40">Check VITE_DATA_URL / public/data/data.json, then reload.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
