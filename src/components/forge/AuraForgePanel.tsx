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
        ? 'Missing or invalid API key — add ELEVENLABS_API_KEY to .env.local'
        : `Generation failed — ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-30 transition-all duration-500 bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+11rem)] sm:bottom-36 ${
        isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{ width: 'min(480px, calc(100vw - 32px))' }}
    >
      <GlassPanel className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wand2 size={16} className="text-violet-400" strokeWidth={1.5} />
            <h2 className="text-sm font-medium text-white/80 tracking-wide">Aura Forge</h2>
            <span className="text-xs text-white/30 ml-1">AI Sound Generation</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors p-1"
            aria-label="Close Aura Forge"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Prompt input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleGenerate(); }}
            placeholder="Describe an ambient sound… (e.g. deep cave drips)"
            maxLength={500}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors"
            aria-label="Sound prompt"
            disabled={loading}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim() || !journeyStarted}
            className="relative px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
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
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-white/30">Accent:</span>
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
