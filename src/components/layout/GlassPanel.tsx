import { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

export function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return (
    <div
      className={`backdrop-blur-3xl bg-black/20 border border-white/10 rounded-3xl ${className}`}
    >
      {children}
    </div>
  );
}
