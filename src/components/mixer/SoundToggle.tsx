'use client';

interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
  accentColor?: string;
  disabled?: boolean;
  label: string;
  className?: string;
}

export function SoundToggle({
  enabled,
  onToggle,
  accentColor = '#ffffff',
  disabled = false,
  label,
  className = '',
}: SoundToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${label}`}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onToggle}
      className={`relative flex items-center justify-center w-10 h-5 rounded-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50 before:absolute before:-inset-3 before:content-[''] ${className}`}
      style={{
        backgroundColor: enabled ? accentColor : 'rgba(255,255,255,0.08)',
        boxShadow: enabled ? `0 0 10px ${accentColor}50` : 'none',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span
        className="relative z-10 w-3 h-3 rounded-full bg-white transition-all duration-200"
        style={{
          transform: enabled ? 'translateX(8px)' : 'translateX(-8px)',
          opacity: enabled ? 1 : 0.6,
        }}
      />
    </button>
  );
}
