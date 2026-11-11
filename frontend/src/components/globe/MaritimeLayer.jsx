import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { latLngToVec3, surfaceQuaternion } from '../../lib/geo.js';
import { MAJOR_SEA_ROUTES, MAJOR_LANDPOINTS, getLiveVesselPositions } from '../../lib/maritimeData.js';

const ROUTE_COLOR = '#0ea5e9';
const CHOKE_COLOR = '#f59e0b';
const SHIP_COLOR = '#38bdf8';

// Subdivide waypoints along great arc / spherical surface
function buildRouteGeometry(waypoints, r = 1.002, stepDeg = 2.0) {
  const points = [];
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat0, lng0] = waypoints[i];
    const [lat1, lng1] = waypoints[i + 1];

    if (Math.abs(lng1 - lng0) > 180) {
      continue;
    }

    const dist = Math.hypot(lat1 - lat0, lng1 - lng0);
    const n = Math.max(1, Math.ceil(dist / stepDeg));

    for (let k = 0; k < n; k++) {
      const a = k / n;
      const b = (k + 1) / n;
      latLngToVec3(lat0 + (lat1 - lat0) * a, lng0 + (lng1 - lng0) * a, r, tmpA);
      latLngToVec3(lat0 + (lat1 - lat0) * b, lng0 + (lng1 - lng0) * b, r, tmpB);
      points.push(tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
  return geom;
}

export default function MaritimeLayer({
  visible = true,
  showRoutes = true,
  showPorts = true,
  showShips = true,
  isLiveAis = true,
  onSelectVessel,
  onSelectLandpoint,
}) {
  const [hoveredVessel, setHoveredVessel] = useState(null);
  const [hoveredLandpoint, setHoveredLandpoint] = useState(null);
  const [fleet, setFleet] = useState(() => getLiveVesselPositions());
  const lastUpdateRef = useRef(0);

  // Pre-build geometries for all sea route corridors
  const routeGeometries = useMemo(() => {
    return MAJOR_SEA_ROUTES.map((route) => ({
      id: route.id,
      name: route.name,
      geom: buildRouteGeometry(route.waypoints, 1.0018),
    }));
  }, []);

  // Update vessel positions smoothly in useFrame
  useFrame((state) => {
    if (!visible || !showShips || !isLiveAis) return;
    const now = state.clock.getElapsedTime();
    // Throttle position updates to 10 fps to save CPU/battery
    if (now - lastUpdateRef.current > 0.1) {
      lastUpdateRef.current = now;
      setFleet(getLiveVesselPositions(Date.now()));
    }
  });

  if (!visible) return null;

  return (
    <group renderOrder={3}>
      {/* 1. Major Sea Route Lines */}
      {showRoutes &&
        routeGeometries.map(({ id, geom }) => (
          <lineSegments key={id} geometry={geom}>
            <lineBasicMaterial
              color={ROUTE_COLOR}
              transparent
              opacity={0.32}
              depthWrite={false}
            />
          </lineSegments>
        ))}

      {/* 2. Major Landpoints / Chokepoints */}
      {showPorts &&
        MAJOR_LANDPOINTS.map((lp) => {
          const pos = latLngToVec3(lp.lat, lp.lng, 1.0035);
          const quat = surfaceQuaternion(lp.lat, lp.lng);
          const isHovered = hoveredLandpoint?.id === lp.id;

          const handleSelect = (e) => {
            e.stopPropagation();
            onSelectLandpoint?.(lp);
          };

          return (
            <group
              key={lp.id}
              position={pos}
              quaternion={quat}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredLandpoint(lp);
              }}
              onPointerOut={() => setHoveredLandpoint(null)}
              onClick={handleSelect}
              onPointerDown={handleSelect}
            >
              {/* Invisible large touch target (45px radius) for mobile/touch screens */}
              <mesh visible={false}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              {/* Base beacon dot - sleek and compact */}
              <mesh>
                <circleGeometry args={[0.0075, 16]} />
                <meshBasicMaterial
                  color={CHOKE_COLOR}
                  transparent
                  opacity={0.9}
                  depthWrite={false}
                />
              </mesh>

              {/* Subtle outer ping ring */}
              <mesh scale={isHovered ? 1.6 : 1.2}>
                <ringGeometry args={[0.009, 0.013, 16]} />
                <meshBasicMaterial
                  color={CHOKE_COLOR}
                  transparent
                  opacity={isHovered ? 0.75 : 0.35}
                  depthWrite={false}
                />
              </mesh>

              {/* Compact Minimal Micro-Badge Tooltip */}
              {isHovered && (
                <Html
                  center
                  distanceFactor={2.6}
                  position={[0, 0.025, 0]}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  <div className="pointer-events-none select-none whitespace-nowrap rounded border border-amber-500/40 bg-black/80 px-1.5 py-0.5 font-mono text-[8px] text-amber-300 shadow-md backdrop-blur-sm">
                    <span className="font-bold">{lp.name}</span> • <span className="text-white/60">{lp.dailyVessels} v/d</span>
                  </div>
                </Html>
              )}
            </group>
          );
        })}

      {/* 3. Live Ship Vessels (Touch-friendly & compact size) */}
      {showShips &&
        fleet.map((vsl) => {
          const pos = latLngToVec3(vsl.lat, vsl.lng, 1.0042);
          const quat = surfaceQuaternion(vsl.lat, vsl.lng);
          const isHovered = hoveredVessel?.id === vsl.id;

          const handleSelect = (e) => {
            e.stopPropagation();
            onSelectVessel?.(vsl);
          };

          return (
            <group
              key={vsl.id}
              position={pos}
              quaternion={quat}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredVessel(vsl);
              }}
              onPointerOut={() => setHoveredVessel(null)}
              onClick={handleSelect}
              onPointerDown={handleSelect}
            >
              {/* Invisible large touch target (45px radius) for mobile/touch screens */}
              <mesh visible={false}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              {/* Reduced Vessel Blip Size (Crisp & High Precision) */}
              <mesh rotation={[0, 0, THREE.MathUtils.degToRad(-vsl.heading)]}>
                <coneGeometry args={[0.006, 0.014, 3]} />
                <meshBasicMaterial
                  color={SHIP_COLOR}
                  transparent
                  opacity={isHovered ? 1.0 : 0.85}
                  depthWrite={false}
                />
              </mesh>

              {/* Compact Minimal Vessel Micro-Badge Tooltip */}
              {isHovered && (
                <Html
                  center
                  distanceFactor={2.6}
                  position={[0, 0.025, 0]}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  <div className="pointer-events-none select-none whitespace-nowrap rounded border border-cyan-500/40 bg-black/80 px-1.5 py-0.5 font-mono text-[8px] text-cyan-300 shadow-md backdrop-blur-sm">
                    <span className="font-bold">{vsl.name}</span> • <span className="text-white/70">{vsl.speedKts} kts</span>
                  </div>
                </Html>
              )}
            </group>
          );
        })}
    </group>
  );
}
