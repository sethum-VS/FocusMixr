# How to generate ambient sounds

FocusMixr ships six built-in channels (rain, fire, coffee, waves, forest, keyboard). Their loop MP3s live in `public/sounds/`. You can regenerate them with ElevenLabs AI or offline ffmpeg procedural audio.

## Prerequisites

**ElevenLabs path (`npm run generate:ambient`):**

- `ELEVENLABS_API_KEY` in `.env.local` or `.env` (see [.env.example](../.env.example))
- Network access to `api.elevenlabs.io`

**Offline path (`npm run generate:sounds`):**

- [ffmpeg](https://ffmpeg.org/) installed and on your PATH
- No API key required

## Option A: ElevenLabs AI loops (recommended)

Generates 22-second seamless loops via the ElevenLabs Sound Effects API (`eleven_text_to_sound_v2`).

1. Add your API key:

   ```bash
   cp .env.example .env.local
   # Edit .env.local and set ELEVENLABS_API_KEY=your_key_here
   ```

2. Generate all six channels:

   ```bash
   npm run generate:ambient
   ```

   Expected output (one line per channel):

   ```
   Generating 6 ambient loop(s) via ElevenLabs → .../public/sounds
     rain… saved (345 KB)
     fire… saved (345 KB)
     ...
   Done. Restart dev server if running to pick up new files.
   ```

3. Regenerate a single channel:

   ```bash
   npm run generate:ambient -- rain waves
   ```

   Valid ids: `rain`, `fire`, `coffee`, `waves`, `forest`, `keyboard`.

## Option B: Offline ffmpeg procedural loops

Generates 12-second procedural noise loops without external APIs. Quality is basic compared to ElevenLabs but works offline.

```bash
npm run generate:sounds
```

Requires ffmpeg. Output goes to `public/sounds/{id}.mp3` for all six channels.

## Verification

1. Confirm files exist:

   ```bash
   ls public/sounds/*.mp3
   ```

   You should see six files: `rain.mp3`, `fire.mp3`, `coffee.mp3`, `waves.mp3`, `forest.mp3`, `keyboard.mp3`.

2. Restart the dev server if it was running (`npm run dev`).

3. Start Journey, toggle Rain, and confirm audio plays without a toast error.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Dev server exits when opening localhost (Windows) | Next.js 16 defaults to Turbopack, which can crash on Windows due to file locking. This repo uses `next dev --webpack` and `next build --webpack` in `package.json`. Delete `.next`, then retry. Exclude the project folder from antivirus/OneDrive sync if issues persist. |
| `EBUSY` or `os error 1224` during dev/build | Same as above — Turbopack + Windows Defender/OneDrive. Use webpack scripts, move repo off synced drives. |
| `cp` command not found (Windows cmd) | Use `copy .env.example .env.local` in Command Prompt, or run commands in Git Bash / PowerShell. |
| `Missing ELEVENLABS_API_KEY` | Set the key in `.env.local` or export it before running the script |
| `ElevenLabs 401` or `429` | Check key validity or wait for rate limits to reset |
| `Unknown sound id(s)` | Use only valid channel ids (see list above) |
| `ffmpeg: command not found` | Install ffmpeg, or use the ElevenLabs path instead |
| Channel toggles but no audio | Confirm the MP3 exists at `public/sounds/{id}.mp3` and returns HTTP 200 |

## Related

- Prompt text for each channel: `BUILTIN_AMBIENT_SPECS` in [src/lib/elevenlabsSound.ts](../src/lib/elevenlabsSound.ts)
- Channel metadata (labels, colors, paths): [src/lib/sounds.ts](../src/lib/sounds.ts)
- [Reference: Audio system](./reference-audio-system.md)
