'use client';

import { useEffect, useState } from 'react';

interface VerticalSliderProps {
  value: number;
  onChange: (v: number) => void;
  accentColor?: string;
  disabled?: boolean;
  label: string;
}

export function VerticalSlider({
  value,
  onChange,
  accentColor = '#ffffff',
  disabled = false,
  label,
}: VerticalSliderProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fillPercent = Math.round(value * 100);

  return (
    <div className="relative flex flex-col items-center h-20 sm:h-24">
      {/* Track */}
      <div className="relative w-1 h-full rounded-full bg-white/10">
        {/* Fill bar */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
          style={{
            height: `${fillPercent}%`,
            backgroundColor: accentColor,
            opacity: disabled ? 0.3 : 0.85,
            boxShadow: disabled ? 'none' : `0 0 6px ${accentColor}60`,
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
