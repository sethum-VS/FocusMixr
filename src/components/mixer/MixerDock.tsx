'use client';

import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layout/GlassPanel';
import { SoundChannel } from './SoundChannel';
import { ForgeChannel } from './ForgeChannel';
import { MasterControl } from './MasterControl';
import { BUILTIN_CHANNELS } from '@/lib/sounds';
import { MixState, ChannelId, AudioLevels } from '@/types';

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

  if (!journeyStarted) return null;

  const energy = audioLevels.master;
  // Dynamic glow intensity scales with master energy
  const glowPx = energy * 28;
  const glowAlpha = 0.08 + energy * 0.18;
  const borderAlpha = 0.10 + energy * 0.22;

  return (
    <div
      className="fixed z-40 left-1/2 w-[calc(100vw-24px)] max-w-4xl bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
      style={{
        transform: visible
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.65s ease',
      }}
    >
      {/* Energy-reactive outer glow wrapper */}
      <div
        style={{
          borderRadius: '1.5rem',
          boxShadow: energy > 0.04
            ? `0 0 ${glowPx}px rgba(255,255,255,${glowAlpha}), 0 ${glowPx * 0.5}px ${glowPx * 1.5}px rgba(0,0,0,0.5)`
            : '0 8px 32px rgba(0,0,0,0.5)',
          transition: 'box-shadow 80ms ease-out',
        }}
      >
        <GlassPanel
          className="px-2 py-2 sm:px-4 flex items-end gap-0 sm:gap-1 overflow-hidden"
          style={{
            borderColor: `rgba(255,255,255,${borderAlpha})`,
          }}
        >
          <MasterControl
            masterVolume={state.masterVolume}
            isPlaying={state.masterPlaying}
            disabled={!journeyStarted}
            energy={audioLevels.master}
            onVolumeChange={onMasterVolumeChange}
            onTogglePlay={onToggleMasterPlay}
          />

          <div className="w-px h-14 sm:h-16 bg-white/10 mx-0.5 sm:mx-1 self-center shrink-0" />

          <div className="flex flex-1 min-w-0 items-end gap-0 overflow-x-auto scrollbar-hide overscroll-x-contain touch-pan-x pb-0.5">
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
          </div>

          <div className="w-px h-14 sm:h-16 bg-white/10 mx-1 sm:mx-2 self-center shrink-0" />

          <ForgeChannel onOpen={onOpenForge} />
        </GlassPanel>
      </div>
    </div>
  );
}
