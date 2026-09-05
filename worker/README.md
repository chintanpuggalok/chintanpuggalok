# Portfolio AI Worker

Cloudflare Worker for the portfolio's server-side OpenRouter integration. It validates requests, applies Cloudflare rate limiting, selects approved portfolio sources, streams OpenRouter output as SSE, validates citations, and falls back to bundled facts when the provider is unavailable.

## Authenticate with Cloudflare

```bash
cd worker
npm run cf:login
npm run cf:whoami
```

`cf:login` opens Cloudflare's authorization page. No Cloudflare credential belongs in this repository.

### Termux note

Cloudflare does not publish its local `workerd` runtime for Android. The included wrapper allows cloud-only Wrangler commands such as login, identity checks, secret upload, and deployment to run from Termux without pretending local emulation is available. Run dependency installation with `npm install --ignore-scripts` on Termux. Local `wrangler dev` must run on Linux/macOS/Windows or be replaced by the frontend's mock API during UI development.

## Enter the production OpenRouter secret

```bash
cd worker
npm run secret:openrouter
```

Wrangler prompts for the value without requiring it in a source file. Use an OpenRouter API key. Do not paste it into Git, `wrangler.jsonc`, an issue, or a chat transcript.

## Local development secret

```bash
cd worker
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and replace the placeholder. The real file is ignored by Git.

## Run locally

On a supported desktop/CI system:

```bash
npm install
npm run dev
```

On Termux, install with `npm install --ignore-scripts` and use the mocked frontend API; local Worker emulation is unavailable.

Then check the health endpoint shown by Wrangler, normally:

```bash
curl http://localhost:8787/health
```

## Deploy

Deployment is intentionally separate from the GitHub Pages frontend:

```bash
npm run deploy
```

After deployment, verify `/health` and submit a bounded test request to `/api/chat`. The endpoint never returns the provider credential and does not include the phone number in model context.
