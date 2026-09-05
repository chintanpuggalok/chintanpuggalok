# Website follow-up audit

## Findings and local fixes

1. **Rejected conversation history reaches the model (high).** The Worker checked only the current question, then forwarded the entire client history, including irrelevant questions, refusals, and arbitrary assistant answers. This can encourage repeated refusals or uncited output, which citation validation replaces with local fallback. The Worker now retains only in-scope user questions; rejected turns and client-provided assistant answers are not replayed. Regression coverage checks recovery after an irrelevant question. Live reproduction returned a valid AI response once, so this is not a proven explanation for every reported fallback.
2. **Repeated follow-ups lose the topic (medium).** Retrieval used the immediately previous question, even when it was “Tell me more” or unrelated. Retrieval now uses the latest accepted substantive topic, skipping repeated follow-ups. Regression coverage includes an intervening unrelated turn.
3. **Model routing was nondeterministic (medium).** `openrouter/free` can select any available free model and does not guarantee answer quality. Replaced it with an explicit ordered three-model allowlist: NVIDIA Nemotron 3 Ultra, MiniMax M3, then GLM 5.2. The adapter advances on provider or citation-validation failure and stays within the frontend deadline. Deduplication happens after trimming IDs.
4. **Cross-origin Retry-After was unreadable (low).** The Worker returned the header without exposing it through CORS. It is now exposed and regression-tested.
5. **Model-quality claim was inaccurate.** The earlier claim that `openrouter/free` always chooses the best model should not be relied upon. The production configuration now uses named models in a reviewable priority order.

## Evidence

- 56 unit/integration tests pass across six files; Worker TypeScript passes.
- Build/type checks and production asset smoke passed before these Worker-only changes.
- 18 browser acceptance checks pass against production. Model responses in these browser checks are mocked, not live-provider quality tests.
- 24 production route/viewport cases: no page errors, horizontal overflow, composer overlap, or automated axe violations.
- Local dark/light and short-viewport audit completed.
- 216 generated internal links checked: no missing paths or anchor targets.
- Live request with an unrelated prior question returned HTTP 200 and `fallback:false`. This does not establish reliability over time.

## Remaining limitations

- Free-provider congestion, timeouts, missing citations, and invalid source IDs still legitimately trigger fallback. These fixes cannot guarantee that a free model answers every request.
- One moderate Astro advisory remains in the production dependency audit; see SPEC_VALIDATION.md for the static-use assessment and Android upgrade limitation.
- Previous interactive Lighthouse scores were below 90. No new performance score is claimed in this audit.
- Native mobile keyboard behavior, Safari/Firefox, and screen-reader behavior still require physical-device/manual checks. Viewport emulation is not a real keyboard test.
- Scope detection remains keyword-based, not a semantic security guarantee.

Changes are on `fix/website-audit`; they have not been deployed by this audit.
