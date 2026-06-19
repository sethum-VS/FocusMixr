'use client';

import { useEffect, useMemo, useState } from 'react';
import { GlassPanel } from '@/components/layout/GlassPanel';
import { SoundChannel } from './SoundChannel';
import { ForgeChannel } from './ForgeChannel';
import { MasterControl } from './MasterControl';
import { BUILTIN_CHANNELS } from '@/lib/sounds';
import { computeMixedColor } from '@/lib/colorMix';
import { MixState, ChannelId, AudioLevels } from '@/types';
import { BlendPreview } from './BlendPreview';

interface MixerDockProps {
  state: MixState;
  audioLevels: AudioLevels;
  onVolumeChange: (id: ChannelId, v: number) => void;
  onToggle: (id: ChannelId) => void;
  onMasterVolumeChange: (v: number) => void;
  onToggleMasterPlay: () => void;
  onOpenForge: () => void;
}

export function MixerDock({
  state,
  audioLevels,
  onVolumeChange,
  onToggle,
  onMasterVolumeChange,
  onToggleMasterPlay,
  onOpenForge,
}: MixerDockProps) {
  const { journeyStarted } = state;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!journeyStarted) return;
    // Double-RAF: waits for browser to paint the mounted DOM before starting CSS transition
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, [journeyStarted]);

  const energy = audioLevels.master;
  const mixedColor = useMemo(
    () => computeMixedColor(state, audioLevels),
    [state, audioLevels],
  );
  // Dynamic glow uses the live blended sound-color, not generic white
  const glowPx = energy * 28;
  const glowAlpha = 0.12 + energy * 0.28;
  const borderAlpha = 0.10 + energy * 0.22;

  return (
    <div
      className="w-full"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.65s ease',
      }}
    >
      {/* Energy-reactive outer glow wrapper */}
      <BlendPreview state={state} audioLevels={audioLevels} />
      <div
        style={{
          borderRadius: '1.5rem',
          boxShadow: energy > 0.04
            ? `0 0 ${glowPx}px ${mixedColor}${Math.round(glowAlpha * 255).toString(16).padStart(2, '0')}, 0 ${glowPx * 0.5}px ${glowPx * 1.5}px rgba(0,0,0,0.5)`
            : `0 8px 32px rgba(0,0,0,0.5), 0 0 12px ${mixedColor}22`,
          transition: 'box-shadow 120ms ease-out',
        }}
      >
        <GlassPanel
          className="px-2 py-2.5 sm:px-4 flex flex-col sm:flex-row sm:items-end gap-2.5 sm:gap-1 overflow-hidden"
          style={{
            borderColor: `${mixedColor}${Math.round(borderAlpha * 180).toString(16).padStart(2, '0')}`,
            transition: 'border-color 200ms ease-out',
          }}
        >
          {/* Mobile: dedicated master row so channel toggles never sit beside master slider */}
          <MasterControl
            masterVolume={state.masterVolume}
            isPlaying={state.masterPlaying}
            disabled={!journeyStarted}
            energy={audioLevels.master}
            onVolumeChange={onMasterVolumeChange}
            onTogglePlay={onToggleMasterPlay}
          />

          <div className="hidden sm:block w-px h-16 bg-white/10 mx-0.5 sm:mx-1 self-center shrink-0" />

          <div className="flex flex-1 min-w-0 w-full items-end gap-0 overflow-x-auto scrollbar-hide overscroll-x-contain touch-pan-x pb-0.5 -mx-0.5 px-0.5">
            {BUILTIN_CHANNELS.map((ch, index) => (
              <SoundChannel
                key={ch.id}
                channel={ch}
                state={state.channels[ch.id]}
                energy={audioLevels.channel[index] ?? 0}
                disabled={!journeyStarted}
                onVolumeChange={(v) => onVolumeChange(ch.id, v)}
                onToggle={() => onToggle(ch.id)}
              />
            ))}
            <ForgeChannel onOpen={onOpenForge} className="sm:hidden" />
          </div>

          <div className="hidden sm:block w-px h-16 bg-white/10 mx-1 sm:mx-2 self-center shrink-0" />

          <ForgeChannel onOpen={onOpenForge} className="hidden sm:flex" />
        </GlassPanel>
      </div>
    </div>
  );
}
