'use client';

import { useReducer, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { MixState, MixAction, ChannelId, CustomSound } from '@/types';
import { CHANNEL_IDS, MAX_CUSTOM_SOUNDS } from '@/lib/sounds';
import {
  deleteCustomSoundBuffer,
  loadCustomSoundBuffers,
  saveCustomSoundBuffer,
} from '@/lib/customSoundStorage';

const STORAGE_KEY = 'focusmixr-mix-v1';

function buildDefaultChannels(): MixState['channels'] {
  return Object.fromEntries(
    CHANNEL_IDS.map((id) => [id, { volume: 0.7, enabled: false }])
  ) as MixState['channels'];
}

const defaultState: MixState = {
  journeyStarted: false,
  channels: buildDefaultChannels(),
  customSounds: [],
  masterVolume: 0.85,
  masterPlaying: true,
};

function reducer(state: MixState, action: MixAction): MixState {
  switch (action.type) {
    case 'START_JOURNEY':
      return { ...state, journeyStarted: true };

    case 'SET_VOLUME':
      return {
        ...state,
        channels: {
          ...state.channels,
          [action.id]: { ...state.channels[action.id], volume: action.volume },
        },
      };

    case 'TOGGLE_CHANNEL':
      return {
        ...state,
        channels: {
          ...state.channels,
          [action.id]: {
            ...state.channels[action.id],
            enabled: !state.channels[action.id].enabled,
          },
        },
      };

    case 'SET_MASTER_VOLUME':
      return { ...state, masterVolume: action.volume };

    case 'TOGGLE_MASTER_PLAY':
      return { ...state, masterPlaying: !state.masterPlaying };

    case 'ADD_CUSTOM_SOUND':
      if (state.customSounds.length >= MAX_CUSTOM_SOUNDS) return state;
      return { ...state, customSounds: [...state.customSounds, action.sound] };

    case 'REMOVE_CUSTOM_SOUND':
      return {
        ...state,
        customSounds: state.customSounds.filter((s) => s.id !== action.id),
      };

    case 'SET_CUSTOM_VOLUME':
      return {
        ...state,
        customSounds: state.customSounds.map((s) =>
          s.id === action.id ? { ...s, volume: action.volume } : s
        ),
      };

    case 'SET_CUSTOM_ACCENT':
      return {
        ...state,
        customSounds: state.customSounds.map((s) =>
          s.id === action.id ? { ...s, accentColor: action.accentColor } : s
        ),
      };

    case 'TOGGLE_CUSTOM':
      return {
        ...state,
        customSounds: state.customSounds.map((s) =>
          s.id === action.id ? { ...s, enabled: !s.enabled } : s
        ),
      };

    case 'HYDRATE_CUSTOM_BUFFERS':
      return {
        ...state,
        customSounds: state.customSounds.map((s) =>
          action.buffers[s.id] ? { ...s, buffer: action.buffers[s.id] } : s
        ),
      };

    case 'RESTORE_PERSISTED':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

interface PersistedState {
  channels: Record<ChannelId, { volume: number; enabled: boolean }>;
  customSounds: Array<{ id: string; prompt: string; accentColor: string; volume: number; enabled: boolean }>;
  masterVolume: number;
  masterPlaying?: boolean;
}

function loadFromStorage(): Partial<MixState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: PersistedState = JSON.parse(raw);
    return {
      channels: { ...buildDefaultChannels(), ...parsed.channels },
      customSounds: (parsed.customSounds || []).map((s) => ({ ...s, buffer: undefined })),
      masterVolume: parsed.masterVolume ?? 0.85,
      masterPlaying: parsed.masterPlaying ?? true,
    };
  } catch {
    return {};
  }
}

export function useMixState() {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Restore localStorage after mount to avoid SSR/client hydration mismatch
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!isClient || restoredRef.current) return;
    restoredRef.current = true;

    const persisted = loadFromStorage();
    if (Object.keys(persisted).length > 0) {
      dispatch({ type: 'RESTORE_PERSISTED', payload: persisted });
    }
  }, [isClient]);

  // Hydrate custom sound buffers from IndexedDB after persisted metadata loads
  const loadedBufferIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isClient) return;

    const ids = state.customSounds
      .filter((s) => !s.buffer && !loadedBufferIdsRef.current.has(s.id))
      .map((s) => s.id);
    if (ids.length === 0) return;

    ids.forEach((id) => loadedBufferIdsRef.current.add(id));

    let cancelled = false;
    loadCustomSoundBuffers(ids)
      .then((buffers) => {
        if (!cancelled && Object.keys(buffers).length > 0) {
          dispatch({ type: 'HYDRATE_CUSTOM_BUFFERS', buffers });
        }
      })
      .catch((err) => console.warn('IndexedDB hydrate failed', err));

    return () => { cancelled = true; };
  }, [isClient, state.customSounds]);

  useEffect(() => {
    if (!isClient || typeof window === 'undefined') return;
    const toSave: PersistedState = {
      channels: state.channels,
      customSounds: state.customSounds.map(({ id, prompt, accentColor, volume, enabled }) => ({
        id, prompt, accentColor, volume, enabled,
      })),
      masterVolume: state.masterVolume,
      masterPlaying: state.masterPlaying,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [isClient, state.channels, state.customSounds, state.masterVolume, state.masterPlaying]);

  // Persist new custom sound buffers to IndexedDB
  const savedBuffersRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    for (const cs of state.customSounds) {
      if (cs.buffer && !savedBuffersRef.current.has(cs.id)) {
        savedBuffersRef.current.add(cs.id);
        saveCustomSoundBuffer(cs.id, cs.buffer).catch((err) =>
          console.warn('IndexedDB save failed', cs.id, err)
        );
      }
    }
  }, [state.customSounds]);

  const startJourney = useCallback(() => dispatch({ type: 'START_JOURNEY' }), []);
  const setVolume = useCallback((id: ChannelId, volume: number) =>
    dispatch({ type: 'SET_VOLUME', id, volume }), []);
  const toggleChannel = useCallback((id: ChannelId) =>
    dispatch({ type: 'TOGGLE_CHANNEL', id }), []);
  const setMasterVolume = useCallback((volume: number) =>
    dispatch({ type: 'SET_MASTER_VOLUME', volume }), []);
  const toggleMasterPlay = useCallback(() =>
    dispatch({ type: 'TOGGLE_MASTER_PLAY' }), []);
  const addCustomSound = useCallback((sound: CustomSound) =>
    dispatch({ type: 'ADD_CUSTOM_SOUND', sound }), []);
  const removeCustomSound = useCallback((id: string) => {
    savedBuffersRef.current.delete(id);
    deleteCustomSoundBuffer(id).catch((err) =>
      console.warn('IndexedDB delete failed', id, err)
    );
    dispatch({ type: 'REMOVE_CUSTOM_SOUND', id });
  }, []);
  const setCustomVolume = useCallback((id: string, volume: number) =>
    dispatch({ type: 'SET_CUSTOM_VOLUME', id, volume }), []);
  const setCustomAccent = useCallback((id: string, accentColor: string) =>
    dispatch({ type: 'SET_CUSTOM_ACCENT', id, accentColor }), []);
  const toggleCustom = useCallback((id: string) =>
    dispatch({ type: 'TOGGLE_CUSTOM', id }), []);

  return {
    state,
    startJourney,
    setVolume,
    toggleChannel,
    setMasterVolume,
    toggleMasterPlay,
    addCustomSound,
    removeCustomSound,
    setCustomVolume,
    setCustomAccent,
    toggleCustom,
  };
}
