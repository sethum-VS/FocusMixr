'use client';

import { useSyncExternalStore } from 'react';

interface VerticalSliderProps {
  value: number;
  onChange: (v: number) => void;
  accentColor?: string;
  disabled?: boolean;
  label: string;
  energy?: number;
}

export function VerticalSlider({
  value,
  onChange,
  accentColor = '#ffffff',
  disabled = false,
  label,
  energy = 0,
}: VerticalSliderProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const fillPercent = Math.round(value * 100);
  const pulse = disabled ? 0 : Math.min(1, energy * 0.85);
  const glowSpread = 4 + pulse * 8;
  const fluidEase = 'cubic-bezier(0.4, 0, 0.2, 1)';

  return (
    <div className="relative flex flex-col items-center h-20 sm:h-24">
      {/* Track */}
      <div className="relative w-1 h-full rounded-full bg-white/10">
        {/* Fill bar */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{
            height: `${fillPercent}%`,
            backgroundColor: accentColor,
            opacity: disabled ? 0.3 : 0.75 + pulse * 0.25,
            boxShadow: disabled
              ? 'none'
              : `0 0 ${glowSpread}px ${accentColor}${Math.round(40 + pulse * 50).toString(16).padStart(2, '0')}`,
            transform: `scaleX(${1 + pulse * 0.08})`,
            transition: pulse > 0.05
              ? `height 300ms ${fluidEase}, opacity 300ms ${fluidEase}, box-shadow 300ms ${fluidEase}, transform 300ms ${fluidEase}`
              : 'height 350ms ease-out, opacity 350ms ease-out',
          }}
        />
      </div>

      {/* Native range input — client-only to avoid SSR attribute mismatch */}
      {mounted && (
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          width: '100%',
          height: '100%',
        }}
        aria-label={`${label} volume`}
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-disabled={disabled}
      />
      )}
    </div>
  );
}
