# Configuration reference

Environment variables, npm scripts, and deployment settings for FocusMixr.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ELEVENLABS_API_KEY` | No | — | ElevenLabs API key for Aura Forge (`/api/generate-sound`) and `npm run generate:ambient` |

Without `ELEVENLABS_API_KEY`, built-in ambient channels still work. Aura Forge returns HTTP 401 with a clear error message.

### Local setup

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
ELEVENLABS_API_KEY=your_key_here
```

Next.js loads `.env.local` at dev and build time. The batch script also reads `.env.local` then `.env`.

**Never commit `.env` or `.env.local`.** Only `.env.example` is tracked.

### Production (Cloud Run)

Set `ELEVENLABS_API_KEY` as a GitHub secret. The deploy workflow passes it to Cloud Run when present:

```yaml
# .github/workflows/deploy.yml
--set-env-vars=ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
```

Other runtime env vars (set in Dockerfile / Cloud Run):

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Set in Docker runner stage |
| `PORT` | `8080` | Cloud Run listens on 8080 |
| `HOSTNAME` | `0.0.0.0` | Required for container binding |

## npm scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --webpack` | Development server at http://localhost:3000 (webpack avoids Turbopack crashes on Windows) |
| `build` | `next build --webpack` | Production build (standalone output) |
| `start` | `next start` | Serve production build locally |
| `lint` | `eslint` | ESLint via eslint-config-next |
| `test:e2e` | `playwright test` | E2E smoke tests (starts dev server) |
| `generate:sounds` | `node scripts/generate-sounds.mjs` | Offline ffmpeg procedural loops (cross-platform) |
| `generate:ambient` | `node scripts/generate-ambient-elevenlabs.mjs` | ElevenLabs AI loops to `public/sounds/` |

## Project metadata

| Field | Value |
|-------|-------|
| Framework | Next.js 16.2.9 (App Router) |
| React | 19.2.4 |
| Node (CI/Docker) | 20 |
| Output mode | `standalone` ([next.config.ts](../next.config.ts)) |
| Production URL | https://focusmixr-1047596610069.us-central1.run.app |

## Deployment

### Automatic (GitHub Actions)

Push to `main` triggers:

1. Lint + build
2. Playwright smoke tests
3. `gcloud builds submit` + `gcloud run deploy`

Required GitHub secrets:

| Secret | Purpose |
|--------|---------|
| `GCP_PROJECT_ID` | GCP project |
| `GCP_REGION` | e.g. `us-central1` |
| `GCP_SERVICE_NAME` | e.g. `focusmixr` |
| `GCP_AR_REPO` | Artifact Registry repo name |
| `GCP_SA_KEY` | Deploy service account JSON |
| `ELEVENLABS_API_KEY` | Optional — Aura Forge in production |

### Manual deploy

```bash
gcloud builds submit --tag "${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/focusmixr:$(git rev-parse --short HEAD)" .
gcloud run deploy focusmixr --image <image-uri> --region us-central1 --allow-unauthenticated --port 8080
```

Pass `-e ELEVENLABS_API_KEY=...` or `--set-env-vars` if Aura Forge should work in production.

### Health check

```bash
curl -fsS "https://focusmixr-1047596610069.us-central1.run.app/"
```

## Browser storage keys

| Store | Key / DB | Contents |
|-------|----------|----------|
| localStorage | `focusmixr-mix-v1` | Channel volumes, enabled state, custom sound metadata, master volume/play |
| IndexedDB | `focusmixr-audio` / `customSounds` | Custom sound audio buffers (ArrayBuffer) |

## Related

- [Reference: Audio system](./reference-audio-system.md)
- [How to generate ambient sounds](./how-to-generate-ambient-sounds.md)
- [How to run tests](./how-to-run-tests.md)
- Deploy details: [CLAUDE.md](../CLAUDE.md)
