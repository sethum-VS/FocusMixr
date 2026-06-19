'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MixState } from '@/types';
import { BUILTIN_CHANNELS } from '@/lib/sounds';

interface AudioNode {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
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
  const initializedRef = useRef(false);

  const getCtx = useCallback((): AudioContext | null => ctxRef.current, []);

  // Init AudioContext on journey start
  useEffect(() => {
    if (!state.journeyStarted || initializedRef.current) return;
    initializedRef.current = true;

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    void ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(
      state.masterPlaying ? state.masterVolume : 0,
      ctx.currentTime,
    );
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;
  }, [state.journeyStarted, state.masterVolume, state.masterPlaying]);

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

  const getOrCreateNode = useCallback((id: string): AudioNode | null => {
    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return null;

    if (!channelNodes.current.has(id)) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.connect(masterGain);
      channelNodes.current.set(id, { source: null, gain, buffer: null, loading: false, failed: false });
    }
    return channelNodes.current.get(id)!;
  }, []);

  const loadAndPlay = useCallback(async (id: string, src: string, volume: number) => {
    const node = getOrCreateNode(id);
    if (!node || node.loading || node.failed) return;
    const ctx = ctxRef.current!;

    node.loading = true;
    try {
      const resp = await fetch(src);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      node.buffer = audioBuf;

      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.loop = true;
      source.connect(node.gain);
      source.start();
      node.source = source;
      node.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.08);
    } catch (err) {
      node.failed = true;
      onToast?.(`Sound failed to load: ${id}`);
      console.warn('Audio load error', id, err);
    } finally {
      node.loading = false;
    }
  }, [getOrCreateNode, onToast]);

  const stopNode = useCallback((id: string) => {
    const ctx = ctxRef.current;
    const node = channelNodes.current.get(id);
    if (!node || !ctx) return;

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
        if (!node || (!node.source && !node.loading && !node.failed)) {
          loadAndPlay(ch.id, ch.src, chState.volume);
        } else if (node) {
          node.gain.gain.setTargetAtTime(chState.volume, ctx.currentTime, 0.08);
        }
      } else {
        if (node && node.source) {
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
  }, [state.journeyStarted, state.customSounds, playCustomSound, stopNode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== 'closed') ctx.close();
    };
  }, []);

  return { getCtx, playCustomSound };
}
