@AGENTS.md

## Deploy Configuration (configured by /setup-deploy)
- Platform: GCP Cloud Run
- Production URL: https://focusmixr-1047596610069.us-central1.run.app (set after first deploy; update if custom domain)
- Deploy workflow: `.github/workflows/deploy.yml`
- Deploy status command: `gcloud run services describe focusmixr --region=us-central1 --format='value(status.url)'`
- Merge method: squash
- Project type: web app (Next.js 16)
- Post-deploy health check: HTTP GET on production URL `/`

### Custom deploy hooks
- Pre-merge: `npm run lint && npm run build && npm run test:e2e` (runs in CI on PR and main)
- Deploy trigger: automatic on push to `main` via GitHub Actions + `gcloud builds submit` + `gcloud run deploy`
- Deploy status: poll production URL until HTTP 200
- Health check: `curl -fsS "${PRODUCTION_URL}/"`

### GitHub secrets (set via `gh secret set`)
| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_REGION` | Cloud Run region (e.g. `us-central1`) |
| `GCP_SERVICE_NAME` | Cloud Run service name (e.g. `focusmixr`) |
| `GCP_AR_REPO` | Artifact Registry repo name (e.g. `focusmixr`) |
| `GCP_SA_KEY` | JSON key for deploy service account |
| `ELEVENLABS_API_KEY` | Optional — enables Aura Forge AI sound generation |

### Local deploy (manual)
```bash
gcloud builds submit --tag "${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/focusmixr:$(git rev-parse --short HEAD)" .
gcloud run deploy focusmixr --image <image-uri> --region us-central1 --allow-unauthenticated --port 8080
```
