import { BuiltinChannel, ChannelId } from '@/types';

// Built-in ambient loops in public/sounds/
// - npm run generate:ambient  → ElevenLabs AI loops (requires ELEVENLABS_API_KEY)
// - npm run generate:sounds   → offline ffmpeg procedural fallback
export const BUILTIN_CHANNELS: BuiltinChannel[] = [
  { id: 'rain',     label: 'Rain',     icon: 'CloudRain',  color: '#3b82f6', src: '/sounds/rain.mp3'     },
  { id: 'fire',     label: 'Fire',     icon: 'Flame',      color: '#f97316', src: '/sounds/fire.mp3'     },
  { id: 'coffee',   label: 'Coffee',   icon: 'Coffee',     color: '#78350f', src: '/sounds/coffee.mp3'   },
  { id: 'waves',    label: 'Waves',    icon: 'Waves',      color: '#06b6d4', src: '/sounds/waves.mp3'    },
  { id: 'forest',   label: 'Forest',   icon: 'TreePine',   color: '#22c55e', src: '/sounds/forest.mp3'   },
  { id: 'keyboard', label: 'Keyboard', icon: 'Keyboard',   color: '#e2e8f0', src: '/sounds/keyboard.mp3' },
];

export const MAX_CUSTOM_SOUNDS = 4;

export const ACCENT_PRESETS = [
  '#3b82f6',
  '#f97316',
  '#22c55e',
  '#06b6d4',
  '#a855f7',
  '#ec4899',
] as const;

export const CHANNEL_IDS = BUILTIN_CHANNELS.map((c) => c.id) as ChannelId[];

export function hexToRgbNorm(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}
