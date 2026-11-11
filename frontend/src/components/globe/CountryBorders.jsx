import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function CountryBorders({ worldSegments, indiaSegments }) {
  const { currentTheme } = useTheme();
  const borderColor = currentTheme?.globe?.land || '#00e5ff';

  const worldGeo = useMemo(() => {
    if (!worldSegments) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(worldSegments, 3));
    return g;
  }, [worldSegments]);

  const indiaGeo = useMemo(() => {
    if (!indiaSegments) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(indiaSegments, 3));
    return g;
  }, [indiaSegments]);

  useEffect(() => () => {
    worldGeo?.dispose();
    indiaGeo?.dispose();
  }, [worldGeo, indiaGeo]);

  return (
    <group renderOrder={2}>
      {/* Uniform sovereign boundaries across all continents */}
      {worldGeo && (
        <lineSegments geometry={worldGeo}>
          <lineBasicMaterial color={borderColor} transparent opacity={0.35} depthWrite={false} />
        </lineSegments>
      )}

      {indiaGeo && (
        <lineSegments geometry={indiaGeo}>
          <lineBasicMaterial color={borderColor} transparent opacity={0.35} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  );
}
