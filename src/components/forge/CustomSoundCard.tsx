'use client';

import { Trash2 } from 'lucide-react';
import { CustomSound } from '@/types';
import { VerticalSlider } from '@/components/mixer/VerticalSlider';
import { SoundToggle } from '@/components/mixer/SoundToggle';
import { AccentColorPicker } from './AccentColorPicker';

interface CustomSoundCardProps {
  sound: CustomSound;
  disabled?: boolean;
  onToggle: () => void;
  onVolumeChange: (v: number) => void;
  onAccentChange: (color: string) => void;
  onDelete: () => void;
}

export function CustomSoundCard({
  sound,
  disabled = false,
  onToggle,
  onVolumeChange,
  onAccentChange,
  onDelete,
}: CustomSoundCardProps) {
  const promptPreview = sound.prompt.length > 28 ? sound.prompt.slice(0, 28) + '…' : sound.prompt;

  return (
    <div className="flex flex-col items-center gap-2 px-3 py-3 min-w-[72px]">
      {/* Accent dot */}
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: sound.accentColor, boxShadow: `0 0 6px ${sound.accentColor}` }}
      />

      {/* Slider */}
      <VerticalSlider
        value={sound.volume}
        onChange={onVolumeChange}
        accentColor={sound.accentColor}
        disabled={disabled || !sound.enabled}
        label={sound.prompt}
      />

      {/* Prompt label */}
      <span className="text-xs text-white/40 text-center leading-tight max-w-[64px]" title={sound.prompt}>
        {promptPreview}
      </span>

      {/* Toggle */}
      <SoundToggle
        enabled={sound.enabled}
        onToggle={onToggle}
        accentColor={sound.accentColor}
        disabled={disabled}
        label={sound.prompt}
      />

      {/* Accent picker */}
      <AccentColorPicker value={sound.accentColor} onChange={onAccentChange} />

      {/* Delete */}
      <button
        onClick={onDelete}
        className="text-white/20 hover:text-red-400 transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label={`Delete sound: ${sound.prompt}`}
      >
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
