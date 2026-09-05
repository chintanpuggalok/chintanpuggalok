# Portfolio bug and specification audit

**Audit date:** 5 September 2026  
**Scope:** current uncommitted working tree on `feat/interactive-portfolio`, based on `ad7e944`; not the production website.  
**Specification:** `SPEC.md`  
**Verdict:** core journeys work, but **not ready to call fully validated or release-complete**. Seventeen open findings are listed below. No critical exploit was demonstrated.

This is a bounded audit, not a guarantee that every bug has been found. Application code was not changed or deployed during this reporting pass; audit scripts were added/expanded. Earlier fixes are distinguished from remaining defects.

## 1. Validation and coverage

| Check | Result |
|---|---|
| `npm run validate` | PASS: zero Astro diagnostics, 18 static pages, 43 tests in four files, built-site smoke scan, Worker TypeScript check |
| Responsive browser audit | 21 route/viewport combinations: Visual, CLI, profile, contact, one project, article, résumé at 320/768/1440px, height 800px |
| Composer regression | Six local `/experience` submissions: no transcript/composer overlap; composer remains within viewport |
| Theme/short-viewport audit | 12 combinations: Visual/CLI × dark/light × 320×360, 320×800, 1440×800; no page-width overflow or out-of-viewport composer |
| Browser accessibility | Expanded axe tags include WCAG 2 A/AA, 2.1 A/AA and 2.2 AA. Mobile CLI target-size failure remains |
| Browser runtime | No page JavaScript errors in the 21-route matrix |
| Error scenarios | Mocked HTTP 429 and interrupted SSE in real Chromium; received text preserved and Retry shown |
| Dependency audit | Frontend: one moderate-severity vulnerable dependency, Astro, covering three advisories. Worker: zero reported vulnerabilities |
| Lighthouse mobile lab | Root (restored CLI): Performance **78**, Accessibility **96**, Best Practices **100**, SEO **100**. Profile: **73 / 100 / 100 / 100** |

Browser: native Termux ARM64 Chromium 149, against the freshly rebuilt preview at `http://127.0.0.1:4321`. Lighthouse ran on this device with mobile simulation: useful lab evidence, **not a production performance certification**. The root Lighthouse run restored CLI preferences; it was not a clean first-visit selector run.

## 2. Open findings

Severity: **High** = important privacy, input-boundary or grounding requirement fails; **Medium** = functional, accessibility, delivery or performance defect; **Low** = configuration/documentation inconsistency.

### B01 — High: SSE frame-size protection is bypassable

- **Location:** `shared/stream.ts`, `readSSE`.
- **Reproduction:** one `data:` line containing 70,000 characters followed by a newline is accepted. A frame comprising 100 data lines produces a 100,099-character event without error.
- **Cause:** the 64KB check runs after complete lines are removed and checks only the leftover buffer, not the event's accumulated data. A complete oversized line also bypasses it.
- **Impact:** an upstream stream can exceed the advertised parser memory/event limit. This does not demonstrate compromise of the Worker or browser.
- **Fix:** enforce individual-line and cumulative-event byte limits before accumulating/yielding; reset the event counter on dispatch. Test single-chunk and split-chunk inputs.
- **Evidence:** `.dev/audit/edge-cases.json`, `SSE 64KB limit`.

### B02 — High: phone-number redaction fails across output boundaries

- **Location:** `worker/src/provider.ts`, the two per-fragment redaction calls.
- **Reproduction:** synthetic provider content `'a'.repeat(15) + '1234567890' + 'b'.repeat(75)` is split by the 80-character tail mechanism. Concatenated browser deltas still contain the entire synthetic number.
- **Cause:** each visible fragment is redacted independently; a number split between fragments is never matched.
- **Impact:** the output filter cannot enforce SPEC §8.1's prohibition on producing a phone number. **No real private number was exposed by this test.** Approved source data still excludes the private phone number.
- **Fix:** use a stateful cross-boundary output filter, or validate the complete answer before publication. Add adversarial chunk-boundary tests.

### B03 — High: uncited, unsupported provider text is accepted as success

