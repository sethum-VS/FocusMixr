'use client';

import { useMemo } from 'react';
import { AudioLevels, MixState } from '@/types';
import {
  buildBlendGradient,
  computeMixedColor,
  getColorContributions,
} from '@/lib/colorMix';

interface BlendPreviewProps {
  state: MixState;
  audioLevels: AudioLevels;
}

export function BlendPreview({ state, audioLevels }: BlendPreviewProps) {
  const contributions = useMemo(
    () => getColorContributions(state, audioLevels),
    [state, audioLevels],
  );
  const mixedColor = useMemo(
    () => computeMixedColor(state, audioLevels),
    [state, audioLevels],
  );
  const gradient = useMemo(
    () => buildBlendGradient(contributions),
    [contributions],
  );

  const energy = audioLevels.master;
  const glowSpread = 6 + energy * 14;
  const fluidEase = 'cubic-bezier(0.4, 0, 0.2, 1)';

  if (!state.journeyStarted) return null;

  return (
    <div
      className="w-full px-1"
      aria-label="Live color blend preview"
      role="img"
    >
      <div className="relative h-2 rounded-full overflow-hidden bg-white/5">
        {/* Flowing source colors */}
        <div
          className="absolute inset-0"
          style={{
            background: gradient,
            opacity: contributions.length > 0 ? 0.85 : 0.35,
            transition: `opacity 400ms ${fluidEase}`,
          }}
        />

        {/* Overlap zones — screen-style luminous merge */}
        {contributions.length > 1 && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${mixedColor}88 0%, transparent 70%)`,
              mixBlendMode: 'screen',
              opacity: 0.5 + energy * 0.35,
              transition: `opacity 300ms ${fluidEase}`,
            }}
          />
        )}

        {/* Center blend bead — the mixed "sound color" */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: contributions.length > 0 ? `${10 + Math.min(contributions.length, 4) * 3}px` : '8px',
            height: contributions.length > 0 ? `${10 + Math.min(contributions.length, 4) * 3}px` : '8px',
            backgroundColor: mixedColor,
            boxShadow: contributions.length > 0
              ? `0 0 ${glowSpread}px ${mixedColor}, 0 0 ${glowSpread * 2}px ${mixedColor}44`
              : 'none',
            transition: `width 350ms ${fluidEase}, height 350ms ${fluidEase}, background-color 350ms ${fluidEase}, box-shadow 300ms ${fluidEase}`,
          }}
        />
      </div>

      {/* Per-channel wells — mirrors shader anchor layout */}
      {contributions.length > 0 && (
        <div className="flex justify-between mt-1 px-0.5" aria-hidden>
          {contributions.map((c) => (
            <div
              key={`${c.label}-${c.color}`}
              className="rounded-full transition-all"
              style={{
                width: `${4 + c.weight * 6}px`,
                height: `${4 + c.weight * 6}px`,
                backgroundColor: c.color,
                boxShadow: `0 0 ${3 + c.weight * 5}px ${c.color}99`,
                opacity: 0.55 + c.weight * 0.45,
                transition: 'width 300ms ease, height 300ms ease, opacity 300ms ease',
              }}
              title={c.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}
