'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';

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

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const fillPercent = Math.round(value * 100);
  const pulse = disabled ? 0 : Math.min(1, energy * 0.85);
  const glowSpread = 4 + pulse * 8;
  const fluidEase = 'cubic-bezier(0.4, 0, 0.2, 1)';

  const valueFromClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const { top, height } = track.getBoundingClientRect();
      if (height <= 0) return value;
      const ratio = 1 - (clientY - top) / height;
      return Math.min(1, Math.max(0, ratio));
    },
    [value],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      onChange(valueFromClientY(e.clientY));
    },
    [disabled, onChange, valueFromClientY],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || disabled) return;
      onChange(valueFromClientY(e.clientY));
    },
    [disabled, onChange, valueFromClientY],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const step = e.shiftKey ? 0.1 : 0.02;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        onChange(Math.min(1, value + step));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        onChange(Math.max(0, value - step));
      } else if (e.key === 'Home') {
        e.preventDefault();
        onChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onChange(1);
      }
    },
    [disabled, onChange, value],
  );

  if (!mounted) {
    return (
      <div className="relative flex flex-col items-center justify-center h-[88px] sm:h-24 w-12 sm:w-11 shrink-0" aria-hidden />
    );
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${label} volume`}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-disabled={disabled}
      className="relative flex flex-col items-center justify-center h-[88px] sm:h-24 w-12 sm:w-11 shrink-0 touch-none select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50 focus-visible:outline-offset-2 rounded-xl sm:rounded-lg disabled:cursor-not-allowed"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      {/* Track — wider on mobile for visibility and easier dragging */}
      <div className="relative w-2 sm:w-1 h-full rounded-full bg-white/10 pointer-events-none ring-1 ring-inset ring-white/5">
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
        {/* Mobile thumb — shows grab point along the track */}
        {!disabled && (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none sm:hidden"
            style={{
              bottom: `calc(${fillPercent}% - 6px)`,
              width: '14px',
              height: '14px',
              backgroundColor: accentColor,
              boxShadow: `0 0 8px ${accentColor}aa, 0 0 0 2px rgba(255,255,255,0.85)`,
              transition: 'bottom 350ms ease-out',
            }}
          />
        )}
      </div>
    </div>
  );
}
