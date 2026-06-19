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

interface SoundChannelProps {
  channel: BuiltinChannel;
  state: ChannelState;
  disabled?: boolean;
  onVolumeChange: (v: number) => void;
  onToggle: () => void;
}

export function SoundChannel({
  channel,
  state,
  disabled = false,
  onVolumeChange,
  onToggle,
}: SoundChannelProps) {
  const Icon = ICONS[channel.icon] ?? CloudRain;
  const isActive = state.enabled && !disabled;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 sm:gap-3 px-2 py-3 sm:px-3 sm:py-4 w-[52px] sm:min-w-[64px]">
      {/* Vertical slider */}
      <VerticalSlider
        value={state.volume}
        onChange={onVolumeChange}
        accentColor={channel.color}
        disabled={disabled || !state.enabled}
        label={channel.label}
      />

      {/* Icon */}
      <div
        className="transition-all duration-300"
        style={{
          color: isActive ? channel.color : 'rgba(255,255,255,0.3)',
          filter: isActive ? `drop-shadow(0 0 6px ${channel.color}80)` : 'none',
        }}
      >
        <Icon size={18} strokeWidth={1.5} />
      </div>

      {/* Label — icons + toggle aria-labels suffice on narrow screens */}
      <span
        className="hidden sm:block text-xs font-medium tracking-wide transition-colors text-center"
        style={{ color: isActive ? channel.color : 'rgba(255,255,255,0.3)' }}
      >
        {channel.label}
      </span>

      {/* Toggle */}
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
