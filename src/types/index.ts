export type ChannelId = 'rain' | 'fire' | 'coffee' | 'waves' | 'forest' | 'keyboard';

export interface BuiltinChannel {
  id: ChannelId;
  label: string;
  icon: string;
  color: string;
  src: string;
}

export interface ChannelState {
  volume: number;
  enabled: boolean;
}

export interface CustomSound {
  id: string;
  prompt: string;
  accentColor: string;
  volume: number;
  enabled: boolean;
  buffer?: ArrayBuffer;
}

export interface MixState {
  journeyStarted: boolean;
  channels: Record<ChannelId, ChannelState>;
  customSounds: CustomSound[];
  masterVolume: number;
  masterPlaying: boolean;
}

export type MixAction =
  | { type: 'START_JOURNEY' }
  | { type: 'SET_VOLUME'; id: ChannelId; volume: number }
  | { type: 'TOGGLE_CHANNEL'; id: ChannelId }
  | { type: 'SET_MASTER_VOLUME'; volume: number }
  | { type: 'TOGGLE_MASTER_PLAY' }
  | { type: 'ADD_CUSTOM_SOUND'; sound: CustomSound }
  | { type: 'REMOVE_CUSTOM_SOUND'; id: string }
  | { type: 'SET_CUSTOM_VOLUME'; id: string; volume: number }
  | { type: 'SET_CUSTOM_ACCENT'; id: string; accentColor: string }
  | { type: 'TOGGLE_CUSTOM'; id: string }
  | { type: 'HYDRATE_CUSTOM_BUFFERS'; buffers: Record<string, ArrayBuffer> }
  | { type: 'RESTORE_PERSISTED'; payload: Partial<MixState> };

export interface ShaderUniforms {
  channelColors: number[];
  channelVolumes: number[];
  customColors: number[];
  customVolumes: number[];
  journeyProgress: number;
}
