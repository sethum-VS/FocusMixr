'use client';

interface HeroSectionProps {
  journeyStarted: boolean;
  onStartJourney: () => void;
}

export function HeroSection({ journeyStarted, onStartJourney }: HeroSectionProps) {
  return (
    <div
      className="fixed inset-0 z-10 flex flex-col items-center justify-center transition-all duration-1200"
      style={{
        opacity: journeyStarted ? 0 : 1,
        transform: journeyStarted ? 'translateY(-24px)' : 'translateY(0)',
        transitionDuration: '1.2s',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: journeyStarted ? 'none' : 'auto',
        visibility: journeyStarted ? 'hidden' : 'visible',
      }}
      aria-hidden={journeyStarted}
    >
      <div className="text-center px-8 max-w-2xl">
        <p className="text-xs font-medium tracking-[0.3em] text-white/40 uppercase mb-6">
          Ambient Sound Mixer
        </p>
        <h1
          className="text-4xl sm:text-5xl md:text-7xl text-white/90 leading-tight mb-4"
          style={{ fontFamily: 'var(--font-caslon), serif' }}
        >
          Shape your<br />environment.
        </h1>
        <p className="text-base text-white/40 mb-12 font-light tracking-wide">
          Blend ambient sounds. Let AI forge new ones.
        </p>

        <button
          onClick={onStartJourney}
          className="pointer-events-auto px-10 py-4 rounded-full bg-white/10 hover:bg-white/18 border border-white/25 text-white text-base font-medium backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95 animate-pulse-slow shadow-lg"
          aria-label="Start your ambient sound journey"
        >
          Start Journey
        </button>
      </div>
    </div>
  );
}