- **Location:** `worker/src/provider.ts`, final citation parsing and completion.
- **Reproduction:** mocked provider text `Invented achievement with no citation.` is forwarded with an empty source list and `done: {fallback:false}`.
- **Cause:** absent/malformed citation metadata is tolerated. Trusted-ID validation does not verify that claims follow from a source.
- **Impact:** the strict grounded-answer requirement is not enforced; prompt instructions alone are insufficient. The reproduction tests the adapter, **not a claim that the live model actually generated this sentence**.
- **Fix:** treat missing/invalid required citation metadata as a validation failure, make unverified output visibly distinct, and choose a defensible claim-validation/approved-answer strategy. Valid IDs alone must not be described as fact verification.

### B04 — Medium: a citation-only response becomes an empty successful answer

- **Location:** `worker/src/provider.ts`.
- **Reproduction:** provider output `SOURCES_JSON:{"sourceIds":[]}` produces sources/tool/done events but no visible text and `fallback:false`.
- **Cause:** nonempty `allText` is checked before the metadata suffix is stripped; visible answer content is never required.
- **Fix:** require nonempty visible answer text after metadata extraction; otherwise retry another model or return local facts.

### B05 — Medium: topic router accepts unrelated requests containing broad keywords

- **Location:** `shared/scope.ts`, `isPortfolioQuestion`.
- **Reproduction:** `What is his favorite pizza?` and an unrelated request containing `Python` are accepted. A synthetic ransomware-program request containing `Python` was accepted by this local predicate; it was **not sent to a live model**.
- **Cause:** generic pronouns and technology words are sufficient to pass the scope check.
- **Impact:** unrelated requests reach the provider and consume quota; the router itself does not enforce portfolio-only behavior. The model may still refuse.
- **Fix:** classify the relationship to the public professional profile, not just token presence; test off-topic requests containing otherwise valid keywords.

### B06 — Medium: topic router rejects supported technologies

- **Location:** `shared/scope.ts` versus `shared/portfolio.ts`.
- **Reproduction:** `Tell me about Docker` returns false, although Docker is explicitly listed in approved Intuit experience and cloud skills.
- **Impact:** valid exploration can receive an unrelated-question refusal without consulting the model.
- **Fix:** derive recognized topics from the shared catalog and test all represented skills. `Redis` was also probed, but is **not** treated as a confirmed defect because it is not listed in the current catalog.

### B07 — Medium: follow-up handling loses context on fallback and for some phrasing

- **Locations:** `src/components/PortfolioApp.tsx`, `src/lib/commands.ts`, `worker/src/index.ts`.
- **Reproduction path:** ask a supported question, then `Tell me more` while the API is unavailable. The browser calls `createLocalFallback(question)` without prior context; the scope predicate cannot recognize the follow-up on its own.
- **Additional mismatch:** the scope guard accepts `summarize it` and `explain more` after relevant history, but the Worker's separate `followUp` expression does not include these forms when constructing its retrieval query.
- **Impact:** legitimate follow-ups can be refused or grounded in the wrong sections.
- **Fix:** share follow-up detection and pass bounded previous-user-question context to both retrieval and local fallback.
- **Evidence level:** code-path review; the offline follow-up journey was not separately browser-executed in this pass.

### B08 — Medium: Retry ignores the displayed rate-limit cooldown

- **Locations:** `src/lib/chat.ts`, `src/components/PortfolioApp.tsx`.
- **Reproduction:** mock HTTP 429 with `Retry-After: 60`. UI says to wait 60 seconds, but Retry is immediately enabled; clicking it immediately sends another request.
- **Cause:** `ChatError.retryAfter` is parsed but never used by retry controls.
- **Fix:** store a retry deadline and disable/count down AI retry actions while keeping local commands available. Expose `Retry-After` in CORS if relying on non-default cross-origin values.
- **Evidence:** `.dev/audit/chat-failures.json`: `retryDisabled:false`, two network calls.

### B09 — Medium: interrupted AI text is mislabeled as local facts

- **Location:** `src/components/PortfolioApp.tsx`, request catch handler.
- **Reproduction:** stream `Partial AI answer preserved.` then disconnect without `done`. Text is correctly preserved, but model label becomes `Local fallback` and tool text claims it was resolved from bundled sources.
- **Impact:** misleading provenance: the visible partial text came from the model, not the deterministic fallback.
- **Fix:** distinguish `interrupted AI answer` from `local fallback`; only claim local resolution when local content is actually displayed.
- **Evidence:** `.dev/audit/chat-failures.json`.

### B10 — Medium: mobile main navigation is unavailable without JavaScript

