'use client';

import { useEffect, useState } from 'react';
import { MixState, ShaderUniforms } from '@/types';
import { BUILTIN_CHANNELS, hexToRgbNorm } from '@/lib/sounds';

const MAX_CUSTOM = 4;
const LERP = 0.12;
const EPSILON = 0.001;

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
    const next = v + (target.channel[i] - v) * LERP;
    if (Math.abs(next - v) > EPSILON) changed = true;
    return next;
  });

  const custom = current.custom.map((v, i) => {
    const next = v + (target.custom[i] - v) * LERP;
    if (Math.abs(next - v) > EPSILON) changed = true;
    return next;
  });

  return { channel, custom, changed };
}

export function useShaderUniforms(
  state: MixState,
  journeyProgress: number,
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

  for (let i = 0; i < BUILTIN_CHANNELS.length; i++) {
    const ch = BUILTIN_CHANNELS[i];
    const [r, g, b] = hexToRgbNorm(ch.color);
    channelColors.push(r, g, b);
    channelVolumes.push(smoothed.channel[i] ?? 0);
  }

  const customColors: number[] = [];
  const customVolumes: number[] = [];

  for (let i = 0; i < MAX_CUSTOM; i++) {
    const cs = state.customSounds[i];
    if (cs) {
      const [r, g, b] = hexToRgbNorm(cs.accentColor || '#ffffff');
      customColors.push(r, g, b);
      customVolumes.push(smoothed.custom[i] ?? 0);
    } else {
      customColors.push(0, 0, 0);
      customVolumes.push(0);
    }
  }

  return {
    channelColors,
    channelVolumes,
    customColors,
    customVolumes,
    journeyProgress,
  };
}
