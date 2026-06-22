'use client';

import { RefObject, useEffect, useRef, useState } from 'react';
import { AudioLevels, MixState, ShaderUniforms } from '@/types';
import { BUILTIN_CHANNELS, hexToRgbNorm } from '@/lib/sounds';
import { expSmooth } from '@/lib/expSmooth';

const MAX_CUSTOM = 4;
const EPSILON = 0.001;
const VOLUME_ATTACK = 3.5;
const VOLUME_RELEASE = 2.0;
const FALLBACK_FRAME_SKIP = 8;

function computeTargets(state: MixState): { channel: number[]; custom: number[] } {
  const channel = BUILTIN_CHANNELS.map((ch) => {
    const chState = state.channels[ch.id];
    return chState.enabled ? chState.volume : 0;
  });

  const custom = Array.from({ length: MAX_CUSTOM }, (_, i) => {
    const cs = state.customSounds[i];
    return cs && cs.enabled ? cs.volume : 0;
  });

  return { channel, custom };
}

function lerpArrays(
  current: { channel: number[]; custom: number[] },
  target: { channel: number[]; custom: number[] },
  delta: number,
): { channel: number[]; custom: number[]; changed: boolean } {
  let changed = false;

  const channel = current.channel.map((v, i) => {
    const t = target.channel[i];
    const next = expSmooth(v, t, delta, VOLUME_ATTACK, VOLUME_RELEASE);
    if (Math.abs(next - v) > EPSILON) changed = true;
    return next;
  });

  const custom = current.custom.map((v, i) => {
    const t = target.custom[i];
    const next = expSmooth(v, t, delta, VOLUME_ATTACK, VOLUME_RELEASE);
    if (Math.abs(next - v) > EPSILON) changed = true;
    return next;
  });

  return { channel, custom, changed };
}

function combineDrive(volume: number, energy: number): number {
  if (volume <= 0.001) return 0;
  // Volume is the base; energy adds a gentle shimmer instead of jitter
  return Math.min(1, volume * (0.72 + energy * 0.16));
}

function buildUniforms(
  state: MixState,
  smoothed: { channel: number[]; custom: number[] },
  audio: AudioLevels,
  journeyProgress: number,
): ShaderUniforms {
  const channelColors: number[] = [];
  const channelVolumes: number[] = [];
  const channelEnergy: number[] = [];

  for (let i = 0; i < BUILTIN_CHANNELS.length; i++) {
    const ch = BUILTIN_CHANNELS[i];
    const [r, g, b] = hexToRgbNorm(ch.color);
    const vol = smoothed.channel[i] ?? 0;
    const energy = audio.channel[i] ?? 0;
    channelColors.push(r, g, b);
    channelVolumes.push(combineDrive(vol, energy));
    channelEnergy.push(energy);
  }

  const customColors: number[] = [];
  const customVolumes: number[] = [];
  const customEnergy: number[] = [];

  for (let i = 0; i < MAX_CUSTOM; i++) {
    const cs = state.customSounds[i];
    const energy = audio.custom[i] ?? 0;
    if (cs) {
      const [r, g, b] = hexToRgbNorm(cs.accentColor || '#ffffff');
      const vol = smoothed.custom[i] ?? 0;
      customColors.push(r, g, b);
      customVolumes.push(combineDrive(vol, energy));
      customEnergy.push(energy);
    } else {
      customColors.push(0, 0, 0);
      customVolumes.push(0);
      customEnergy.push(0);
    }
  }

  return {
    channelColors,
    channelVolumes,
    channelEnergy,
    customColors,
    customVolumes,
    customEnergy,
    masterEnergy: audio.master,
    journeyProgress,
  };
}

function idleUniforms(): ShaderUniforms {
  return {
    channelColors: BUILTIN_CHANNELS.flatMap((ch) => hexToRgbNorm(ch.color)),
    channelVolumes: BUILTIN_CHANNELS.map(() => 0),
    channelEnergy: BUILTIN_CHANNELS.map(() => 0),
    customColors: Array.from({ length: MAX_CUSTOM * 3 }, () => 0),
    customVolumes: Array.from({ length: MAX_CUSTOM }, () => 0),
    customEnergy: Array.from({ length: MAX_CUSTOM }, () => 0),
    masterEnergy: 0,
    journeyProgress: 0,
  };
}

export function useShaderUniforms(
  state: MixState,
  journeyProgressRef: RefObject<number>,
  audioLevelsRef: RefObject<AudioLevels>,
): { uniformsRef: RefObject<ShaderUniforms>; fallbackUniforms: ShaderUniforms } {
  const smoothedRef = useRef({
    channel: BUILTIN_CHANNELS.map(() => 0),
    custom: [0, 0, 0, 0],
  });
  const uniformsRef = useRef<ShaderUniforms>(idleUniforms());
  const [fallbackUniforms, setFallbackUniforms] = useState<ShaderUniforms>(() => idleUniforms());

  useEffect(() => {
    let raf = 0;
    let active = true;
    let frame = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!active) return;
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const target = computeTargets(state);
      const next = lerpArrays(smoothedRef.current, target, delta);
      smoothedRef.current = { channel: next.channel, custom: next.custom };

      const audio = audioLevelsRef.current;
      const journeyProgress = journeyProgressRef.current ?? 0;
      uniformsRef.current = buildUniforms(state, smoothedRef.current, audio, journeyProgress);

      frame++;
      if (frame % FALLBACK_FRAME_SKIP === 0) {
        setFallbackUniforms(uniformsRef.current);
      }

      // Always tick: r3f reads uniformsRef every frame, and the CSS aurora
      // fallback needs journeyProgress + audio updates even when volumes are steady.
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [state, audioLevelsRef, journeyProgressRef]);

  return { uniformsRef, fallbackUniforms };
}