- **Locations:** `src/layouts/BaseLayout.astro`, `src/styles/global.css`.
- **Reproduction:** disable JavaScript, open `/profile/` at 320px. All six `#site-navigation` links are hidden; the toggle depends on JavaScript.
- **Impact:** static content remains readable and some inline/footer links remain, but the primary mobile navigation cannot be opened.
- **Fix:** make no-JavaScript navigation visible by default and collapse it only after progressive enhancement, or use a native disclosure element.
- **Evidence:** `.dev/audit/edge-cases.json`, `no-JS mobile navigation`.

### B11 — Medium: mobile CLI touch control fails WCAG 2.2 target sizing

- **Locations:** CLI header controls in `src/components/PortfolioApp.tsx`, `src/styles/interaction.css`.
- **Reproduction:** axe flags `target-size` in CLI at 320px, both themes and both tested heights. Lighthouse also flags the theme button.
- **Impact:** a compact control lacks sufficient target size/spacing for reliable touch interaction.
- **Fix:** increase effective button hit areas and spacing; rerun WCAG 2.2 checks, not only older AA tags.

### B12 — Medium: CLI identity button accessible name omits its visible label

- **Location:** `CliHeader` in `src/components/PortfolioApp.tsx`.
- **Evidence:** Lighthouse `label-content-name-mismatch` flags `.cli-title-identity`, whose accessible name is `Exit to interface selector` rather than including the visible agent identity.
- **Impact:** voice-control users cannot reliably address the button using the text they see.
- **Fix:** include the visible label in the accessible name, with the action supplied as additional descriptive text.

### B13 — Medium: measured mobile performance is below the specification target

- **Evidence:** Lighthouse root/restored CLI **78**, profile **73**, against a target of ≥90.
- **Observed contributors:** 960ms total blocking time for root, 1,750ms for profile; profile analytics script accounts for substantial execution time, and profile image delivery reports approximately 72KiB potential savings. Root has approximately 53KiB estimated unused JavaScript.
- **Fix:** profile CPU use, split/defer noncritical interactive code, optimize the portrait delivery, and consider deferring static-page analytics. Repeat clean-state mobile production measurements before setting a release gate.
- **Caveat:** a Termux local-preview sample is not proof of real-user production scores; scores vary with device load and browser state.

### B14 — Medium: Astro dependency has unresolved security advisories

- **Evidence:** current `npm audit --json` flags Astro with three advisories: `GHSA-f48w-9m4c-m7f5`, `GHSA-7pw4-f3q4-r2p2`, `GHSA-4g3v-8h47-v7g6`; aggregate dependency severity is moderate.
- **Impact:** a known vulnerable dependency remains installed. Exploitability in these static templates was **not demonstrated**; the affected dynamic/view-transition patterns are not known to be used here.
- **Fix:** validate an upgrade on a supported build host or document a reviewed mitigation. Native Termux support blocked the earlier Astro 7 upgrade, so do not blindly change the lockfile without build testing.

### B15 — Low: configured free-router fallback is unreachable

- **Locations:** `worker/wrangler.jsonc`, `worker/src/provider.ts`, `modelCandidates`.
- **Cause:** config includes `openrouter/free`, but the adapter filters out every identifier not ending in `:free` and caps the result at three. That configured fallback is never attempted.
- **Impact:** configuration/documentation suggests a fallback path that does not exist.
- **Fix:** either explicitly support the free router with an appropriate allowlist policy, or remove it from configuration and document the three-model route accurately.

### B16 — Medium: pull requests do not run the required validation workflow

- **Location:** `.github/workflows/pages.yaml`.
- **Cause:** triggers are only `push` on `main` and manual dispatch; there is no `pull_request` validation trigger.
- **Impact:** SPEC §18.2's pre-merge test requirement is unmet. A feature PR can reach review without an automatic check, with failures discovered only after merge.
- **Fix:** add a non-deploying PR validation job/workflow with read-only permissions and no production secrets. Restrict deployment to approved main/manual events.

### B17 — Low: implementation/validation documentation is stale

- **Locations:** `SPEC.md`, `SPEC_VALIDATION.md`, related setup documentation.
- **Examples:** the spec labels the project implemented while release checks remain unresolved, and lists initial Worker authentication/deployment as remaining setup even though a Worker was deployed earlier. Older validation limitations predate the now-working native browser audit.
- **Fix:** reconcile documentation with this report, distinguish deployed Worker behavior from local revisions, and avoid claiming complete validation based only on the passing unit suite.

## 3. Earlier defects now fixed in the working tree

