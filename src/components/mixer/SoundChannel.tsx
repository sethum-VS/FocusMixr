'use client';

import {
  CloudRain, Flame, Coffee, Waves, TreePine, Keyboard,
  type LucideIcon,
} from 'lucide-react';
import { BuiltinChannel, ChannelState } from '@/types';
import { VerticalSlider } from './VerticalSlider';
import { SoundToggle } from './SoundToggle';

const ICONS: Record<string, LucideIcon> = {
  CloudRain,
  Flame,
  Coffee,
  Waves,
  TreePine,
  Keyboard,
};

// Relative heights for the four EQ bars — staggered so they feel alive
const EQ_SCALES = [0.72, 1.0, 0.88, 0.64];

interface SoundChannelProps {
  channel: BuiltinChannel;
  state: ChannelState;
  energy?: number;
  disabled?: boolean;
  onVolumeChange: (v: number) => void;
  onToggle: () => void;
}

export function SoundChannel({
  channel,
  state,
  energy = 0,
  disabled = false,
  onVolumeChange,
  onToggle,
}: SoundChannelProps) {
  const Icon = ICONS[channel.icon] ?? CloudRain;
  const isActive = state.enabled && !disabled;
  const pulse = isActive ? Math.min(1, energy * 0.9) : 0;
  const fluidEase = 'cubic-bezier(0.4, 0, 0.2, 1)';

  return (
    <div className="flex shrink-0 flex-col items-center gap-1 sm:gap-3 px-2 py-1.5 sm:px-3 sm:py-4 w-[68px] sm:min-w-[64px]">
      <VerticalSlider
        value={state.volume}
        onChange={onVolumeChange}
        accentColor={channel.color}
        disabled={disabled || !state.enabled}
        label={channel.label}
        energy={energy}
      />

      {/* Mini EQ — desktop only; saves vertical space on mobile */}
      <div className="hidden sm:flex items-end gap-[2px] h-4 w-fit" aria-hidden>
        {EQ_SCALES.map((scale, i) => {
          const barH = isActive
            ? Math.max(2, energy * scale * 16)
            : 2;
          return (
            <div
              key={i}
              style={{
                width: '3px',
                height: `${barH}px`,
                minHeight: '2px',
                borderRadius: '1.5px',
                backgroundColor: isActive ? channel.color : 'rgba(255,255,255,0.10)',
                boxShadow:
                  isActive && energy > 0.08
                    ? `0 0 4px ${channel.color}99`
                    : 'none',
                transition: isActive
                  ? `height 320ms ${fluidEase}, box-shadow 320ms ${fluidEase}`
                  : 'height 400ms ease-out',
              }}
            />
          );
        })}
      </div>

      {/* Channel icon — tap target groups with toggle below */}
      <button
        type="button"
        role="switch"
        aria-checked={state.enabled}
        onClick={onToggle}
        disabled={disabled}
        aria-label={`Toggle ${channel.label}`}
        className="sm:hidden flex items-center justify-center min-h-[36px] min-w-[36px] rounded-xl transition-all disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
        style={{
          color: isActive ? channel.color : 'rgba(255,255,255,0.28)',
          backgroundColor: isActive ? `${channel.color}18` : 'rgba(255,255,255,0.04)',
          filter: isActive
            ? `drop-shadow(0 0 ${4 + pulse * 6}px ${channel.color}${Math.round(50 + pulse * 40).toString(16).padStart(2, '0')})`
            : 'none',
          transform: `scale(${1 + pulse * 0.05})`,
        }}
      >
        <Icon size={18} strokeWidth={1.5} />
      </button>

      <div
        className="hidden sm:block transition-all"
        style={{
          transitionDuration: '280ms',
          transitionTimingFunction: fluidEase,
          color: isActive ? channel.color : 'rgba(255,255,255,0.28)',
          filter: isActive
            ? `drop-shadow(0 0 ${4 + pulse * 6}px ${channel.color}${Math.round(50 + pulse * 40).toString(16).padStart(2, '0')})`
            : 'none',
          transform: `scale(${1 + pulse * 0.05})`,
        }}
      >
        <Icon size={17} strokeWidth={1.5} />
      </div>

      <span
        className="text-[10px] sm:text-xs font-medium tracking-wide transition-colors text-center leading-tight max-w-[64px] truncate"
        style={{ color: isActive ? channel.color : 'rgba(255,255,255,0.28)' }}
      >
        {channel.label}
      </span>

      <SoundToggle
        enabled={state.enabled}
        onToggle={onToggle}
        accentColor={channel.color}
        disabled={disabled}
        label={channel.label}
        className="hidden sm:flex"
      />
    </div>
  );
}
