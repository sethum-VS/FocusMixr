'use client';

import { Pause, Play, Volume2 } from 'lucide-react';

interface MasterControlProps {
  masterVolume: number;
  isPlaying: boolean;
  disabled?: boolean;
  energy?: number;
  onVolumeChange: (v: number) => void;
  onTogglePlay: () => void;
}

export function MasterControl({
  masterVolume,
  isPlaying,
  disabled = false,
  energy = 0,
  onVolumeChange,
  onTogglePlay,
}: MasterControlProps) {
  const pulse = isPlaying ? Math.min(1, energy * 1.2) : 0;

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3 px-2 py-2 sm:px-3 w-[108px] sm:w-auto sm:min-w-[140px]">
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={isPlaying ? 'Pause mix' : 'Play mix'}
        className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-white/10 border border-white/20 text-white/90 hover:bg-white/18 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
        style={{
          boxShadow: pulse > 0.05 ? `0 0 ${12 + pulse * 16}px rgba(255,255,255,${0.15 + pulse * 0.25})` : undefined,
        }}
      >
        {isPlaying ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
      </button>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-white/40">
          <Volume2 size={12} strokeWidth={1.5} />
          <span className="text-[10px] tracking-widest uppercase">Master</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          disabled={disabled}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-full h-1 accent-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Master volume"
          aria-valuenow={Math.round(masterVolume * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
