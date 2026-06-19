# How to run tests

FocusMixr uses Playwright for end-to-end smoke tests. CI runs them on every pull request and before deploy to Cloud Run.

## Prerequisites

- Node.js 20
- Dependencies installed (`npm install`)
- Playwright Chromium (installed automatically on first run, or manually below)

## Run smoke tests locally

```bash
npm run test:e2e
```

Playwright starts the dev server (`npm run dev`) on port 3000 unless one is already running (`reuseExistingServer: !process.env.CI`).

Expected result: **4 passed** in the `FocusMixr smoke` suite.

### What the tests cover

| Test | Verifies |
|------|----------|
| loads homepage without console errors | HTTP 200, hero visible, no critical console errors |
| start journey and toggle rain channel | Journey flow, rain toggle, `/sounds/rain.mp3` loads |
| opens Aura Forge panel | Forge button opens panel with prompt input |
| mobile mixer dock fits viewport | 375×812 viewport — master control not clipped, labels hidden on narrow screens |

## Install Playwright browsers manually

If Chromium is missing:

```bash
npx playwright install --with-deps chromium
```

## Run lint and production build

CI also runs these before e2e:

```bash
npm run lint
npm run build
```

## CI behavior

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs:

1. **lint-and-build** — `npm run lint`, `npm run build`
2. **e2e-smoke** — `npm run test:e2e` (depends on lint-and-build passing)
3. **deploy** — Cloud Run deploy (main branch pushes only, after e2e passes)

In CI, Playwright retries failed tests twice (`retries: 2`).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Port 3000 already in use | Stop the conflicting process, or let Playwright reuse the existing dev server |
| Rain test timeout waiting for `/sounds/rain.mp3` | Ensure `public/sounds/rain.mp3` exists (`npm run generate:ambient` or `npm run generate:sounds`) |
| `webServer` timeout (120s) | Check `npm run dev` starts cleanly; review build errors |
| Flaky mobile test | Re-run once; CI retries automatically |

## Related

- Test source: [e2e/smoke.spec.ts](../e2e/smoke.spec.ts)
- Playwright config: [playwright.config.ts](../playwright.config.ts)
- [Reference: Configuration](./reference-configuration.md)
