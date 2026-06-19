'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
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

// --- prefers-reduced-motion sync store ---
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

// --- Inner mesh component (inside Canvas context) ---
interface AuroraMeshProps {
  uniforms: ShaderUniforms;
  reducedMotion: boolean;
}

function AuroraMesh({ uniforms, reducedMotion }: AuroraMeshProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const journeyLerp = useRef(0);

  // Build initial uniform structure (only created once)
  const uniformDefs = useMemo<Record<string, THREE.IUniform>>(() => ({
    u_time:           { value: 0 },
    u_resolution:     { value: new THREE.Vector2(1, 1) },
    u_mouse:          { value: new THREE.Vector2(0.5, 0.5) },
    u_channelColors:  { value: Array.from({ length: 6 }, () => new THREE.Vector3()) },
    u_channelVolumes: { value: new Array(6).fill(0) },
    u_customColors:   { value: Array.from({ length: 4 }, () => new THREE.Vector3()) },
    u_customVolumes:  { value: new Array(4).fill(0) },
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
    if (!mat) return;

    if (!reducedMotion) {
      mat.uniforms.u_time.value += delta;
    }

    mat.uniforms.u_resolution.value.set(size.width, size.height);
    mat.uniforms.u_mouse.value.lerp(mouseRef.current, 0.05);

    // Lerp journey progress over ~1.2s
    journeyLerp.current += (uniforms.journeyProgress - journeyLerp.current) * Math.min(delta * 0.8, 1);
    mat.uniforms.u_journeyProgress.value = journeyLerp.current;

    // Channel colors
    const cc = uniforms.channelColors;
    for (let i = 0; i < 6; i++) {
      (mat.uniforms.u_channelColors.value as THREE.Vector3[])[i]
        ?.set(cc[i * 3] ?? 0, cc[i * 3 + 1] ?? 0, cc[i * 3 + 2] ?? 0);
    }
    // Channel volumes
    for (let i = 0; i < 6; i++) {
      (mat.uniforms.u_channelVolumes.value as number[])[i] = uniforms.channelVolumes[i] ?? 0;
    }

    // Custom colors
    const xc = uniforms.customColors;
    for (let i = 0; i < 4; i++) {
      (mat.uniforms.u_customColors.value as THREE.Vector3[])[i]
        ?.set(xc[i * 3] ?? 0, xc[i * 3 + 1] ?? 0, xc[i * 3 + 2] ?? 0);
    }
    // Custom volumes
    for (let i = 0; i < 4; i++) {
      (mat.uniforms.u_customVolumes.value as number[])[i] = uniforms.customVolumes[i] ?? 0;
    }
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

// --- CSS fallback when WebGL is unavailable ---
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

// --- Public component ---
interface ShaderBackgroundProps {
  uniforms: ShaderUniforms;
}

export function ShaderBackground({ uniforms }: ShaderBackgroundProps) {
  const [webglFailed, setWebglFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [webglSupported, setWebglSupported] = useState(false);

  useEffect(() => {
    setWebglSupported(canUseWebGL());
    setMounted(true);
  }, []);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  if (!mounted || !webglSupported || webglFailed) {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <CssAuroraFallback uniforms={uniforms} />
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
        <AuroraMesh uniforms={uniforms} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
