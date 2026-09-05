# Chintan Puggalok — Interactive Portfolio

A static-first backend-engineering portfolio with two interactive experiences:

- **Visual UI:** recruiter-friendly conversational exploration.
- **Agent CLI:** keyboard-first interface inspired by modern coding agents.
- **Full profile:** conventional, accessible, SEO-ready professional profile.

The frontend is built with Astro, React, and TypeScript. A separate Cloudflare Worker grounds OpenRouter responses in approved public portfolio data.

## Architecture

```text
GitHub Pages (Astro + React)
             │
             ├── deterministic local commands
             │
             └── natural-language questions
                         │
                         ▼
               Cloudflare Worker
               validation · grounding
               rate limit · SSE stream
                         │
                         ▼
                    OpenRouter
```

Professional facts live in [`shared/portfolio.ts`](shared/portfolio.ts), which is consumed by static pages, the interactive application, tests, and the Worker.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:4321`.

On Termux, the Astro frontend works normally. Cloudflare's local `workerd` emulator does not support Android, so UI development uses the deployed API or automatic bundled fallback.

## Validation

```bash
npm run validate
```

This runs:

1. Astro and TypeScript checks.
2. Static production build.
3. Unit tests.
4. React integration journeys.
5. Worker request/stream integration tests.
6. Generated-site smoke and privacy scans.
7. Worker TypeScript checks.

See [`TEST_SCENARIOS.md`](TEST_SCENARIOS.md) for automated and manual scenarios.

## Worker

```bash
cd worker
npm install --ignore-scripts  # Termux only; use npm install elsewhere
npm run cf:whoami
npm run secret:openrouter
npm run deploy
```

The OpenRouter key is a Cloudflare secret and must never be stored in the frontend or repository. See [`worker/README.md`](worker/README.md).

## Deployment

Pushes to `main` are tested, built, and deployed through GitHub Actions to GitHub Pages. The custom domain is preserved through `public/CNAME`.

Worker deployment remains explicit and separate from frontend deployment.

## Privacy defaults

- AI context contains approved résumé facts but no phone number.
- The explicitly approved downloadable PDF includes its original phone number.
- Chat transcripts stay in page-session memory.
- Analytics does not intentionally receive chat questions or responses.
