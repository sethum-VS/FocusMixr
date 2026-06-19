'use client';

import { useEffect, useState } from 'react';
import { AudioLevels, MixState, ShaderUniforms } from '@/types';
import { BUILTIN_CHANNELS, hexToRgbNorm } from '@/lib/sounds';

const MAX_CUSTOM = 4;
const EPSILON = 0.001;
const LERP_ATTACK = 0.42;
const LERP_RELEASE = 0.14;

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
): { channel: number[]; custom: number[]; changed: boolean } {
  let changed = false;

  const channel = current.channel.map((v, i) => {
    const t = target.channel[i];
    const lerp = t > v ? LERP_ATTACK : LERP_RELEASE;
    const next = v + (t - v) * lerp;
    if (Math.abs(next - v) > EPSILON) changed = true;
    return next;
  });

  const custom = current.custom.map((v, i) => {
    const t = target.custom[i];
    const lerp = t > v ? LERP_ATTACK : LERP_RELEASE;
    const next = v + (t - v) * lerp;
    if (Math.abs(next - v) > EPSILON) changed = true;
    return next;
  });

  return { channel, custom, changed };
}

function combineDrive(volume: number, energy: number): number {
  if (volume <= 0.001) return 0;
  return Math.min(1, volume * (0.35 + energy * 0.95));
}

export function useShaderUniforms(
  state: MixState,
  journeyProgress: number,
  audioLevels: AudioLevels,
): ShaderUniforms {
  const [smoothed, setSmoothed] = useState(() => ({
    channel: BUILTIN_CHANNELS.map(() => 0),
    custom: [0, 0, 0, 0],
  }));

  useEffect(() => {
    let raf = 0;
    let active = true;

    const tick = () => {
      if (!active) return;

      setSmoothed((current) => {
        const target = computeTargets(state);
        const next = lerpArrays(current, target);

        if (next.changed) {
          raf = requestAnimationFrame(tick);
        }

        if (!next.changed) return current;
        return { channel: next.channel, custom: next.custom };
      });
    };

    raf = requestAnimationFrame(tick);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [state]);

  const channelColors: number[] = [];
  const channelVolumes: number[] = [];
  const channelEnergy: number[] = [];

  for (let i = 0; i < BUILTIN_CHANNELS.length; i++) {
    const ch = BUILTIN_CHANNELS[i];
    const [r, g, b] = hexToRgbNorm(ch.color);
    const vol = smoothed.channel[i] ?? 0;
    const energy = audioLevels.channel[i] ?? 0;
    channelColors.push(r, g, b);
    channelVolumes.push(combineDrive(vol, energy));
    channelEnergy.push(energy);
  }

  const customColors: number[] = [];
  const customVolumes: number[] = [];
  const customEnergy: number[] = [];

  for (let i = 0; i < MAX_CUSTOM; i++) {
    const cs = state.customSounds[i];
    const energy = audioLevels.custom[i] ?? 0;
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
    masterEnergy: audioLevels.master,
    journeyProgress,
  };
}