These are not counted among the 17 open findings.

| Earlier defect | Current evidence/status |
|---|---|
| Visual transcript overlaps/hides composer after suggested prompts disappear | Fixed; all six post-command viewport checks pass |
| Contact/résumé horizontal overflow | No page-width overflow in the current 320/768/1440 route matrix |
| Unnamed Visual mode buttons and invalid mode-group labeling | Current targeted axe checks pass |
| CLI missing H1 and earlier theme contrast failures | H1 present; no contrast failures in the current explicit dark/light chat matrix |
| Astro source assets ignored through inherited `public/` rule | Ignore rule removed; assets now appear as untracked files and still need inclusion in the reviewed commit |
| Browser trusted model-supplied source URLs/content | IDs now resolve against the trusted catalog; does not solve claim verification, B03 |
| Interrupted streams silently treated as complete | Client now requires `done`, preserves partial text and offers Retry; provenance labeling remains B09 |
| Erroring/empty HTTP-200 provider streams never tried alternatives | Adapter now supports pre-output fallback attempts; citation-only success remains B04 |
| Missing history/body bounds and unconditional history-based scope bypass | Basic bounds and narrower follow-up checks exist; B01/B05/B06/B07 remain |
| Direct unsafe preference storage access | Exception-safe preference helpers now present; storage-denied browser journey not exercised here |
| Analytics script loaded inside chat | Chat layout now excludes it; static-page analytics remains enabled |

## 4. Unverified risks and specification gaps

These are **not counted as confirmed bugs**:

- Live OpenRouter model availability, response quality, comparative intelligence and real fallback latency were not benchmarked in this pass. Mock adapter tests cannot establish the “smartest” free model.
- Current local Worker revisions were not deployed or compared end-to-end against the deployed service. Do not assume the live endpoint has these fixes.
- Real Android/iOS virtual keyboards, safe-area behavior, Safari, Firefox, screen-reader announcements and voice control need device/user testing. A reduced viewport is not a real keyboard test.
- Exhaustive keyboard navigation, long streaming transcripts, midstream mode switches, stop→immediate-new-request races and denied-storage behavior need expanded automated browser coverage.
- The scope guard and system prompt are defense in depth, not proof against prompt injection. No broad live adversarial evaluation was performed.
- Provider-level usage caps, protected GitHub environments and production secret configuration were not independently inspected. Free-only model selection does not prevent quota exhaustion or distributed abuse.
- Request-byte limits exist, but slow-body handling and streaming backpressure have not been load-tested. The shared SSE parser also lacks standalone CR-only framing coverage.
- Existing social tags use the portrait rather than a dedicated composed sharing image; a final share-card preview remains to be reviewed.
- Static-page Google Analytics enhanced-measurement/provider settings and third-party retention behavior were not audited at account level.
- The 21-combination browser matrix covers seven routes, not every one of the 18 generated pages. Build success is not a visual review of every route.

## 5. Recommended order

1. **Before release:** B01–B04 privacy/streaming/answer validation; B05–B07 scope and fallback; B14 dependency disposition; B16 pre-merge checks.
2. **Functional/accessibility polish:** B08–B12; verify keyboard, cancellation, storage-denied and actual mobile-keyboard journeys.
3. **Release evidence:** B13 repeatable performance runs; live model/fallback evaluation; B15/B17 config/docs reconciliation; verify approved deployment settings.
4. Review all changes and assets, then obtain approval before any merge/push to `main`.

## 6. Reproduction and evidence

```sh
npm run validate
# Requires local preview on :4321 and Chromium CDP on :9222:
node scripts/browser-audit.mjs
node scripts/audit-edge-cases.mjs
node scripts/audit-chat-failures.mjs
npm audit --json
npm --prefix worker audit --json
```

The edge-case scripts deliberately **record existing defects**; a successful script exit does not mean all findings are fixed. Provider diagnostic calls use local mocked responses, not real API credentials or requests.

Local evidence (ignored by Git):

- `.dev/audit/validation.log`
- `.dev/audit/report.json` and responsive screenshots
- `.dev/audit/edge-cases.json`
- `.dev/audit/chat-failures.json`
- `.dev/audit/lighthouse-landing.json`, `.dev/audit/lighthouse-profile.json`
- `.dev/audit/npm-audit.json`, `.dev/audit/worker-audit.json`

**No commit, push, merge, or deployment was performed during this audit.**
