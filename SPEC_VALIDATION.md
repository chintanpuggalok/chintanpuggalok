# Specification Validation Report

**Branch:** `feat/interactive-portfolio`  
**Validation date:** September 2026  
**Frontend demo:** Astro production preview on port `4321`  
**AI endpoint:** `https://chintan-portfolio-api.chintanpuggalok.workers.dev`  

## Executive result

The end-to-end product described in `SPEC.md` is implemented and operational as a review build:

- Astro produces 18 static pages.
- The React homepage supports first-visit selection, Visual UI, Agent CLI, shared in-session transcript, deterministic commands, streamed AI answers, citations, cancellation, and local fallback.
- The Cloudflare Worker is deployed with an encrypted OpenRouter secret, native Cloudflare rate-limit binding, strict request limits, origin checks, grounding, scope routing, SSE transformation, and safe fallback.
- The conventional profile, role details, projects, writing, résumé, contact, privacy, redirects, metadata, sitemap, and custom-domain asset are generated.
- All 52 automated tests pass across six test files.
- The generated-site smoke test passes and scans text assets for accidental phone-number exposure.
- Native Chromium end-to-end runs pass at 320px, 768px, and 1440px, including short 320×360 viewports, both themes, keyboard controls, cancellation, failure handling, and no-JavaScript navigation.
- Automated axe audits report no WCAG 2.2 AA or best-practice violations on the tested routes and viewports.

The frontend has intentionally **not** been pushed to `main`, so the production GitHub Pages website has not changed. The review demo is served from the development box.

## Automated evidence

Command:

```bash
npm run validate
```

Result:

```text
Astro diagnostics:       0 errors, 0 warnings, 0 hints
Static routes generated: 18
Test files:              6 passed
Automated tests:         52 passed
Browser E2E scenarios:   16 passed
Responsive/axe matrix:   passed
Failure-state journeys:  passed
Generated-site smoke:    passed
Worker TypeScript:       passed
```

Additional live checks:

- 14 representative frontend routes/assets returned HTTP 200 from the production preview.
- Worker `/health` returned HTTP 200 with the provider key reported as configured, without exposing its value.
- A live OpenRouter request streamed model tokens and validated source records.
- A live unrelated question was blocked before reaching the model and redirected to portfolio topics.
- Worker CORS preflight succeeded for the review origin.
- Worker dependency audit reports zero known vulnerabilities.

## Requirement matrix

| Specification area | Status | Evidence / notes |
|---|---:|---|
| First-visit mode selector | Pass | Visual, CLI, and Full Profile paths are present and keyboard-accessible. |
| Remembered mode and URL overrides | Pass | `localStorage`, `?mode=visual`, and `?mode=cli` supported. |
| Visual conversational UI | Pass | Suggested prompts, streaming, rich Markdown, tools, sources, stop control, and direct navigation implemented. |
| Pi/Codex-inspired CLI | Pass | Transcript, bottom editor, status footer, tool blocks, slash commands, aliases, autocomplete, history, and cancellation implemented. |
| Mode switching | Pass | Shared React state preserves transcript; integration-tested. |
| Full static profile | Pass | Current Amazon role, Intuit history, metrics, capabilities, projects, education, recognition, and contact CTA included. |
| Static routes and legacy redirects | Pass | Profile, experience, projects, writing, résumé, contact, privacy, old `/blogs` paths, and 404 generated. |
| Structured source of truth | Pass | `shared/portfolio.ts` feeds pages, commands, AI grounding, and tests. It contains public data only. |
| Deterministic commands | Pass | Commands avoid model calls; integration-tested. |
| OpenRouter integration | Pass | Live free-model routing tested through deployed Worker. |
| Grounded answers and citations | Pass | Keyword source selector, context-only system rules, server-selected citations, and local fallback implemented. |
| Unrelated/prompt-injection routing | Pass | Deterministic pre-model scope guard tested locally and against the live Worker. |
| Secret isolation | Pass | OpenRouter key exists only as a Cloudflare secret; generated assets scanned. |
| Request security | Pass | CORS allowlist, body/history/message limits, content-type checks, rate limiting, timeout, safe errors, and no raw HTML rendering. |
| Phone privacy boundary | Pass | Phone is absent from application data, AI context, and generated text; it remains only in the explicitly approved PDF (test assertions contain the blocked numeric pattern). |
| Responsive implementation | Pass in Chromium | Desktop/tablet/mobile and short-viewport runs show no horizontal overflow, composer overlap, or unreachable composer from 320px through 1440px. Physical-device and Safari/Firefox review remains manual. |
| Accessibility implementation | Pass in automated audit | Semantic regions, labels, focus states, keyboard paths, live status, reduced motion, and no-JS navigation are implemented; axe reports no violations in the tested matrix. A real screen-reader walkthrough remains manual. |
| SEO | Pass | Static content, canonical URLs, Person schema, metadata, sitemap, robots, legacy redirects, and crawlable links generated. |
| Analytics privacy | Pass | Existing GA property retained; application emits no chat-content events. |
| Frontend deployment workflow | Pass (unexecuted) | GitHub Pages workflow now installs, checks, tests, builds, smoke-tests, and deploys `dist`. It will execute after approved merge to `main`. |
| Worker deployment workflow | Implemented (setup pending) | Manual GitHub workflow exists; repository-level Cloudflare API-token secrets still need configuration before that workflow can run. Direct authenticated Wrangler deployment works now. |
| Failure behavior | Pass | Provider failure, empty stream, network failure, rate limit, invalid input, and JavaScript-disabled navigation have fallbacks. |
| Existing technical article | Pass | URL-forwarding article and media migrated with legacy URL redirects. |
| Résumé | Pass | Approved PDF is viewable and downloadable; web pages disclose that the PDF contains contact information. |

