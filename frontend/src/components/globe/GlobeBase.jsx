import { Suspense, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import earthTextureUrl from '../../assets/earth-blue-marble.jpg';
import { useTheme } from '../../context/ThemeContext.jsx';

useTexture.preload(earthTextureUrl);

const atmoVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const atmoFrag = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  uniform vec3 uColor;
  void main() {
    // Back faces: normal points away from viewer, creating glowing atmospheric rim
    float a = clamp(-dot(normalize(vN), normalize(vV)), 0.0, 1.0);
    float i = pow(a, 2.0) * 2.2;
    gl_FragColor = vec4(uColor * i, i * 0.85);
  }
`;

function EarthSphere({ onReady }) {
  const texture = useTexture(earthTextureUrl);

  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
      onReady?.();
    }
  }, [texture, onReady]);

  const swallow = (e) => e.stopPropagation();

  return (
    <mesh
      renderOrder={1}
      onPointerMove={swallow}
      onPointerOver={swallow}
      onClick={swallow}
    >
      <sphereGeometry args={[1, 128, 128]} />
      <meshBasicMaterial
        key={texture?.id || 'earth-tex'}
        map={texture}
        toneMapped={false}
      />
    </mesh>
  );
}

function FallbackSphere() {
  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial color="#071b28" />
    </mesh>
  );
}

export default function GlobeBase({ onReady }) {
  const { currentTheme } = useTheme();
  const atmoColor = currentTheme?.globe?.atmosphere || '#00d8ff';

  const atmoUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(atmoColor) } }),
    []
  );

  useEffect(() => {
    if (atmoUniforms.uColor) {
      atmoUniforms.uColor.value.set(atmoColor);
    }
  }, [atmoColor, atmoUniforms]);

  return (
    <group>
      <ambientLight intensity={1.2} color="#ffffff" />

      {/* Main Global Earth Sphere with 4K Photorealistic NASA Blue Marble Satellite Texture */}
      <Suspense fallback={<FallbackSphere />}>
        <EarthSphere onReady={onReady} />
      </Suspense>

      {/* Atmospheric Rim Glow Shell */}
      <mesh scale={1.022} renderOrder={0}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          vertexShader={atmoVert}
          fragmentShader={atmoFrag}
          uniforms={atmoUniforms}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
