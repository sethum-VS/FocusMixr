'use client';

export function TopNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span
          className="text-xl text-white/90 tracking-tight"
          style={{ fontFamily: 'var(--font-caslon), serif' }}
        >
          FocusMixr
        </span>
      </div>

      {/* Nav — mixer only; library/presets hidden until implemented */}
      <div className="hidden sm:flex items-center gap-6">
        <span className="text-xs font-medium tracking-widest text-white/80">
          MIXER
        </span>
      </div>

      <span className="text-xs font-medium tracking-widest text-white/80 sm:hidden">
        MIXER
      </span>
    </nav>
  );
}
