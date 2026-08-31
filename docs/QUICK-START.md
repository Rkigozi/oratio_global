# Oratio Quick Start

## Start the dev server

```bash
./start-dev.sh
```

This script cleans orphaned servers on ports 5173–5176 and stray esbuild processes, then starts a fresh Vite server (default http://localhost:5173).

### Why not `npm run dev`?

This repo lives on an external drive (Samsung T5), which triggers a known npm bug: `ENOENT: no such file or directory, uv_cwd`. Workarounds, in order of preference:

1. `./start-dev.sh` — recommended
2. `node node_modules/vite/bin/vite.js` — direct Vite
3. `alias npm='node /opt/homebrew/lib/node_modules/npm/bin/npm-cli.js'` — shell alias

## Quality gates

```bash
npm run type-check   # tsc --noEmit
npm run lint         # eslint
npm test             # vitest (unit + component + integration)
npm run build        # production build + PWA generation
```

## Tests

```bash
npm run test:watch       # vitest watch mode
npm run test:coverage    # coverage report (html in coverage/)

# Playwright E2E — needs browsers installed once:
npx playwright install webkit
npm run test:e2e                       # local dev server, mobile WebKit + desktop Chrome
npm run test:e2e:remote                # live site at oratiotest.netlify.app
npm run test:e2e:ui                    # Playwright UI mode

# Authenticated journeys (sign in, submit, pray, comment):
E2E_TEST_EMAIL=you@example.com E2E_TEST_PASSWORD=secret npm run test:e2e
```

## Deploy

No manual steps. `git push` to `main`:
1. GitHub Actions runs type-check, lint, tests, build
2. Netlify (Git-connected) builds and publishes

Roll back from the Netlify deploys list. Preview builds run automatically on pull requests.

## Troubleshooting

- **Orphaned dev server**: `lsof -ti:5173 | xargs kill -9` (or any port 5173–5176)
- **Stale service worker locally**: Dev server doesn't use the production SW; for the live site, hard-refresh or wait for the SW update
- **Supabase errors in dev**: check `.env` has `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` matching the project
