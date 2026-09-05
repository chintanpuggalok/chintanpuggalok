# Integration and Acceptance Test Scenarios

## Latest result

`npm run validate` passes: 52 automated tests across six files, 18 generated routes, production-asset smoke checks, phone-boundary scanning, and frontend/Worker type checks. Native Chromium acceptance tests cover first-visit selection, deterministic and streamed responses, mode switching, CLI keyboard controls, cancellation, no-JavaScript navigation, dark/light themes, and responsive layouts from 320px to 1440px. Automated axe checks report no violations on the tested routes and viewports. A real-device/cross-browser and assistive-technology walkthrough remains a launch gate; see `SPEC_VALIDATION.md`.

## Automated journeys

| ID | Scenario | Expected result | Coverage |
|---|---|---|---|
| UI-01 | First visit to `/` | Mode selector offers Visual, Agent CLI, and Full Profile | React integration |
| UI-02 | Choose Visual mode | Visual workspace loads and preference is stored locally | React integration |
| CLI-01 | Run `/experience` | Local tool result and all roles render without an AI request | React integration |
| CLI-02 | Enter `/exp` then Tab | Input autocompletes to `/experience` | React integration |
| CLI-03 | Press Ctrl+L | Transcript returns to the welcome state | React integration |
| MODE-01 | Ask locally in CLI and switch to Visual | Existing transcript remains visible | React integration |
| AI-01 | Ask a natural-language question | Streamed answer and validated citations render | UI + Worker integration |
| AI-02 | AI endpoint is unreachable | Bundled portfolio facts replace the failed request | React integration |
| API-01 | Request from an unapproved origin | Worker returns 403 | Worker integration |
| API-02 | Rate limit exceeded | Worker returns 429 with Retry-After | Worker integration |
| API-03 | Provider secret absent | Worker returns a grounded SSE fallback | Worker integration |
| API-04 | OpenRouter streams content | Worker emits meta, tool, delta, sources, and done events | Worker integration |
| PRIV-01 | Inspect AI-visible source catalog | Phone number is absent | Unit test |
| DATA-01 | Search Amazon/cross-border terms | Amazon experience is the leading source | Unit test |
| DATA-02 | Search Kafka/Flink terms | Intuit stream-processing experience is selected | Unit test |

## Build-time route checks

The production smoke test verifies successful HTTP responses for:

- `/`
- `/profile/`
- `/experience/`
- `/experience/amazon/`
- `/projects/`
- `/projects/ticketing-analysis-agent/`
- `/writing/`
- `/writing/url-forwarding/`
- `/resume/`
- `/contact/`
- `/privacy/`
- `/CNAME`
- `/sitemap-index.xml`

It also verifies that generated HTML contains canonical metadata, the approved email, résumé link, and no phone number outside the approved PDF.

## Browser acceptance

Automated by `scripts/e2e-spec.mjs`, `scripts/browser-audit.mjs`, `scripts/audit-edge-cases.mjs`, and `scripts/audit-chat-failures.mjs` where practical; physical-device and screen-reader behavior still requires manual confirmation.

1. **Responsive layout:** inspect 320px, 768px, and desktop widths; ensure no horizontal scrolling.
2. **Keyboard-only flow:** select a mode, submit prompts, switch modes, open sources, and reach Full Profile without a pointer.
3. **Reduced motion:** emulate `prefers-reduced-motion: reduce`; transitions and animated cursors become effectively instant.
4. **Streaming cancellation:** start an AI answer and press Escape or Stop; partial output remains and the interface becomes usable.
5. **Mobile keyboard:** focus the composer on a phone-sized viewport; input and Send remain visible.
6. **AI scope:** ask an unrelated question and a prompt-injection question; assistant redirects to portfolio topics without disclosing instructions.
7. **Provider outage:** make the endpoint unavailable; local grounded fallback appears with source links.
8. **Public résumé:** open and download the PDF; confirm it is the approved supplied file.
9. **No-JavaScript path:** disable JavaScript; homepage links to the static Full Profile.
10. **Screen reader:** landmarks, heading order, button names, live status, and source navigation are understandable.
