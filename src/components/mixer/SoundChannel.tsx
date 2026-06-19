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
  const pulse = isActive ? Math.min(1, energy * 1.5) : 0;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 sm:gap-3 px-2 py-3 sm:px-3 sm:py-4 w-[52px] sm:min-w-[64px]">
      <VerticalSlider
        value={state.volume}
        onChange={onVolumeChange}
        accentColor={channel.color}
        disabled={disabled || !state.enabled}
        label={channel.label}
        energy={energy}
      />

      {/* Mini 4-bar EQ visualizer — bounces with audio energy */}
      <div className="flex items-end gap-[2px] h-4 w-fit" aria-hidden>
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
                  ? 'height 45ms ease-out, box-shadow 45ms ease-out'
                  : 'height 120ms ease-out',
              }}
            />
          );
        })}
      </div>

      {/* Channel icon */}
      <div
        className="transition-all"
        style={{
          transitionDuration: '60ms',
          color: isActive ? channel.color : 'rgba(255,255,255,0.28)',
          filter: isActive
            ? `drop-shadow(0 0 ${5 + pulse * 12}px ${channel.color}${Math.round(70 + pulse * 90).toString(16).padStart(2, '0')})`
            : 'none',
          transform: `scale(${1 + pulse * 0.14})`,
        }}
      >
        <Icon size={17} strokeWidth={1.5} />
      </div>

      <span
        className="hidden sm:block text-xs font-medium tracking-wide transition-colors text-center"
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
      />
    </div>
  );
}
