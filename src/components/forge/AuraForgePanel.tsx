'use client';

import { useState, useRef } from 'react';
import { Wand2, X, Loader2 } from 'lucide-react';
import { GlassPanel } from '@/components/layout/GlassPanel';
import { AccentColorPicker } from './AccentColorPicker';
import { CustomSoundCard } from './CustomSoundCard';
import { CustomSound, MixState } from '@/types';
import { MAX_CUSTOM_SOUNDS } from '@/lib/sounds';

interface AuraForgePanelProps {
  state: MixState;
  isOpen: boolean;
  onClose: () => void;
  journeyStarted: boolean;
  onAddCustomSound: (sound: CustomSound) => void;
  onRemoveCustomSound: (id: string) => void;
  onCustomVolumeChange: (id: string, v: number) => void;
  onCustomAccentChange: (id: string, color: string) => void;
  onToggleCustom: (id: string) => void;
}

export function AuraForgePanel({
  state,
  isOpen,
  onClose,
  journeyStarted,
  onAddCustomSound,
  onRemoveCustomSound,
  onCustomVolumeChange,
  onCustomAccentChange,
  onToggleCustom,
}: AuraForgePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [accentColor, setAccentColor] = useState('#a855f7');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bufferCache = useRef<Map<string, ArrayBuffer>>(new Map());

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (state.customSounds.length >= MAX_CUSTOM_SOUNDS) {
      setError(`Maximum ${MAX_CUSTOM_SOUNDS} custom sounds. Delete one to add another.`);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/generate-sound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(body.error || `HTTP ${resp.status}`);
      }

      const arrayBuffer = await resp.arrayBuffer();
      const id = `custom-${Date.now()}`;
      bufferCache.current.set(id, arrayBuffer);

      const sound: CustomSound = {
        id,
        prompt: prompt.trim(),
        accentColor,
        volume: 0.7,
        enabled: true,
        buffer: arrayBuffer,
      };

      onAddCustomSound(sound);
      setPrompt('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setError(msg.includes('key') || msg.includes('401')
        ? 'Aura Forge is unavailable — the server API key is missing or invalid.'
        : `Generation failed — ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="w-full min-w-0 opacity-100 translate-y-0 transition-all duration-500"
      style={{ maxWidth: 'min(480px, calc(100vw - 32px))' }}
    >
      <GlassPanel className="p-4 sm:p-5 max-h-[min(50dvh,calc(100dvh-12rem))] overflow-y-auto overscroll-contain scrollbar-hide min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Wand2 size={16} className="shrink-0 text-violet-400" strokeWidth={1.5} />
            <h2 className="shrink-0 text-sm font-medium text-white/80 tracking-wide">Aura Forge</h2>
            <span className="text-xs text-white/30 sm:ml-1">AI Sound Generation</span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-white/30 hover:text-white/70 transition-colors p-1 -mr-1"
            aria-label="Close Aura Forge"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Prompt input */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch mb-3 min-w-0">
          <input
            type="text"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleGenerate(); }}
            placeholder="Describe an ambient sound… (e.g. deep cave drips)"
            maxLength={500}
            className="w-full min-w-0 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors"
            aria-label="Sound prompt"
            disabled={loading}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim() || !journeyStarted}
            className="relative shrink-0 w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden whitespace-nowrap"
            style={{
              background: loading
                ? 'rgba(139,92,246,0.3)'
                : 'linear-gradient(135deg, rgba(139,92,246,0.6), rgba(59,130,246,0.4))',
              border: '1px solid rgba(139,92,246,0.4)',
              color: 'white',
            }}
            aria-label="Generate sound"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Generate'
            )}
            {loading && (
              <span
                className="absolute inset-0 animate-shimmer"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                }}
              />
            )}
          </button>
        </div>

        {/* Accent picker */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 min-w-0">
          <span className="shrink-0 text-xs text-white/30">Accent:</span>
          <AccentColorPicker value={accentColor} onChange={setAccentColor} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            {error}
          </div>
        )}

        {!journeyStarted && (
          <p className="text-xs text-white/25 text-center mb-2">Start Journey first to enable Forge</p>
        )}

        {journeyStarted && state.customSounds.length >= MAX_CUSTOM_SOUNDS && (
          <p className="text-xs text-amber-300/70 text-center mb-2">
            Custom sound limit reached ({MAX_CUSTOM_SOUNDS}). Delete one to generate another.
          </p>
        )}

        {/* Custom sounds */}
        {state.customSounds.length > 0 && (
          <>
            <div className="h-px bg-white/10 mb-4" />
            <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
              {state.customSounds.map((cs) => (
                <CustomSoundCard
                  key={cs.id}
                  sound={cs}
                  disabled={!journeyStarted}
                  onToggle={() => onToggleCustom(cs.id)}
                  onVolumeChange={(v) => onCustomVolumeChange(cs.id, v)}
                  onAccentChange={(c) => onCustomAccentChange(cs.id, c)}
                  onDelete={() => onRemoveCustomSound(cs.id)}
                />
              ))}
            </div>
          </>
        )}
      </GlassPanel>
    </div>
  );
}
