import { AudioLevels, MixState, ShaderUniforms } from '@/types';
import { BUILTIN_CHANNELS } from '@/lib/sounds';

export interface ColorContribution {
  color: string;
  weight: number;
  label: string;
}

function rgbNormToHex(r: number, g: number, b: number): string {
  const toByte = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

function driveWeight(volume: number, energy = 0): number {
  if (volume <= 0.001) return 0;
  const drive = Math.min(1, volume * (0.72 + energy * 0.16));
  return drive * drive;
}

/** Weighted RGB mix — mirrors shader channelTint accumulation. */
export function computeMixedColorFromUniforms(uniforms: ShaderUniforms): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;

  for (let i = 0; i < 6; i++) {
    const w = driveWeight(
      uniforms.channelVolumes[i] ?? 0,
      uniforms.channelEnergy[i] ?? 0,
    );
    if (w > 0.0001) {
      r += (uniforms.channelColors[i * 3] ?? 0) * w;
      g += (uniforms.channelColors[i * 3 + 1] ?? 0) * w;
      b += (uniforms.channelColors[i * 3 + 2] ?? 0) * w;
      total += w;
    }
  }

  for (let i = 0; i < 4; i++) {
    const w = driveWeight(
      uniforms.customVolumes[i] ?? 0,
      uniforms.customEnergy[i] ?? 0,
    );
    if (w > 0.0001) {
      r += (uniforms.customColors[i * 3] ?? 0) * w;
      g += (uniforms.customColors[i * 3 + 1] ?? 0) * w;
      b += (uniforms.customColors[i * 3 + 2] ?? 0) * w;
      total += w;
    }
  }

  if (total < 0.0001) return '#1a2744';
  return rgbNormToHex(r / total, g / total, b / total);
}

/** Active channel contributions for blend preview UI. */
export function getColorContributions(
  state: MixState,
  audioLevels: AudioLevels,
): ColorContribution[] {
  const out: ColorContribution[] = [];

  BUILTIN_CHANNELS.forEach((ch, i) => {
    const chState = state.channels[ch.id];
    if (!chState.enabled || chState.volume <= 0.001) return;
    const w = driveWeight(chState.volume, audioLevels.channel[i] ?? 0);
    if (w > 0.01) out.push({ color: ch.color, weight: w, label: ch.label });
  });

  state.customSounds.forEach((cs, i) => {
    if (!cs.enabled || cs.volume <= 0.001) return;
    const w = driveWeight(cs.volume, audioLevels.custom[i] ?? 0);
    if (w > 0.01) {
      out.push({
        color: cs.accentColor,
        weight: w,
        label: cs.prompt.slice(0, 12) || 'Custom',
      });
    }
  });

  return out;
}

export function computeMixedColor(
  state: MixState,
  audioLevels: AudioLevels,
): string {
  const contributions = getColorContributions(state, audioLevels);
  if (contributions.length === 0) return '#1a2744';

  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;

  for (const c of contributions) {
    const hex = c.color.replace('#', '');
    const cr = parseInt(hex.slice(0, 2), 16) / 255;
    const cg = parseInt(hex.slice(2, 4), 16) / 255;
    const cb = parseInt(hex.slice(4, 6), 16) / 255;
    r += cr * c.weight;
    g += cg * c.weight;
    b += cb * c.weight;
    total += c.weight;
  }

  return rgbNormToHex(r / total, g / total, b / total);
}

/** CSS linear-gradient showing how active colors flow together. */
export function buildBlendGradient(contributions: ColorContribution[]): string {
  if (contributions.length === 0) {
    return 'linear-gradient(90deg, #1a2744 0%, #0f172a 50%, #1a2744 100%)';
  }
  if (contributions.length === 1) {
    const c = contributions[0].color;
    return `linear-gradient(90deg, ${c}33 0%, ${c} 50%, ${c}33 100%)`;
  }

  const total = contributions.reduce((s, c) => s + c.weight, 0);
  let cursor = 0;
  const stops: string[] = [];

  for (const c of contributions) {
    const share = (c.weight / total) * 100;
    const mid = cursor + share * 0.5;
    stops.push(`${c.color}00 ${cursor.toFixed(1)}%`);
    stops.push(`${c.color} ${mid.toFixed(1)}%`);
    cursor += share;
  }
  stops.push(`${contributions[contributions.length - 1].color}00 100%`);

  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
