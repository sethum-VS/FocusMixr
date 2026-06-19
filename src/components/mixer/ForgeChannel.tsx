'use client';

import { Wand2 } from 'lucide-react';

interface ForgeChannelProps {
  onOpen: () => void;
}

export function ForgeChannel({ onOpen }: ForgeChannelProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex shrink-0 flex-col items-center justify-center self-center gap-2 sm:gap-3 px-2 py-3 sm:px-3 sm:py-4 w-[52px] sm:min-w-[64px] text-white/40 hover:text-white/80 transition-colors group"
      aria-label="Open Aura Forge — generate custom sounds"
    >
      <div className="transition-all duration-200 group-hover:text-white/80 group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.9)]">
        <Wand2 size={17} strokeWidth={1.5} />
      </div>

      <span className="hidden sm:block text-xs font-medium tracking-wide text-center">
        Forge
      </span>
    </button>
  );
}
