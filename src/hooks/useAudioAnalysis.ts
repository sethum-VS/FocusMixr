'use client';

import { useEffect, useRef, useState } from 'react';
import { AudioLevels } from '@/types';
import { BUILTIN_CHANNELS } from '@/lib/sounds';

const SILENT_LEVELS: AudioLevels = {
  channel: BUILTIN_CHANNELS.map(() => 0),
  custom: [0, 0, 0, 0],
  master: 0,
};

function readAnalyserLevel(analyser: AnalyserNode, scratch: Uint8Array<ArrayBuffer>): number {
  analyser.getByteFrequencyData(scratch);
  let sum = 0;
  for (let i = 0; i < scratch.length; i++) {
    const v = scratch[i] / 255;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / scratch.length) * 2.2);
}

interface AnalyserEntry {
  analyser: AnalyserNode;
  scratch: Uint8Array<ArrayBuffer>;
}

export function useAudioAnalysis(
  getCtx: () => AudioContext | null,
  getChannelAnalysers: () => Map<string, AnalyserEntry>,
  journeyStarted: boolean,
  masterPlaying: boolean,
): AudioLevels {
  const [levels, setLevels] = useState<AudioLevels>(SILENT_LEVELS);
  const smoothedRef = useRef({ ...SILENT_LEVELS, channel: [...SILENT_LEVELS.channel], custom: [...SILENT_LEVELS.custom] });

  useEffect(() => {
    if (!journeyStarted || !masterPlaying) {
      smoothedRef.current = {
        channel: BUILTIN_CHANNELS.map(() => 0),
        custom: [0, 0, 0, 0],
        master: 0,
      };
      setLevels(SILENT_LEVELS);
      return;
    }

    let raf = 0;
    let active = true;

    const tick = () => {
      if (!active) return;
      const ctx = getCtx();
      if (!ctx || ctx.state !== 'running') {
        raf = requestAnimationFrame(tick);
        return;
      }

      const analysers = getChannelAnalysers();
      const smoothed = smoothedRef.current;
      let masterSum = 0;
      let masterCount = 0;

      const channel = BUILTIN_CHANNELS.map((ch, i) => {
        const entry = analysers.get(ch.id);
        if (!entry) return smoothed.channel[i] ?? 0;
        const raw = readAnalyserLevel(entry.analyser, entry.scratch);
        const prev = smoothed.channel[i] ?? 0;
        const lerp = raw > prev ? 0.55 : 0.18;
        const next = prev + (raw - prev) * lerp;
        smoothed.channel[i] = next;
        masterSum += next;
        masterCount++;
        return next;
      });

      const custom = [0, 0, 0, 0].map((_, i) => {
        const entry = analysers.get(`custom-${i}`);
        if (!entry) return smoothed.custom[i] ?? 0;
        const raw = readAnalyserLevel(entry.analyser, entry.scratch);
        const prev = smoothed.custom[i] ?? 0;
        const lerp = raw > prev ? 0.55 : 0.18;
        const next = prev + (raw - prev) * lerp;
        smoothed.custom[i] = next;
        masterSum += next;
        masterCount++;
        return next;
      });

      const masterRaw = masterCount > 0 ? masterSum / masterCount : 0;
      const masterPrev = smoothed.master;
      const masterLerp = masterRaw > masterPrev ? 0.5 : 0.15;
      smoothed.master = masterPrev + (masterRaw - masterPrev) * masterLerp;

      setLevels({
        channel: [...channel],
        custom: [...custom],
        master: smoothed.master,
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [getCtx, getChannelAnalysers, journeyStarted, masterPlaying]);

  return levels;
}

export type { AnalyserEntry };