## Known limitations and items that do not yet fully satisfy the spec

### 1. Production frontend is not deployed

The implementation is on a feature branch and is available as a local production preview. It has not been committed, pushed, or merged because `main` auto-deploys to `chintanpuggalok.com`. Production launch requires review and explicit approval.

### 2. Cross-browser and assistive-technology audit is pending

Native ARM64 Chromium automation now covers the key journeys, responsive widths, keyboard commands, dark/light themes, axe checks, screenshots, and failure states. Remaining manual launch gates are Safari and Firefox inspection, a physical mobile-keyboard check, and a VoiceOver/TalkBack/NVDA walkthrough.

### 3. Interactive Lighthouse performance is below the numeric target in the local mobile lab

The latest native Termux/Chromium mobile-simulation scores are: landing selector **78**, Visual **78**, CLI **87**, and static Profile **92**. Accessibility, Best Practices, and SEO are **100** for all four. FCP is 0.8–1.3s, LCP is 1.1–1.7s, CLS is 0–0.052, and the lower interactive scores are driven by 500–980ms Total Blocking Time while React hydrates under throttling on this Android dev box. Removing the general Markdown runtime reduced the interactive application bundle substantially, but the local lab still does not meet the ≥90 interactive target. Recheck the deployed HTTPS preview from a desktop Lighthouse environment before launch.

### 4. One moderate build-tool advisory remains

`npm audit --omit=dev` reports one moderate advisory group against Astro 6 involving dynamic spread attributes/view transitions. This implementation:

- is statically generated;
- does not use Astro View Transitions;
- does not create attribute names from visitor input; and
- does not run Astro on the production server.

Astro 7.3.1 contains the upstream fixes but currently depends on a native parser package that has no Android/Termux build, preventing a working local demo on this dev box. Moving to Astro 7 after review on Linux CI is recommended. High-severity transitive `sharp` and low-severity `esbuild` findings were removed with compatible package overrides.

### 5. OpenRouter free-model quality and availability are not guaranteed

`openrouter/free` selects from currently available free models. Latency, capacity, and response style can vary. The application remains usable through deterministic commands and local grounded fallback, but guaranteed AI quality would require selecting a stable paid model and setting a budget.

### 6. Provider spending/usage cap is not verifiable from code

The Worker limits each IP to 10 chat requests per minute and caps prompt/history/output sizes. An account-wide OpenRouter budget or usage cap must be configured and verified in the OpenRouter dashboard.

### 7. Turnstile is not enabled

The specification makes Turnstile conditional on observed abuse. Native rate limiting is active; Turnstile has not been added because there is no evidence of abuse yet.

### 8. Worker GitHub deployment credentials are not configured

`.github/workflows/worker.yaml` expects `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the protected `portfolio-api` GitHub environment. The current Worker was deployed through the authenticated Wrangler session instead.

### 9. No dedicated 1200×630 social image

Open Graph and Twitter metadata currently use the approved profile image. A purpose-built social sharing card would improve link previews but is not required for functionality.

### 10. Local Worker emulation is unavailable on Termux

Cloudflare does not publish `workerd` for Android. Cloud-only Wrangler operations and deployment work through the included wrapper; Worker behavior is covered by integration tests and the deployed endpoint. Local `wrangler dev` requires Linux, macOS, or Windows.

### 11. Dev.to auto-publishing was retired

The previous workflow referenced a misspelled/nonexistent script and Hugo content paths. It was removed during migration. Writing remains available on the site, but automatic Dev.to syndication would need a new Astro-aware implementation if desired.

## Launch checklist

Before merging to `main`:

1. Open the review demo and inspect Visual, CLI, Full Profile, mobile layout, résumé, and article.
2. Ask at least one real AI question and run `/experience`, `cat experience/amazon`, and `open resume`.
3. Review every public résumé-derived claim.
4. Re-run Lighthouse against the deployed HTTPS preview on desktop; investigate further if interactive routes remain below 90.
5. Decide whether to accept the documented Astro advisory temporarily or perform the Astro 7 upgrade in Linux CI.
6. Optionally create a dedicated social card.
7. Commit and push the feature branch for code review.
8. Merge only after approval; the GitHub Pages workflow will deploy automatically.
