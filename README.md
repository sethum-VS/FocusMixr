# FocusMixr

Ambient sound mixer with a reactive aurora shader. Blend rain, fire, ocean, and more — or generate custom sounds with Aura Forge (ElevenLabs).

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: add ELEVENLABS_API_KEY for AI sound generation
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run lint` | ESLint |

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `ELEVENLABS_API_KEY` | No | Enables Aura Forge AI sound generation |

Without the API key, built-in ambient channels still work.

## Design

See [DESIGN.md](./DESIGN.md) for typography, colors, and motion tokens.
