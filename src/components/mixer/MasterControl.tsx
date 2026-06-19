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

// 8-segment VU meter — green to red
const VU_COLORS = ['#22c55e', '#22c55e', '#22c55e', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

export function MasterControl({
  masterVolume,
  isPlaying,
  disabled = false,
  energy = 0,
  onVolumeChange,
  onTogglePlay,
}: MasterControlProps) {
  const pulse = isPlaying ? Math.min(1, energy * 1.3) : 0;
  const glowPx = 12 + pulse * 18;
  const glowAlpha = 0.15 + pulse * 0.28;

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3 px-2 py-2 sm:px-3 w-[108px] sm:w-auto sm:min-w-[148px]">
      {/* Play / Pause button */}
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={isPlaying ? 'Pause mix' : 'Play mix'}
        className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-white/10 border border-white/20 text-white/90 hover:bg-white/18 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
        style={{
          boxShadow:
            pulse > 0.05
              ? `0 0 ${glowPx}px rgba(255,255,255,${glowAlpha}), 0 0 ${glowPx * 2}px rgba(255,255,255,${glowAlpha * 0.4})`
              : undefined,
          transition: 'box-shadow 60ms ease-out',
        }}
      >
        {isPlaying ? (
          <Pause size={15} strokeWidth={1.5} />
        ) : (
          <Play size={15} strokeWidth={1.5} />
        )}
      </button>

      {/* Right column: VU meter + volume slider */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {/* VU meter */}
        <div className="flex items-center gap-1" aria-label={`Level: ${Math.round(energy * 100)}%`} aria-hidden>
          <Volume2 size={10} strokeWidth={1.5} className="text-white/35 shrink-0" />
          <div className="flex items-center gap-[2.5px]">
            {VU_COLORS.map((segColor, i) => {
              const threshold = (i + 1) / VU_COLORS.length;
              const lit = isPlaying && energy >= threshold * 0.88;
              return (
                <div
                  key={i}
                  style={{
                    width: '4px',
                    height: '7px',
                    borderRadius: '2px',
                    backgroundColor: lit ? segColor : 'rgba(255,255,255,0.10)',
                    boxShadow: lit ? `0 0 5px ${segColor}cc` : 'none',
                    transition: 'background-color 50ms ease-out, box-shadow 50ms ease-out',
                    opacity: lit ? 1 : 0.45,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Master volume slider */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] tracking-widest uppercase text-white/30">Master</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            disabled={disabled}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Master volume"
            aria-valuenow={Math.round(masterVolume * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
