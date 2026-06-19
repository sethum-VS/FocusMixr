'use client';

import { RefObject, useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSyncExternalStore } from 'react';
import { vertexShader } from './aurora.vert';
import { fragmentShader } from './aurora.frag';
import { ShaderUniforms } from '@/types';
import { BUILTIN_CHANNELS } from '@/lib/sounds';
import { expSmooth } from '@/lib/expSmooth';

// Cached at module scope — WebGL support doesn't change at runtime.
// Without caching, useSyncExternalStore calls getSnapshot() on every render,
// creating a new unreleased WebGL context each time. Browsers cap at ~16
// total contexts — hitting that limit kills the oldest context (our canvas).
let _webglSupportCache: boolean | null = null;

function canUseWebGL(): boolean {
  if (typeof window === 'undefined') return true;
  if (_webglSupportCache !== null) return _webglSupportCache;
  try {
    const testCanvas = document.createElement('canvas');
    const gl =
      testCanvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ??
      testCanvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    _webglSupportCache = !!gl;
    // Immediately release the test context so it doesn't count against the limit.
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    return _webglSupportCache;
  } catch {
    _webglSupportCache = false;
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

  // Water-drop transient detection
  const prevEnergyRef = useRef(0);
  const lastDropTimeRef = useRef(-9999);
  const nextDropIdxRef = useRef(0);

  // Second-pass GPU smoothing — decouples shader motion from FFT spikes
  const smoothMasterRef = useRef(0);
  const smoothChannelEnergyRef = useRef(new Array(6).fill(0));
  const smoothChannelVolRef = useRef(new Array(6).fill(0));
  const smoothCustomEnergyRef = useRef(new Array(4).fill(0));
  const smoothCustomVolRef = useRef(new Array(4).fill(0));

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
    // Water-drop ripple (ring buffer of 3 concurrent drops)
    u_dropPos:        { value: Array.from({ length: 3 }, () => new THREE.Vector2(0.5, 0.5)) },
    u_dropBirthTime:  { value: new Array(3).fill(-9999) },
    u_dropStrength:   { value: new Array(3).fill(0) },
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
      // Nearly constant drift — audio barely speeds time
      const energyBoost = 1 + (smoothMasterRef.current) * 0.18;
      mat.uniforms.u_time.value += delta * energyBoost;
    }

    mat.uniforms.u_resolution.value.set(size.width, size.height);
    mat.uniforms.u_mouse.value.lerp(mouseRef.current, 0.02);

    journeyLerp.current += (uniforms.journeyProgress - journeyLerp.current) * Math.min(delta * 0.5, 1);
    mat.uniforms.u_journeyProgress.value = journeyLerp.current;

    // Smooth all audio-driven values before they hit the GPU
    smoothMasterRef.current = expSmooth(
      smoothMasterRef.current,
      uniforms.masterEnergy ?? 0,
      delta,
      1.8,
      0.9,
    );

    const cc = uniforms.channelColors;
    for (let i = 0; i < 6; i++) {
      (mat.uniforms.u_channelColors.value as THREE.Vector3[])[i]
        ?.set(cc[i * 3] ?? 0, cc[i * 3 + 1] ?? 0, cc[i * 3 + 2] ?? 0);

      const targetVol = uniforms.channelVolumes[i] ?? 0;
      const targetEnergy = uniforms.channelEnergy[i] ?? 0;
      smoothChannelVolRef.current[i] = expSmooth(
        smoothChannelVolRef.current[i],
        targetVol,
        delta,
        1.6,
        0.85,
      );
      smoothChannelEnergyRef.current[i] = expSmooth(
        smoothChannelEnergyRef.current[i],
        targetEnergy,
        delta,
        1.5,
        0.8,
      );
      (mat.uniforms.u_channelVolumes.value as number[])[i] = smoothChannelVolRef.current[i];
      (mat.uniforms.u_channelEnergy.value as number[])[i] = smoothChannelEnergyRef.current[i];
    }

    const xc = uniforms.customColors;
    for (let i = 0; i < 4; i++) {
      (mat.uniforms.u_customColors.value as THREE.Vector3[])[i]
        ?.set(xc[i * 3] ?? 0, xc[i * 3 + 1] ?? 0, xc[i * 3 + 2] ?? 0);

      const targetVol = uniforms.customVolumes[i] ?? 0;
      const targetEnergy = uniforms.customEnergy[i] ?? 0;
      smoothCustomVolRef.current[i] = expSmooth(
        smoothCustomVolRef.current[i],
        targetVol,
        delta,
        1.6,
        0.85,
      );
      smoothCustomEnergyRef.current[i] = expSmooth(
        smoothCustomEnergyRef.current[i],
        targetEnergy,
        delta,
        1.5,
        0.8,
      );
      (mat.uniforms.u_customVolumes.value as number[])[i] = smoothCustomVolRef.current[i];
      (mat.uniforms.u_customEnergy.value as number[])[i] = smoothCustomEnergyRef.current[i];
    }

    mat.uniforms.u_masterEnergy.value = smoothMasterRef.current;

    // Water-drop: only on large smoothed transients (rain hits, thunder)
    const curEnergy = smoothMasterRef.current;
    const energyDelta = curEnergy - prevEnergyRef.current;
    const currentTime = mat.uniforms.u_time.value;
    const cooldownOk = (currentTime - lastDropTimeRef.current) > 3.2;

    if (energyDelta > 0.045 && curEnergy > 0.14 && cooldownOk) {
      const idx = nextDropIdxRef.current % 3;
      (mat.uniforms.u_dropPos.value as THREE.Vector2[])[idx].set(
        0.22 + Math.random() * 0.56,
        0.22 + Math.random() * 0.56,
      );
      (mat.uniforms.u_dropBirthTime.value as number[])[idx] = currentTime;
      (mat.uniforms.u_dropStrength.value as number[])[idx] = Math.min(0.65, energyDelta * 2.5 + 0.12);
      nextDropIdxRef.current++;
      lastDropTimeRef.current = currentTime;
    }
    prevEnergyRef.current = curEnergy;
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
          // preventDefault() signals to the browser that we will handle
          // context recovery — do NOT unmount here, r3f restores it automatically.
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
          });
          // If restoration fails after the browser restores the context,
          // r3f will surface an error that triggers onError below.
        }}
        onError={() => setWebglFailed(true)}
      >
        <AuroraMesh uniformsRef={uniformsRef} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
