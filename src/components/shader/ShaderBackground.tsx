'use client';

import { RefObject, useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSyncExternalStore } from 'react';
import { vertexShader } from './aurora.vert';
import { fragmentShader } from './aurora.frag';
import { ShaderUniforms } from '@/types';
import { BUILTIN_CHANNELS } from '@/lib/sounds';

function canUseWebGL(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    return !!gl;
  } catch {
    return false;
  }
}

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
function getReducedMotionSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function getReducedMotionServerSnapshot() { return false; }

interface AuroraMeshProps {
  uniformsRef: RefObject<ShaderUniforms>;
  reducedMotion: boolean;
}

function AuroraMesh({ uniformsRef, reducedMotion }: AuroraMeshProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const journeyLerp = useRef(0);

  const uniformDefs = useMemo<Record<string, THREE.IUniform>>(() => ({
    u_time:           { value: 0 },
    u_resolution:     { value: new THREE.Vector2(1, 1) },
    u_mouse:          { value: new THREE.Vector2(0.5, 0.5) },
    u_channelColors:  { value: Array.from({ length: 6 }, () => new THREE.Vector3()) },
    u_channelVolumes: { value: new Array(6).fill(0) },
    u_channelEnergy:  { value: new Array(6).fill(0) },
    u_customColors:   { value: Array.from({ length: 4 }, () => new THREE.Vector3()) },
    u_customVolumes:  { value: new Array(4).fill(0) },
    u_customEnergy:   { value: new Array(4).fill(0) },
    u_masterEnergy:   { value: 0 },
    u_journeyProgress:{ value: 0 },
  }), []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.set(
        e.clientX / window.innerWidth,
        1 - e.clientY / window.innerHeight
      );
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame((_, delta) => {
    const mat = matRef.current;
    const uniforms = uniformsRef.current;
    if (!mat || !uniforms) return;

    if (!reducedMotion) {
      const energyBoost = 1 + (uniforms.masterEnergy ?? 0) * 1.8;
      mat.uniforms.u_time.value += delta * energyBoost;
    }

    mat.uniforms.u_resolution.value.set(size.width, size.height);
    mat.uniforms.u_mouse.value.lerp(mouseRef.current, 0.05);

    journeyLerp.current += (uniforms.journeyProgress - journeyLerp.current) * Math.min(delta * 0.8, 1);
    mat.uniforms.u_journeyProgress.value = journeyLerp.current;

    const cc = uniforms.channelColors;
    for (let i = 0; i < 6; i++) {
      (mat.uniforms.u_channelColors.value as THREE.Vector3[])[i]
        ?.set(cc[i * 3] ?? 0, cc[i * 3 + 1] ?? 0, cc[i * 3 + 2] ?? 0);
    }
    for (let i = 0; i < 6; i++) {
      (mat.uniforms.u_channelVolumes.value as number[])[i] = uniforms.channelVolumes[i] ?? 0;
      (mat.uniforms.u_channelEnergy.value as number[])[i] = uniforms.channelEnergy[i] ?? 0;
    }

    const xc = uniforms.customColors;
    for (let i = 0; i < 4; i++) {
      (mat.uniforms.u_customColors.value as THREE.Vector3[])[i]
        ?.set(xc[i * 3] ?? 0, xc[i * 3 + 1] ?? 0, xc[i * 3 + 2] ?? 0);
    }
    for (let i = 0; i < 4; i++) {
      (mat.uniforms.u_customVolumes.value as number[])[i] = uniforms.customVolumes[i] ?? 0;
      (mat.uniforms.u_customEnergy.value as number[])[i] = uniforms.customEnergy[i] ?? 0;
    }

    mat.uniforms.u_masterEnergy.value = uniforms.masterEnergy ?? 0;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniformDefs}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

function CssAuroraFallback({ uniforms }: { uniforms: ShaderUniforms }) {
  const dominant = useMemo(() => {
    let bestIdx = 0;
    let bestVol = 0;
    for (let i = 0; i < uniforms.channelVolumes.length; i++) {
      if ((uniforms.channelVolumes[i] ?? 0) > bestVol) {
        bestVol = uniforms.channelVolumes[i] ?? 0;
        bestIdx = i;
      }
    }
    return BUILTIN_CHANNELS[bestIdx]?.color ?? '#0f172a';
  }, [uniforms.channelVolumes]);

  const progress = uniforms.journeyProgress;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      aria-hidden
      style={{
        background: `radial-gradient(ellipse at 50% 40%, ${dominant}44 0%, #020617 ${40 + progress * 20}%, #000 100%)`,
        transition: 'background 1.2s ease',
      }}
    >
      <div
        className="absolute inset-[-20%] opacity-40 animate-pulse-slow"
        style={{
          background: `conic-gradient(from 180deg at 50% 50%, ${dominant}22, #020617, ${dominant}33, #000)`,
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}

interface ShaderBackgroundProps {
  uniformsRef: RefObject<ShaderUniforms>;
  fallbackUniforms: ShaderUniforms;
}

export function ShaderBackground({ uniformsRef, fallbackUniforms }: ShaderBackgroundProps) {
  const [webglFailed, setWebglFailed] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const webglSupported = useSyncExternalStore(
    () => () => {},
    () => canUseWebGL(),
    () => false,
  );

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  if (!mounted || !webglSupported || webglFailed) {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <CssAuroraFallback uniforms={fallbackUniforms} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 1], fov: 90 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setWebglFailed(true);
          });
        }}
        onError={() => setWebglFailed(true)}
      >
        <AuroraMesh uniformsRef={uniformsRef} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
