import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor, Stars } from '@react-three/drei';
import GlobeBase from './globe/GlobeBase.jsx';
import CountryBorders from './globe/CountryBorders.jsx';
import PulsarMarker from './globe/PulsarMarker.jsx';
import SatelliteConstellation from './globe/SatelliteConstellation.jsx';
import MaritimeLayer from './globe/MaritimeLayer.jsx';
import CameraRig from './globe/CameraRig.jsx';
import { useGeoData } from '../hooks/useGeoData.js';
import { WORLD_CENTER, latLngToVec3 } from '../lib/geo.js';

/**
 * InteractiveGlobe
 * ------------------------------------------------------------------------------------------------
 * 3D Global Earth Satellite Monitor:
 *  - Full 4K NASA Blue Marble satellite textured Earth
 *  - Global nation borders
 *  - Live pulsar site markers anywhere on Earth
 *  - Real-time orbital satellite constellation (Sentinel-2A, Sentinel-2B, Landsat-8, Landsat-9)
 */
export default function InteractiveGlobe({
  locations,
  selectedId,
  onSelect,
  selectedSatelliteId,
  onSelectSatellite,
  showOrbits = true,
  showMaritime = true,
  showRoutes = true,
  showPorts = true,
  showShips = true,
  isLiveAis = true,
  lowDataMode = false,
  onSelectVessel,
  onSelectLandpoint,
  focusTargetOverride = null,
  panelInset = { x: 0, y: 0 },
  recenterToken = 0,
  onStage,
  onError,
}) {
  const geo = useGeoData();
  const [hoverId, setHoverId] = useState(null);
  const [hoverSatId, setHoverSatId] = useState(null);
  const [maxDpr, setMaxDpr] = useState(1.75);

  const selected = useMemo(
    () => focusTargetOverride || locations.find((l) => l.id === selectedId) || null,
    [focusTargetOverride, locations, selectedId]
  );

  // Global perspective from space
  const startPos = useMemo(() => latLngToVec3(WORLD_CENTER.lat, WORLD_CENTER.lng, 3.2).toArray(), []);

  useEffect(() => {
    if (!geo) return;
    if (geo.error) {
      onError?.(`Border geometry failed to load: ${geo.error.message}`);
      onStage?.('geo');
      onStage?.('texture');
    } else {
      onStage?.('geo');
    }
  }, [geo, onError, onStage]);

  // Pointer cursor while hovering a site pulsar or satellite
  useEffect(() => {
    document.body.style.cursor = hoverId || hoverSatId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoverId, hoverSatId]);

  const ready = geo && !geo.error;

  return (
    <Canvas
      flat
      dpr={lowDataMode ? 1 : [1, maxDpr]}
      camera={{ fov: 40, near: 0.1, far: 80, position: startPos }}
      gl={{ antialias: !lowDataMode, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl }) => gl.setClearColor('#000000')}
      aria-label="Interactive 3D World Globe with satellite monitoring sites, constellation, and maritime tracking"
    >
      <PerformanceMonitor onDecline={() => setMaxDpr(1)} />
      <Stars radius={50} depth={35} count={lowDataMode ? 1000 : 2200} factor={3.5} saturation={0} fade speed={0.3} />

      {/* Global Earth Sphere with 4K Satellite Texture */}
      <GlobeBase onReady={() => onStage?.('texture')} />

      {/* Global Sovereign Country Boundaries */}
      {ready && (geo.worldSegments || geo.indiaSegments) && (
        <CountryBorders worldSegments={geo.worldSegments} indiaSegments={geo.indiaSegments} />
      )}

      {/* Global Sea Routes, Shipping Lanes, Chokepoints & Live Vessels */}
      <MaritimeLayer
        visible={showMaritime}
        showRoutes={showRoutes}
        showPorts={showPorts}
        showShips={showShips}
        isLiveAis={isLiveAis}
        onSelectVessel={onSelectVessel}
        onSelectLandpoint={onSelectLandpoint}
      />

      {/* Site Pulsar Markers on the globe */}
      {locations.map((l) => (
        <PulsarMarker
          key={l.id}
          location={l}
          hovered={hoverId === l.id}
          selected={selectedId === l.id}
          onHover={setHoverId}
          onSelect={onSelect}
        />
      ))}

      {/* Real-time Constellation (Sentinel-2A, Sentinel-2B, Landsat-9, Landsat-8) */}
      <SatelliteConstellation
        selectedSatelliteId={selectedSatelliteId}
        onSelectSatellite={onSelectSatellite}
        showOrbits={showOrbits}
        hoverId={hoverSatId}
        setHoverId={setHoverSatId}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={1.35}
        maxDistance={4.8}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI - 0.2}
        zoomSpeed={0.65}
        autoRotateSpeed={0.3}
      />
      <CameraRig target={selected} inset={panelInset} recenterToken={recenterToken} />
    </Canvas>
  );
}
