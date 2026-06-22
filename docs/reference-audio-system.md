# Audio system reference

Complete reference for built-in channels, Web Audio playback, Aura Forge, and the generate-sound API.

## Built-in channels

Defined in [src/lib/sounds.ts](../src/lib/sounds.ts) as `BUILTIN_CHANNELS`:

| ID | Label | Color | Source |
|----|-------|-------|--------|
| `rain` | Rain | `#3b82f6` | `/sounds/rain.mp3` |
| `fire` | Fire | `#f97316` | `/sounds/fire.mp3` |
| `coffee` | Coffee | `#78350f` | `/sounds/coffee.mp3` |
| `waves` | Waves | `#06b6d4` | `/sounds/waves.mp3` |
| `forest` | Forest | `#22c55e` | `/sounds/forest.mp3` |
| `keyboard` | Keyboard | `#e2e8f0` | `/sounds/keyboard.mp3` |

Each channel has:

- **Default volume:** 0.7
- **Default enabled:** `false`
- **Icon:** Lucide icon name (e.g. `CloudRain`, `Flame`)

TypeScript type: `ChannelId = 'rain' | 'fire' | 'coffee' | 'waves' | 'forest' | 'keyboard'`

## Custom sounds (Aura Forge)

| Constant | Value |
|----------|-------|
| `MAX_CUSTOM_SOUNDS` | 4 |
| Default volume | 0.7 |
| Default enabled on create | `true` |
| ID format | `custom-{timestamp}` |
| Prompt max length | 500 characters |

Accent color presets (`ACCENT_PRESETS`): `#3b82f6`, `#f97316`, `#22c55e`, `#06b6d4`, `#a855f7`, `#ec4899`

### Storage

| Layer | Location | Stored data |
|-------|----------|-------------|
| React state | In-memory | Full `CustomSound` including `buffer` |
| localStorage | `focusmixr-mix-v1` | Metadata only (id, prompt, accentColor, volume, enabled) |
| IndexedDB | `focusmixr-audio` → `customSounds` | Audio `ArrayBuffer` keyed by sound id |

On page load, metadata restores from localStorage; buffers hydrate from IndexedDB asynchronously.

## Web Audio engine

Implemented in [src/hooks/useAudioEngine.ts](../src/hooks/useAudioEngine.ts).

### Lifecycle

1. **AudioContext** created when `journeyStarted` becomes `true` (user gesture implied by Start Journey)
2. **Master gain node** connects to `ctx.destination`
3. Per-channel **gain nodes** connect to master gain
4. On channel enable: fetch MP3 → `decodeAudioData` → `BufferSource` with `loop: true`
5. On channel disable: gain ramps to 0 (τ=0.08s), source stopped after 400ms
6. On unmount: `AudioContext.close()`

### Volume ramping

All gain changes use `setTargetAtTime(value, currentTime, 0.08)` — exponential approach with ~80ms time constant.

### Master play/pause

- **Playing:** `ctx.resume()`, master gain = `masterVolume`
- **Paused:** `ctx.suspend()`, master gain = 0

Defaults: `masterVolume: 0.85`, `masterPlaying: true`

### Error handling

Failed fetch/decode sets `node.failed = true` and shows a toast: `Sound failed to load: {id}`. Re-enable the channel or reconnect (`online` event) to retry automatically.

## ElevenLabs integration

Shared client: [src/lib/elevenlabsSound.ts](../src/lib/elevenlabsSound.ts)

| Constant | Value |
|----------|-------|
| API endpoint | `https://api.elevenlabs.io/v1/sound-generation` |
| Model | `eleven_text_to_sound_v2` |
| Default duration | 22 seconds |
| Default prompt influence | 0.5 |
| Default loop | `true` |
| Output format | `mp3_44100_128` |

### `generateSoundEffect(apiKey, text, options?)`

Returns `Promise<ArrayBuffer>` of MP3 audio.

Options (`GenerateSoundOptions`):

| Option | Type | Default |
|--------|------|---------|
| `durationSeconds` | number | 22 |
| `promptInfluence` | number | 0.5 |
| `loop` | boolean | true |
| `outputFormat` | string | `mp3_44100_128` |

## API route: POST `/api/generate-sound`

Source: [src/app/api/generate-sound/route.ts](../src/app/api/generate-sound/route.ts)

### Request

```
POST /api/generate-sound
Content-Type: application/json

{ "prompt": "deep cave drips, atmospheric loop" }
```

| Field | Type | Constraints |
|-------|------|---------------|
| `prompt` | string | Required, max 500 characters |

### Response (success)

```
HTTP 200
Content-Type: audio/mpeg
Content-Length: <bytes>
Cache-Control: no-store

<binary MP3>
```

### Error responses

| Status | Condition |
|--------|-----------|
| 400 | Invalid JSON or missing/invalid `prompt` |
| 401 | `ELEVENLABS_API_KEY` not configured |
| 429 | Rate limit exceeded (10 requests/minute/IP) or ElevenLabs 429 |
| 502 | ElevenLabs or upstream error |

Error body: `{ "error": "<message>" }`

### Rate limiting

In-memory per-IP limiter: **10 requests per 60 seconds**. IP from `x-forwarded-for` (first hop) or `x-real-ip`.

## Batch generation script

`npm run generate:ambient` runs [scripts/generate-ambient-elevenlabs.mjs](../scripts/generate-ambient-elevenlabs.mjs).

Uses the same prompts as `BUILTIN_AMBIENT_SPECS` in `elevenlabsSound.ts`. Writes `{id}.mp3` to `public/sounds/`.

Optional positional args filter which channels to regenerate:

```bash
npm run generate:ambient -- rain forest
```

## Shader coupling

Channel and custom sound volumes feed the aurora shader via [src/hooks/useShaderUniforms.ts](../src/hooks/useShaderUniforms.ts):

- 6 built-in channel colors + smoothed volumes
- 4 custom accent colors + smoothed volumes
- Smoothing: lerp factor 0.12 per animation frame

See [Explanation: Architecture](./explanation-architecture.md) for the full visual pipeline.

## Related

- [How to generate ambient sounds](./how-to-generate-ambient-sounds.md)
- [Reference: Configuration](./reference-configuration.md)
- [Tutorial: Getting started](./tutorial-getting-started.md)
