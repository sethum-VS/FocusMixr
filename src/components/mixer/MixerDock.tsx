'use client';

import { Wand2 } from 'lucide-react';
import { GlassPanel } from '@/components/layout/GlassPanel';
import { SoundChannel } from './SoundChannel';
import { MasterControl } from './MasterControl';
import { BUILTIN_CHANNELS } from '@/lib/sounds';
import { MixState, ChannelId } from '@/types';

interface MixerDockProps {
  state: MixState;
  onVolumeChange: (id: ChannelId, v: number) => void;
  onToggle: (id: ChannelId) => void;
  onMasterVolumeChange: (v: number) => void;
  onToggleMasterPlay: () => void;
  onOpenForge: () => void;
}

export function MixerDock({
  state,
  onVolumeChange,
  onToggle,
  onMasterVolumeChange,
  onToggleMasterPlay,
  onOpenForge,
}: MixerDockProps) {
  const { journeyStarted } = state;

  if (!journeyStarted) return null;

  return (
    <div
      className="fixed z-40 left-1/2 -translate-x-1/2 w-[calc(100vw-24px)] max-w-4xl bottom-[max(1.5rem,env(safe-area-inset-bottom))] transition-all duration-700 opacity-100 translate-y-0"
    >
      <GlassPanel className="px-2 py-2 sm:px-4 flex items-end gap-0 sm:gap-1 overflow-hidden">
        {/* Master control — always visible; channels scroll beside it on narrow screens */}
        <MasterControl
          masterVolume={state.masterVolume}
          isPlaying={state.masterPlaying}
          disabled={!journeyStarted}
          onVolumeChange={onMasterVolumeChange}
          onTogglePlay={onToggleMasterPlay}
        />

        <div className="w-px h-14 sm:h-16 bg-white/10 mx-0.5 sm:mx-1 self-center shrink-0" />

        {/* Built-in channels */}
        <div className="flex flex-1 min-w-0 items-end gap-0 overflow-x-auto scrollbar-hide overscroll-x-contain touch-pan-x pb-0.5">
          {BUILTIN_CHANNELS.map((ch) => (
            <SoundChannel
              key={ch.id}
              channel={ch}
              state={state.channels[ch.id]}
              disabled={!journeyStarted}
              onVolumeChange={(v) => onVolumeChange(ch.id, v)}
              onToggle={() => onToggle(ch.id)}
            />
          ))}
        </div>

        <div className="w-px h-14 sm:h-16 bg-white/10 mx-1 sm:mx-2 self-center shrink-0" />

        {/* Forge button */}
        <button
          onClick={onOpenForge}
          className="flex shrink-0 flex-col items-center gap-1.5 px-2 py-3 sm:px-3 sm:py-4 min-w-[48px] sm:min-w-[56px] text-white/40 hover:text-white/80 transition-colors group"
          aria-label="Open Aura Forge — generate custom sounds"
          title="Aura Forge"
        >
          <div className="h-16 sm:h-24 flex items-center">
            <Wand2
              size={18}
              strokeWidth={1.5}
              className="group-hover:drop-shadow-[0_0_6px_rgba(139,92,246,0.8)] transition-all"
            />
          </div>
          <span className="text-[10px] sm:text-xs tracking-wide">Forge</span>
        </button>
      </GlassPanel>
    </div>
  );
}
