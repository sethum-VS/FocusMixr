# FocusMixr — Design System

## Typography

| Role         | Font               | Size | Weight | Tracking |
|--------------|--------------------|------|--------|----------|
| Display/Mega | Libre Caslon Text  | 64px | 400    | tight    |
| Display      | Libre Caslon Text  | 48px | 400    | tight    |
| Label        | DM Sans            | 15px | 400    | normal   |
| Caption      | DM Sans            | 12px | 400    | wide     |
| Nav/Mono     | DM Sans            | 11px | 500    | 0.3em    |

## Color Tokens

```css
/* FocusMixr channel colors */
--color-focusmixr-rain:     #3b82f6;  /* Tailwind blue-500 */
--color-focusmixr-fire:     #f97316;  /* Tailwind orange-500 */
--color-focusmixr-coffee:   #78350f;  /* Tailwind amber-900 */
--color-focusmixr-ocean:    #06b6d4;  /* Tailwind cyan-500 */
--color-focusmixr-forest:   #22c55e;  /* Tailwind green-500 */
--color-focusmixr-keyboard: #e2e8f0;  /* Tailwind slate-200 */

/* UI surfaces */
--color-surface-glass:  rgba(24, 24, 27, 0.4);
--color-border-glass:   rgba(255, 255, 255, 0.1);
```

## Glass Panel Spec

```css
backdrop-filter: blur(24px);
background: rgba(24, 24, 27, 0.4);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 1.5rem; /* 24px */
```

Tailwind equivalent: `backdrop-blur-3xl bg-black/20 border border-white/10 rounded-3xl`

## Z-Index Stack

| Layer          | z-index | Component         |
|----------------|---------|-------------------|
| Shader BG      | 0       | ShaderBackground  |
| Hero           | 10      | HeroSection       |
| Forge panel    | 30      | AuraForgePanel    |
| Mixer dock     | 40      | MixerDock         |
| Top nav        | 50      | TopNav            |
| Toast          | 60      | Toast             |

## Motion Values

| Transition        | Duration | Easing                     |
|-------------------|----------|----------------------------|
| Journey fade      | 1200ms   | cubic-bezier(0.4,0,0.2,1) |
| Volume ramp       | 80ms     | exponential (`setTargetAtTime τ=0.08`) |
| Shader time scale | ×0.15/s  | linear accumulation        |
| Forge panel slide | 500ms    | ease                       |
| Button hover      | 200ms    | ease                       |

## Accessibility

- Toggle minimum hit target: 44×44px (`min-h-[44px] min-w-[44px]`)
- Sliders: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- Toggles: `role="switch"`, `aria-checked`, `aria-label`
- Keyboard: Tab → channels → toggles; Space → toggle channel
- `prefers-reduced-motion`: shader `u_time` freezes, CSS transitions collapsed to 0.01ms

## Anti-slop rules

- **No** 3-column feature grid on the landing page
- **No** purple gradient hero (shader IS the visual)
- **No** centered card mosaic
- **No** visible `<audio>` elements
- The glass dock floats over the living aurora — keep UI minimal
