'use client';

interface HeroSectionProps {
  journeyStarted: boolean;
  onStartJourney: () => void;
}

export function HeroSection({ journeyStarted, onStartJourney }: HeroSectionProps) {
  return (
    <div
      className="fixed inset-0 z-10 flex flex-col items-center justify-center"
      style={{
        opacity: journeyStarted ? 0 : 1,
        transform: journeyStarted
          ? 'translateY(-18px) scale(0.985)'
          : 'translateY(0) scale(1)',
        transition:
          'opacity 1.1s cubic-bezier(0.4, 0, 0.2, 1), transform 1.1s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: journeyStarted ? 'none' : 'auto',
        visibility: journeyStarted ? 'hidden' : 'visible',
      }}
      aria-hidden={journeyStarted}
    >
      {/* Floating blurred orbs — CSS-only, no Three.js overhead */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <div className="hero-orb hero-orb-4" />
        <div className="hero-orb hero-orb-5" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-8 max-w-2xl mx-auto">
        {/* Eyebrow */}
        <p
          className="text-[10px] font-medium tracking-[0.40em] text-white/35 uppercase mb-8 animate-hero-in"
          style={{ animationDelay: '0.05s' }}
        >
          Ambient Sound Mixer
        </p>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl md:text-[82px] text-white leading-[0.92] mb-7 animate-hero-in"
          style={{
            fontFamily: 'var(--font-caslon), serif',
            animationDelay: '0.22s',
          }}
        >
          Shape your
          <br />
          <span className="hero-gradient-text">environment.</span>
        </h1>

        {/* Sub-copy */}
        <p
          className="text-[15px] text-white/40 mb-14 font-light tracking-wide animate-hero-in max-w-xs mx-auto leading-relaxed"
          style={{ animationDelay: '0.40s' }}
        >
          Blend ambient sounds.
          <br />
          Let AI forge new ones.
        </p>

        {/* CTA with animated rings */}
        <div
          className="relative inline-flex items-center justify-center animate-hero-in"
          style={{ animationDelay: '0.58s' }}
        >
          {/* Expanding ring layers */}
          <span className="absolute inset-0 rounded-full border border-white/20 animate-ping-slow pointer-events-none" />
          <span className="absolute -inset-3 rounded-full border border-white/10 animate-ping-slower pointer-events-none" />
          <span className="absolute -inset-6 rounded-full border border-white/05 animate-ping-slowest pointer-events-none" />

          <button
            onClick={(e) => {
              // Blur before the parent gains aria-hidden to avoid the browser
              // warning "aria-hidden on an element with a focused descendant".
              (e.currentTarget as HTMLButtonElement).blur();
              onStartJourney();
            }}
            className="relative pointer-events-auto px-12 py-[14px] rounded-full bg-white/10 hover:bg-white/18 border border-white/28 text-white text-[13px] font-medium tracking-[0.20em] uppercase backdrop-blur-md transition-all duration-300 hover:scale-[1.04] active:scale-95 hover:border-white/50 overflow-hidden group"
            aria-label="Start your ambient sound journey"
          >
            <span className="relative z-10">Begin Journey</span>
            {/* Shimmer sweep */}
            <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/18 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            </span>
          </button>
        </div>

        {/* Hint text at bottom */}
        <p
          className="mt-16 text-[10px] tracking-[0.25em] text-white/20 uppercase animate-hero-in"
          style={{ animationDelay: '0.80s' }}
        >
          Six layers · AI synthesis · No account needed
        </p>
      </div>
    </div>
  );
}
