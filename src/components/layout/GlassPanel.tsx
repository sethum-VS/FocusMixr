import { CSSProperties, ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GlassPanel({ children, className = '', style }: GlassPanelProps) {
  return (
    <div
      className={`backdrop-blur-3xl bg-black/20 border border-white/10 rounded-3xl ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
