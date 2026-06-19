'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShaderBackground } from '@/components/shader/ShaderBackground';
import { TopNav } from '@/components/nav/TopNav';
import { HeroSection } from '@/components/hero/HeroSection';
import { MixerDock } from '@/components/mixer/MixerDock';
import { AuraForgePanel } from '@/components/forge/AuraForgePanel';
import { useMixState } from '@/hooks/useMixState';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useShaderUniforms } from '@/hooks/useShaderUniforms';

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
  const [journeyProgress, setJourneyProgress] = useState(0);
  const journeyAnimRef = useRef<number | null>(null);

  useAudioEngine(state, (msg) => setToast(msg));
  const uniforms = useShaderUniforms(state, journeyProgress);

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
      setJourneyProgress(t);
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
      <ShaderBackground uniforms={uniforms} />
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
