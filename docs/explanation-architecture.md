# FocusMixr architecture

FocusMixr is a client-heavy Next.js app: audio mixing, state persistence, and a WebGL aurora shader all run in the browser. The server handles static assets, one API route for AI sound generation, and production deployment on Cloud Run.

## The problem

Focus users need continuous ambient audio they can blend without jarring loops, visible `<audio>` elements, or a cluttered UI. The visual environment should react to the mix. Custom sounds should persist locally without a backend database.

## High-level layout

```
┌─────────────────────────────────────────────────────────┐
│  FocusMixrExperience (orchestrator)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ useMixState │  │ useAudioEngine│  │useShaderUniforms│
│  │ reducer +   │  │ Web Audio API │  │ volume → shader│
│  │ persistence │  │               │  │               │  │
│  └──────┬──────┘  └───────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
│  ┌──────▼─────────────────▼───────────────────▼──────┐  │
│  │ UI: Hero → MixerDock → AuraForgePanel               │  │
│  │     ShaderBackground (React Three Fiber + GLSL)    │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                              │
         │ POST /api/generate-sound     │ fetch /sounds/*.mp3
         ▼                              ▼
   ElevenLabs API                  public/sounds/
```

### Source layout

| Path | Role |
|------|------|
| `src/app/page.tsx` | Renders `FocusMixrExperience` |
| `src/app/api/generate-sound/` | Server route — ElevenLabs proxy |
| `src/components/experience/` | Top-level client shell |
| `src/components/mixer/` | Glass dock, channels, master control |
| `src/components/forge/` | Aura Forge panel and custom sound cards |
| `src/components/shader/` | Aurora GLSL + React Three Fiber canvas |
| `src/hooks/` | Mix state, audio engine, shader uniforms |
| `src/lib/` | Channel defs, ElevenLabs client, IndexedDB |
| `public/sounds/` | Pre-built MP3 loops |
| `scripts/` | Batch ambient generation |

## Journey flow

The app deliberately gates audio and the mixer behind **Start Journey**:

1. Landing shows hero + aurora only (no mixer dock)
2. User clicks Start Journey → `journeyStarted: true`
3. `AudioContext` initializes (browser autoplay policy satisfied by gesture)
4. Hero fades out (1.2s); mixer dock appears
5. `journeyProgress` animates 0→1 over 1.2s, driving shader transition

This keeps the landing page clean and ensures audio starts only after explicit user action.

## Audio design

### Why Web Audio, not `<audio>` elements

HTML `<audio>` tags are hidden but still fight loop seams, crossfading, and per-channel gain. The Web Audio API gives:

- **Sample-accurate looping** via `AudioBufferSourceNode.loop`
- **Independent gain per channel** with smooth exponential ramps
- **Single master bus** for global volume and suspend/resume
- **In-memory custom buffers** decoded once from Aura Forge responses

### Built-in vs AI-generated sounds

| Source | When used | Storage |
|--------|-----------|---------|
| `public/sounds/*.mp3` | Six built-in channels | Committed to repo (or regenerated via scripts) |
| ElevenLabs API | Aura Forge on-demand | IndexedDB per browser |
| ffmpeg procedural | `npm run generate:sounds` fallback | `public/sounds/` locally |

Built-in sounds ship as static assets so the app works with zero API keys. ElevenLabs is optional for richer loops and user-created ambience.

### Loop length trade-off

ElevenLabs generates **22-second** loops (`duration_seconds: 22`, `loop: true`). Long enough to avoid obvious repetition; short enough for reasonable API cost and download size (~350 KB per channel).

## Visual design

### Aurora shader

`ShaderBackground` renders a full-screen GLSL fragment shader via React Three Fiber. Uniforms:

- `u_channelColors[6]`, `u_channelVolumes[6]` — built-in channels
- `u_customColors[4]`, `u_customVolumes[4]` — Aura Forge slots
- `u_journeyProgress` — landing → mixer transition
- `u_time`, `u_mouse`, `u_resolution` — motion and parallax

Volumes are **smoothed** (lerp 0.12/frame) so the aurora eases when sliders move, matching audio ramp timing perceptually.

### WebGL fallback

If WebGL is unavailable or context is lost, a CSS radial/conic gradient fallback uses the dominant active channel color. `prefers-reduced-motion` freezes shader time accumulation.

### Z-index stack

See [DESIGN.md](../DESIGN.md) for the full token spec. Key layers: shader (0), hero (10), forge panel (30), mixer dock (40), nav (50), toast (60).

## Mobile mixer architecture

The mixer dock uses a **fixed master control + horizontally scrollable channels** pattern:

- Outer wrapper: `w-[calc(100vw-24px)] max-w-4xl` prevents off-screen clipping
- Channels: `flex-1 min-w-0 overflow-x-auto` with touch scroll
- Labels hidden below `sm` breakpoint; icons and `aria-label` remain for accessibility
- Safe-area inset on bottom: `env(safe-area-inset-bottom)`

This avoids truncating the master play button on 375px viewports while keeping all six channels reachable.

## State persistence

Mix state uses a **split storage model**:

- **localStorage** — small JSON metadata (fast, synchronous restore)
- **IndexedDB** — large audio buffers (async, quota-friendly)

Custom sound buffers are never serialized to localStorage. On reload, metadata restores immediately; audio hydrates from IndexedDB in a background effect.

## Server role

Next.js serves the SPA and one dynamic route. The generate-sound API:

- Keeps the ElevenLabs key server-side
- Applies per-IP rate limiting (10/min)
- Returns raw MP3 bytes to the client

Production uses **standalone output** in a Node 20 Alpine container on Cloud Run (port 8080, 512Mi RAM).

## Trade-offs

| Choice | Benefit | Cost |
|--------|---------|------|
| Client-side mixing | No streaming server, low latency | All audio downloaded to client |
| IndexedDB for custom sounds like sounds | No user accounts or backend DB | Buffers lost if user clears site data |
| In-memory rate limiter | Simple, no Redis | Resets on cold start; per-instance in Cloud Run |
| 22s ElevenLabs loops | Good quality/size balance | Regeneration cost if prompts change |
| Journey gate | Clean landing, autoplay compliance | Extra click before mixing |

## Alternatives considered

- **Procedural ffmpeg loops only** — kept as `npm run generate:sounds` for offline/dev; ElevenLabs preferred for production quality
- **Visible audio elements** — rejected per design anti-slop rules (DESIGN.md)
- **Server-side audio mixing** — rejected; would add latency and infrastructure for a focus tool that should work offline for built-in channels

## Related

- [Reference: Audio system](./reference-audio-system.md)
- [Reference: Configuration](./reference-configuration.md)
- [Design tokens](../DESIGN.md)
- [Tutorial: Getting started](./tutorial-getting-started.md)
