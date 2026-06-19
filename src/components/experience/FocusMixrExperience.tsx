'use client';

// THREE.Clock is deprecated in THREE.js 0.175+ in favour of THREE.Timer.
// r3f 9.x still uses Clock internally — suppress the one-time dev warning
// until r3f updates its internals. Filter is dev-only, no-op in production.
if (
  typeof window !== 'undefined' &&
  process.env.NODE_ENV === 'development'
) {
  const _origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('THREE.Clock:')) return;
    _origWarn(...args);
  };
}

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TopNav } from '@/components/nav/TopNav';
import { HeroSection } from '@/components/hero/HeroSection';
import { MixerDock } from '@/components/mixer/MixerDock';
import { AuraForgePanel } from '@/components/forge/AuraForgePanel';
import { useMixState } from '@/hooks/useMixState';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { useShaderUniforms } from '@/hooks/useShaderUniforms';

const ShaderBackground = dynamic(
  () =>
    import('@/components/shader/ShaderBackground').then((m) => ({
      default: m.ShaderBackground,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#020617]" aria-hidden />
    ),
  },
);

export function FocusMixrExperience() {
  const {
    state,
    startJourney,
    setVolume,
    toggleChannel,
    setMasterVolume,
    toggleMasterPlay,
    addCustomSound,
    removeCustomSound,
    setCustomVolume,
    setCustomAccent,
    toggleCustom,
  } = useMixState();

  const [toast, setToast] = useState<string | null>(null);
  const [forgeOpen, setForgeOpen] = useState(false);
  const journeyProgressRef = useRef(0);
  const journeyAnimRef = useRef<number | null>(null);

  const { getCtx, getChannelAnalysers } = useAudioEngine(state, (msg) => setToast(msg));
  const { levelsRef, displayLevels } = useAudioAnalysis(
    getCtx,
    getChannelAnalysers,
    state.journeyStarted,
    state.masterPlaying,
  );
  const { uniformsRef, fallbackUniforms } = useShaderUniforms(
    state,
    journeyProgressRef,
    levelsRef,
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const animateJourneyProgress = useCallback(() => {
    const start = performance.now();
    const duration = 1200;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      journeyProgressRef.current = t;
      if (t < 1) {
        journeyAnimRef.current = requestAnimationFrame(step);
      }
    };

    journeyAnimRef.current = requestAnimationFrame(step);
  }, []);

  const handleStartJourney = useCallback(() => {
    startJourney();
    animateJourneyProgress();
  }, [startJourney, animateJourneyProgress]);

  useEffect(() => {
    return () => {
      if (journeyAnimRef.current) {
        cancelAnimationFrame(journeyAnimRef.current);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <ShaderBackground uniformsRef={uniformsRef} fallbackUniforms={fallbackUniforms} />
      <TopNav
        onStartJourney={handleStartJourney}
        journeyStarted={state.journeyStarted}
      />
      <HeroSection
        journeyStarted={state.journeyStarted}
        onStartJourney={handleStartJourney}
      />
      <MixerDock
        state={state}
        audioLevels={displayLevels}
        onVolumeChange={setVolume}
        onToggle={toggleChannel}
        onMasterVolumeChange={setMasterVolume}
        onToggleMasterPlay={toggleMasterPlay}
        onOpenForge={() => setForgeOpen(true)}
      />
      <AuraForgePanel
        state={state}
        isOpen={forgeOpen}
        onClose={() => setForgeOpen(false)}
        journeyStarted={state.journeyStarted}
        onAddCustomSound={addCustomSound}
        onRemoveCustomSound={removeCustomSound}
        onCustomVolumeChange={setCustomVolume}
        onCustomAccentChange={setCustomAccent}
        onToggleCustom={toggleCustom}
      />
      {toast && (
        <div
          role="status"
          className="fixed top-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-red-400/30 bg-black/70 px-4 py-2 text-sm text-red-200 backdrop-blur-md"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
