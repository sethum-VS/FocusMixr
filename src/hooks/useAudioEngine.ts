'use client';

import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { MixState } from '@/types';
import { BUILTIN_CHANNELS } from '@/lib/sounds';
import type { AnalyserEntry } from '@/hooks/useAudioAnalysis';

interface AudioNode {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  analyser: AnalyserNode;
  scratch: Uint8Array<ArrayBuffer>;
  buffer: AudioBuffer | null;
  loading: boolean;
  failed: boolean;
}

export function useAudioEngine(
  state: MixState,
  onToast?: (msg: string) => void
) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const channelNodes = useRef<Map<string, AudioNode>>(new Map());
  const customSlotById = useRef<Map<string, number>>(new Map());
  const fetchAbortById = useRef<Map<string, AbortController>>(new Map());
  const channelsRef = useRef(state.channels);
  const masterPlayingRef = useRef(state.masterPlaying);
  const masterVolumeRef = useRef(state.masterVolume);
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    channelsRef.current = state.channels;
    masterPlayingRef.current = state.masterPlaying;
    masterVolumeRef.current = state.masterVolume;
  }, [state.channels, state.masterPlaying, state.masterVolume]);

  const createAnalyser = useCallback((ctx: AudioContext): AnalyserNode => {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.35;
    return analyser;
  }, []);

  const getChannelAnalysers = useCallback((): Map<string, AnalyserEntry> => {
    const map = new Map<string, AnalyserEntry>();
    for (const ch of BUILTIN_CHANNELS) {
      const node = channelNodes.current.get(ch.id);
      if (!node) continue;
      map.set(ch.id, {
        analyser: node.analyser,
        scratch: node.scratch,
      });
    }
    for (let i = 0; i < 4; i++) {
      const node = channelNodes.current.get(`custom-slot-${i}`);
      if (!node) continue;
      map.set(`custom-${i}`, {
        analyser: node.analyser,
        scratch: node.scratch,
      });
    }
    return map;
  }, []);

  const getCtx = useCallback((): AudioContext | null => ctxRef.current, []);

  // Init AudioContext once when journey starts (volume/play sync handled below).
  useEffect(() => {
    if (!state.journeyStarted || initializedRef.current) return;
    initializedRef.current = true;

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    void ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(
      masterPlayingRef.current ? masterVolumeRef.current : 0,
      ctx.currentTime,
    );
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    const onCtxState = () => {
      if (ctx.state === 'suspended' && document.visibilityState === 'visible' && masterPlayingRef.current) {
        void ctx.resume();
      }
    };
    ctx.addEventListener('statechange', onCtxState);

    return () => {
      ctx.removeEventListener('statechange', onCtxState);
    };
  }, [state.journeyStarted]);

  // Master volume
  useEffect(() => {
    const mg = masterGainRef.current;
    const ctx = ctxRef.current;
    if (!mg || !ctx) return;
    const effectiveVolume = state.masterPlaying ? state.masterVolume : 0;
    mg.gain.setTargetAtTime(effectiveVolume, ctx.currentTime, 0.08);
  }, [state.masterVolume, state.masterPlaying]);

  // Suspend/resume AudioContext on master play toggle
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !state.journeyStarted) return;
    if (state.masterPlaying) {
      void ctx.resume();
    } else {
      void ctx.suspend();
    }
  }, [state.masterPlaying, state.journeyStarted]);

  // Browsers suspend AudioContext when the tab is hidden (common on Windows sleep / alt-tab).
  useEffect(() => {
    if (!state.journeyStarted) return;

    const onVisibility = () => {
      const ctx = ctxRef.current;
      if (!ctx || document.visibilityState !== 'visible') return;
      if (masterPlayingRef.current && ctx.state !== 'running') {
        void ctx.resume();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [state.journeyStarted]);

  const getOrCreateNode = useCallback((id: string): AudioNode | null => {
    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return null;

    if (!channelNodes.current.has(id)) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      const analyser = createAnalyser(ctx);
      gain.connect(analyser);
      analyser.connect(masterGain);
      channelNodes.current.set(id, {
        source: null,
        gain,
        analyser,
        scratch: new Uint8Array(analyser.frequencyBinCount),
        buffer: null,
        loading: false,
        failed: false,
      });
    }
    return channelNodes.current.get(id)!;
  }, [createAnalyser]);

  const loadAndPlay = useCallback(async (id: string, src: string, volume: number) => {
    const node = getOrCreateNode(id);
    if (!node || node.loading) return;
    const ctx = ctxRef.current!;

    fetchAbortById.current.get(id)?.abort();
    const abort = new AbortController();
    fetchAbortById.current.set(id, abort);

    node.loading = true;
    node.failed = false;
    try {
      const resp = await fetch(src, { signal: abort.signal });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuf = await resp.arrayBuffer();
      if (abort.signal.aborted) return;

      const chState = channelsRef.current[id as keyof typeof channelsRef.current];
      if (chState && !chState.enabled) return;

      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      if (abort.signal.aborted) return;

      if (chState && !chState.enabled) return;

      node.buffer = audioBuf;
      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.loop = true;
      source.connect(node.gain);
      source.start();
      node.source = source;
      node.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.08);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      node.failed = true;
      onToast?.(`Sound failed to load: ${id}`);
      console.warn('Audio load error', id, err);
    } finally {
      if (fetchAbortById.current.get(id) === abort) {
        fetchAbortById.current.delete(id);
      }
      node.loading = false;
    }
  }, [getOrCreateNode, onToast]);

  // Retry failed sound fetches when the network comes back.
  useEffect(() => {
    if (!state.journeyStarted) return;

    const onOnline = () => {
      for (const ch of BUILTIN_CHANNELS) {
        const chState = channelsRef.current[ch.id];
        const node = channelNodes.current.get(ch.id);
        if (!chState.enabled || !node?.failed || node.loading || node.source) continue;
        node.failed = false;
        void loadAndPlay(ch.id, ch.src, chState.volume);
      }
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [state.journeyStarted, loadAndPlay]);

  const stopNode = useCallback((id: string) => {
    const ctx = ctxRef.current;
    const node = channelNodes.current.get(id);
    if (!node || !ctx) return;

    fetchAbortById.current.get(id)?.abort();
    fetchAbortById.current.delete(id);

    node.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    if (node.source) {
      const src = node.source;
      setTimeout(() => {
        try { src.stop(); } catch { /* already stopped */ }
      }, 400);
      node.source = null;
    }
  }, []);

  // Handle built-in channel enable/disable
  useEffect(() => {
    if (!state.journeyStarted) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    for (const ch of BUILTIN_CHANNELS) {
      const chState = state.channels[ch.id];
      const node = channelNodes.current.get(ch.id);

      if (chState.enabled) {
        if (!node || (!node.source && !node.loading)) {
          if (node?.failed) node.failed = false;
          loadAndPlay(ch.id, ch.src, chState.volume);
        } else if (node) {
          node.gain.gain.setTargetAtTime(chState.volume, ctx.currentTime, 0.08);
        }
      } else {
        if (node && (node.source || node.loading)) {
          stopNode(ch.id);
        }
      }
    }
  }, [state.journeyStarted, state.channels, loadAndPlay, stopNode]);

  // Volume changes for active channels
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    for (const ch of BUILTIN_CHANNELS) {
      const chState = state.channels[ch.id];
      const node = channelNodes.current.get(ch.id);
      if (node && node.source && chState.enabled) {
        node.gain.gain.setTargetAtTime(chState.volume, ctx.currentTime, 0.08);
      }
    }
  }, [state.channels]);

  // Handle custom sounds
  const playCustomSound = useCallback(async (id: string, buffer: ArrayBuffer, volume: number) => {
    const node = getOrCreateNode(id);
    if (!node || node.source) return;
    const ctx = ctxRef.current!;

    try {
      const audioBuf = await ctx.decodeAudioData(buffer.slice(0));
      node.buffer = audioBuf;
      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.loop = true;
      source.connect(node.gain);
      source.start();
      node.source = source;
      node.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.08);
    } catch (err) {
      onToast?.(`Custom sound failed to load`);
      console.warn('Custom audio error', id, err);
    }
  }, [getOrCreateNode, onToast]);

  useEffect(() => {
    if (!state.journeyStarted) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    for (const cs of state.customSounds) {
      const node = channelNodes.current.get(cs.id);

      if (cs.enabled && cs.buffer) {
        if (!node || (!node.source && !node.loading)) {
          playCustomSound(cs.id, cs.buffer, cs.volume);
        } else if (node && node.source) {
          node.gain.gain.setTargetAtTime(cs.volume, ctx.currentTime, 0.08);
        }
      } else if (!cs.enabled) {
        if (node && node.source) stopNode(cs.id);
      }
    }

    // Map custom sound ids to fixed analyser slots for stable shader indices
    const usedSlots = new Set<number>();
    state.customSounds.forEach((cs, index) => {
      let slot = customSlotById.current.get(cs.id);
      if (slot === undefined) {
        slot = index < 4 ? index : [...Array(4).keys()].find((s) => !usedSlots.has(s)) ?? 0;
        customSlotById.current.set(cs.id, slot);
      }
      usedSlots.add(slot);
      const node = channelNodes.current.get(cs.id);
      if (node) {
        channelNodes.current.set(`custom-slot-${slot}`, node);
      }
    });
  }, [state.journeyStarted, state.customSounds, playCustomSound, stopNode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== 'closed') ctx.close();
    };
  }, []);

  return { getCtx, playCustomSound, getChannelAnalysers };
}
