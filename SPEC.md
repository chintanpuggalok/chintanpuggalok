# Chintan Puggalok Portfolio — Product and Technical Specification

**Status:** Implemented on `feat/interactive-portfolio`; validation details in [`SPEC_VALIDATION.md`](SPEC_VALIDATION.md)  
**Repository:** `github.com/chintanpuggalok/chintanpuggalok`  
**Production domain:** `https://chintanpuggalok.com`  
**Hosting:** GitHub Pages  

## 1. Product vision

Build a distinctive backend-engineering portfolio that lets visitors choose how they explore Chintan's work:

1. **Full profile** — the default `/` experience: a conventional, indexable professional page that loads without the AI application.
2. **Visual mode** — an opt-in, recruiter-friendly conversational interface with cards, suggested questions, and direct navigation.
3. **Agent CLI mode** — an opt-in keyboard-first interface inspired by modern coding agents such as Pi and Codex, with commands, streaming responses, status indicators, and transparent portfolio-data lookups.

Selecting **Ask AI** opens `/ask`, where visitors choose Visual or CLI mode. Both interactive modes use the same portfolio data and AI service and can switch without losing their conversation.

The experience should feel like a modern developer tool—not a novelty “hacker terminal.” It must communicate backend depth, quantified impact, reliability, and technical leadership within the first minute.

## 2. Goals

- Position Chintan primarily as a backend and distributed-systems engineer.
- Reflect current résumé information, including the current Amazon role and previous Intuit experience.
- Surface measurable outcomes instead of presenting a generic technology list.
- Give recruiters a fast path to experience, impact, résumé, and contact information.
- Let technical visitors investigate projects and system-design experience in greater depth.
- Provide an AI assistant grounded in approved portfolio information.
- Preserve excellent performance, accessibility, SEO, and mobile usability.
- Continue deploying the static website through GitHub Pages and preserve the existing custom domain.

## 3. Non-goals for the initial release

- A general-purpose AI assistant.
- An autonomous coding agent or access to a real shell.
- User accounts or server-side conversation history.
- A content-management system.
- A vector database or complex RAG pipeline.
- Publishing confidential employer information or unapproved personal information.
- Reproducing Pi, Codex, or ChatGPT branding exactly.

## 4. Audiences

### 4.1 Recruiters and hiring managers

Need an immediate summary, current role, quantified achievements, résumé, and contact links. They should not need to understand CLI commands.

### 4.2 Backend engineers and engineering leaders

Want details about architecture, scale, reliability, event-driven systems, cloud infrastructure, and technical decisions.

### 4.3 General visitors

Need an approachable introduction, selected projects, writing, and straightforward navigation.

## 5. Core experience

### 5.1 Landing and mode selection

The default `/` route displays the complete static profile. Selecting **Ask AI** opens `/ask`, which displays a focused mode selector:

- **Launch Visual UI**
- **Launch Agent CLI**
- **View full profile**

Requirements:

- Explain each mode in one sentence.
- Support keyboard navigation and visible focus states.
- Store the selected mode in `localStorage` only after selection.
- Returning visitors may enter their previous mode directly, with an obvious mode switch.
- Support URL overrides such as `/ask?mode=visual` and `/ask?mode=cli`.
- Never trap visitors in the selector or an animation.
- Provide “Skip animation” when an intro transition is used.

### 5.2 Visual mode

A conversational interface optimized for broad accessibility.

Required elements:

- Short welcome message identifying Chintan as a backend engineer.
- Suggested prompts, including:
  - “Summarize Chintan's experience.”
  - “What are his biggest engineering outcomes?”
  - “Tell me about his Kafka and Flink experience.”
  - “What has he built at Amazon?”
  - “What did he accomplish at Intuit?”
  - “Show his GenAI projects.”
- A multiline prompt composer with send and stop controls.
- Streaming answer presentation.
- Rich response blocks for experience, projects, impact metrics, skills, and links.
- Visible citations linking answers to relevant profile sections.
- Persistent links to Full Profile, Résumé, GitHub, LinkedIn, and Contact.
- A mode switch to Agent CLI.

The visual interface should resemble a modern AI product while retaining an original identity. It must not copy ChatGPT trademarks, logos, or exact layouts.

### 5.3 Agent CLI mode

A full-height, keyboard-first portfolio client inspired by modern coding-agent TUIs.

Required layout:

- Compact header showing portfolio-agent identity and connection state.
- Scrollable transcript.
- User messages, assistant output, and tool-result blocks with distinct styling.
- Bottom bordered prompt editor.
- Footer showing mode, model/status, and keyboard hints.
- Mode switch to Visual UI.

Supported slash commands:

```text
/help          Show commands and examples
/about         Show professional summary
/impact        Show quantified outcomes
/experience    List experience or inspect a role
/projects      List selected projects
/skills        Show backend capabilities
/contact       Show approved public contact methods
/resume        Open or download the résumé if enabled
/profile       Open the full profile
/ui            Switch to Visual mode
/clear         Clear local transcript
```

Supported shell-like aliases:

```text
ls projects
ls experience
cat about
cat experience/amazon
cat experience/intuit
grep kafka experience
open profile
open resume
```

Requirements:

- Ordinary natural-language questions must also work.
- Up/down arrows navigate prompt history.
- `Tab` completes commands when possible.
- `Esc` stops an in-progress response.
- `Ctrl+L` clears the transcript without deleting persisted preferences.
- Long lines wrap correctly at every viewport width.
- Tool blocks can be collapsed and expanded.
- The interface must never imply access to the visitor's machine.

### 5.4 Full profile

A conventional professional page available without AI interaction.

Sections:

1. Hero and concise backend-engineering positioning.
2. Current role and availability/status if approved.
3. Quantified impact highlights.
4. Experience timeline.
5. Backend capabilities grouped by category.
6. Selected projects/case studies.
7. Education and recognition.
8. Technical writing.
9. Contact links and résumé action.

Initial impact candidates from the résumé include:

- Core service processing `1.4M+ leads/year` with `≤10s` latency.
- Work contributing to a `14%` form-conversion increase.
- Systems supporting `50k+` candidates.
- Cross-border offer mapping across `28+` international arcs.
- Automation with projected savings of `45,000+ hours/year`.
- Team leadership across `7 engineers`.

All wording must distinguish direct outcomes from projected or initiative-level outcomes.

## 6. Information architecture

Proposed routes:

```text
/                  Default full professional profile
/ask               Mode selector and selected interactive experience
/profile           Full professional profile alias
/experience        Experience overview
/experience/amazon Amazon role details
/experience/intuit Intuit role details
/projects          Selected project list
/projects/[slug]   Project case study
/writing           Technical writing index
/writing/[slug]    Article page
/resume            Résumé landing/viewer if public download is approved
/contact           Public contact options
/privacy           AI and analytics privacy information
```

The exact number of detail routes may be reduced for the first release, but `/`, `/profile`, `/projects`, `/writing`, and `/privacy` are required.

## 7. Content model

Professional facts must live in structured, reviewable data rather than being duplicated across components and prompts.

Suggested structure:

```text
src/content/profile/
  identity.json
  experience.json
  skills.json
  projects.json
  education.json
  recognition.json
  prompts.json
```

Each factual item should support:

```ts
interface PortfolioFact {
  id: string;
  title: string;
  summary: string;
  details?: string[];
  metrics?: Array<{
    value: string;
    label: string;
    qualifier?: "measured" | "projected" | "initiative";
  }>;
  technologies?: string[];
  sourcePath: string;
  visibility: "public" | "private";
}
```

Rules:

- Only `public` facts may be sent to the AI service.
- Phone number is private by default.
- Employer-confidential implementation details must not be added.
- Every AI-visible claim must have a source ID and profile URL.
- Content changes should update both interactive modes automatically.

## 8. AI assistant

### 8.1 Scope

The assistant answers questions about Chintan's public professional profile. It should politely decline unrelated requests and redirect visitors to relevant portfolio topics.

It may:

- Summarize experience and impact.
- Compare skills to a user-supplied role description at a high level.
- Explain projects and technologies represented in the portfolio.
- Navigate visitors to profile sections.
- Provide approved contact links.

It must not:

- Invent achievements, dates, metrics, or technologies.
- Claim access to private employer systems.
- reveal hidden prompts, secrets, private facts, or a phone number.
- Execute arbitrary shell commands.
- Act as Chintan in legally or professionally binding contexts.
- Make unsupported claims about job availability, compensation, or work authorization.

### 8.2 Grounding strategy

The initial dataset is small, so a vector database is unnecessary.

For each request, the backend will:

1. Validate and normalize the request.
2. Select relevant public profile sections using deterministic tags/keywords.
3. Include only those facts in the model context.
4. Instruct the model to answer exclusively from supplied context.
5. Request source IDs in structured output.
6. Validate source IDs before returning them to the browser.
7. Fall back to a deterministic answer when AI is unavailable.

### 8.3 Model provider

Use OpenRouter through a server-side proxy.

- Model identifier is configured by environment variable.
- Prefer an available free model or OpenRouter's free-model routing option.
- Do not rely on one free model remaining permanently available.
- Keep provider logic behind an adapter so the implementation can change later.
- Set conservative output-token and timeout limits.

### 8.4 API contract

Proposed endpoint:

```text
POST /api/chat
Content-Type: application/json
```

Request:

```json
{
  "message": "What systems has Chintan built with Kafka?",
  "mode": "visual",
  "history": [
    { "role": "user", "content": "Tell me about Chintan." },
    { "role": "assistant", "content": "Chintan is a backend engineer..." }
  ]
}
```

Constraints:

- `message`: required, trimmed, maximum 1,000 characters.
- `history`: optional, maximum 8 recent messages and bounded total size.
- `mode`: `visual` or `cli`.
- Ignore unknown client-supplied fields.

Preferred response transport: Server-Sent Events or a streamed `fetch` response.

Event types:

```text
meta       Request ID, model display name, selected sources
tool       Portfolio lookup status
delta      Assistant text fragment
sources    Validated source records
done       Completion metadata
error      Safe user-facing error
```

The API must not return provider credentials, raw system prompts, or internal error traces.

### 8.5 Deterministic local commands

Commands such as `/experience`, `ls projects`, and `open profile` should not call an LLM. They should query local structured data or navigate directly.

This provides:

- Instant command responses.
- Lower cost and rate-limit usage.
- Reliable fallback when OpenRouter is unavailable.
- More authentic agent-style tool output.

Natural-language requests may use the AI endpoint after deterministic intent checks.

## 9. Backend and security

GitHub Pages remains responsible only for static frontend hosting. An OpenRouter API key must never be embedded in frontend JavaScript or committed to the repository.

Recommended backend: **Cloudflare Worker**.

Required controls:

- Store `OPENROUTER_API_KEY` as a Worker secret.
- Configure `OPENROUTER_MODEL` separately.
- Permit production and approved preview origins through CORS.
- Apply per-IP/request rate limits.
- Limit request body size, message size, history, timeout, and output tokens.
- Add a total usage or spending limit at the provider level where available.
- Avoid logging full prompts by default.
- Return generic errors to clients and detailed errors only to protected logs.
- Sanitize all rendered Markdown and links.
- Do not render arbitrary model-generated HTML.
- Add Cloudflare Turnstile if public abuse is observed.
- Document that origin checks alone are not an abuse-prevention mechanism.

Prompt-injection defense:

- Treat visitor input as untrusted content.
- Keep tool selection server-controlled.
- Expose only read-only portfolio lookup tools.
- Validate all tool arguments and source IDs.
- Never give the model access to environment variables, network tools, or arbitrary URLs.
- Keep private profile fields out of model context entirely.

## 10. Technology

Recommended stack:

- **Astro** for static pages, routing, content, SEO, and build output.
- **React + TypeScript** for the dual-mode interactive application.
- **Custom CSS with design tokens** rather than a large UI kit.
- **Cloudflare Worker + TypeScript** for the AI proxy.
- **OpenRouter** as the initial model provider.
- **Vitest** for unit tests.
- **Playwright** for critical interaction and responsive tests, if practical in CI.

The final Astro build must be fully static and compatible with GitHub Pages.

## 11. Visual design

### 11.1 Direction

- Modern developer tooling.
- Dark-first, with a complete light theme.
- Blue/cyan accent with restrained glow.
- High-contrast typography and subtle panel borders.
- Minimal decorative noise.
- No fake CRT distortion, excessive scan lines, or hard-to-read monospace body copy.

### 11.2 Typography

- Monospace font for CLI chrome, commands, metadata, and code.
- Highly readable sans-serif font for visual-mode prose and profile content.
- Use local/system fallbacks and avoid blocking page rendering on font downloads.

### 11.3 Design tokens

Define centralized tokens for:

- Page and panel backgrounds.
- Primary, secondary, muted, success, warning, and error text.
- Normal, muted, and active borders.
- User, assistant, tool-pending, tool-success, and tool-error blocks.
- Markdown headings, links, inline code, code blocks, and citations.
- Spacing, radius, shadow, and motion durations.

### 11.4 Motion

- Stream text without making content unreasonably slow.
- Use subtle mode and panel transitions.
- Honor `prefers-reduced-motion`.
- Never delay direct navigation for an animation.
- Avoid continuous resource-heavy background animation.

## 12. Responsive behavior

### Desktop

- Optional narrow sidebar in Visual mode.
- Full transcript and composer in the primary panel.
- CLI uses available viewport height with a fixed composer/footer.

### Tablet

- Collapse navigation into a drawer.
- Preserve suggested prompts and source links.

### Mobile

- Mode cards stack vertically.
- Prompt input remains reachable when the virtual keyboard is open.
- Quick prompts use a horizontal scroll row or compact grid.
- CLI keyboard shortcuts are supplementary; all actions have touch controls.
- No horizontal page scrolling at 320px width.

## 13. Accessibility

Target WCAG 2.2 AA where practical.

Requirements:

- Semantic landmarks and heading hierarchy.
- Keyboard access to every control.
- Visible focus indicators.
- Sufficient text and border contrast.
- Screen-reader announcements for streaming status without announcing every token.
- `aria-live` regions used conservatively.
- Stop-generation control available during streaming.
- No information conveyed only through color.
- Reduced-motion support.
- Full profile content accessible without using chat.
- Dialogs trap focus correctly and restore it on close.

## 14. SEO and sharing

- Render profile content statically; do not depend on chat content for indexing.
- Use a unique title and description for every public route.
- Add canonical URLs.
- Add Open Graph and social-card metadata.
- Add Person and ProfilePage structured data where appropriate.
- Generate `sitemap.xml` and `robots.txt`.
- Preserve `CNAME` in the static output.
- Use meaningful links rather than JavaScript-only navigation.
- Avoid publishing the phone number in HTML metadata or structured data.

## 15. Privacy

The `/privacy` page should explain:

- Questions sent to the assistant are processed by the Worker and OpenRouter.
- Conversation history is not stored server-side by this application unless that policy changes.
- Local preferences and optional local chat history may be stored in the browser.
- Analytics usage and provider, if analytics remains enabled.
- Visitors should not submit sensitive information.

Approved privacy and content decisions:

- Use `chintanpuggalokbackenddev@gmail.com` as the public email.
- Do not display or send the phone number in page content or AI context.
- Publish the supplied résumé PDF as-is; visitors who download it will be able to see the phone number included in that document.
- Use the existing profile photo.
- Show that Chintan is open to opportunities.
- Keep the existing Google Analytics property, but never send chat text or model responses to analytics.
- Treat the supplied résumé content as approved public information.
- Do not enable persistent local conversation history initially.

## 16. Performance requirements

Targets for the production build on a representative mobile connection:

- Lighthouse Performance: at least 90.
- Accessibility: at least 95.
- Best Practices: at least 95.
- SEO: at least 95.
- Keep initial JavaScript focused on the interactive shell.
- Lazy-load noncritical visuals.
- Reserve image dimensions to avoid layout shift.
- Profile pages remain useful before React hydration.
- AI failures must not prevent static navigation.

## 17. Error and offline behavior

- If JavaScript fails, show links to the full profile, projects, writing, and contact.
- If the Worker is unavailable, show a concise status and deterministic prompt suggestions.
- If OpenRouter fails or rate-limits, return a grounded fallback response where possible.
- If streaming disconnects, preserve received text and offer Retry.
- Clearly distinguish “AI unavailable” from “no matching portfolio information.”
- Never expose stack traces or provider response bodies to visitors.

## 18. Deployment

### 18.1 Frontend

GitHub Actions should:

1. Install pinned Node dependencies.
2. Run formatting/type checks and tests.
3. Build the Astro static site.
4. Verify expected output, including `CNAME`.
5. Upload and deploy the artifact to GitHub Pages.

Production deployment continues on pushes to `main`.

### 18.2 Worker

Use a separate Worker deployment configuration and workflow.

- Worker secrets are configured outside Git.
- Pull requests run tests but do not receive production secrets.
- Production Worker deployment should require an explicit workflow or protected environment.
- Frontend API URL is configured per environment.
- The site should support a `workers.dev` endpoint initially and an API subdomain later.

### 18.3 Safe delivery process

Because pushes to `main` auto-deploy the website:

1. Build on a feature branch.
2. Run local checks and production build.
3. Review the diff and local preview.
4. Open or prepare a pull request.
5. Merge only after explicit approval.

No implementation work should be pushed directly to `main` without review.

## 19. Testing

### Unit tests

- Command parser and aliases.
- Portfolio-data selectors.
- Source validation.
- Request validation.
- AI-provider adapter and fallback behavior.
- Private/public field filtering.

### Component tests

- Mode selector keyboard navigation.
- Prompt submission and stop behavior.
- Tool-block expansion.
- Mode switching without conversation loss.
- Error and rate-limit states.

### End-to-end tests

- First visit → view the complete static profile → select Ask AI.
- Ask AI → choose Visual → ask suggested question.
- Ask AI → choose CLI → run `/experience`.
- Enter `cat experience/amazon` and receive local data without an API call.
- Ask a natural-language question and receive streamed output with sources.
- Switch modes and preserve transcript.
- Open full profile without interacting with AI.
- Navigate entirely by keyboard.
- Verify layouts at 320px, tablet, and desktop widths.

### Security tests

- Reject oversized bodies and histories.
- Strip unknown fields.
- Do not expose private facts.
- Reject invalid tool/source identifiers.
- Sanitize malicious Markdown and links.
- Verify the frontend bundle contains no provider key.

## 20. Analytics

If analytics remains enabled, collect only high-level product signals:

- Mode selected.
- Suggested prompt selected.
- Full profile opened.
- Project or résumé opened.
- AI success/failure category.

Do not send full question text, model answers, email addresses, or résumé content to analytics.

## 21. Delivery phases

### Phase 1 — Foundation

- Replace Hugo with Astro.
- Establish design tokens, layouts, structured profile data, and static routes.
- Preserve existing writing and custom domain.
- Implement the full profile.

### Phase 2 — Dual-mode shell

- Implement mode selector.
- Implement Visual and CLI interfaces.
- Add shared transcript state, deterministic commands, keyboard controls, and responsive behavior.
- Use mocked AI streaming.

### Phase 3 — AI integration

- Implement Cloudflare Worker.
- Connect OpenRouter.
- Add grounding, source validation, rate limits, fallbacks, and privacy messaging.

### Phase 4 — Content and polish

- Add approved project case studies.
- Finalize résumé/contact behavior.
- Add metadata and social preview image.
- Complete accessibility, performance, and cross-device testing.

### Phase 5 — Review and launch

- Review all public claims and privacy choices.
- Preview the production build.
- Approve final diff.
- Merge and monitor GitHub Pages and Worker deployment.

## 22. Definition of done

The initial release is complete when:

- Visitors land on the Full Profile and can opt into Visual UI or Agent CLI through Ask AI.
- Visitors can switch Visual/CLI modes without losing their current transcript.
- Deterministic commands work without AI.
- Natural-language questions receive grounded AI answers with validated sources.
- No provider secret exists in the static site or repository.
- Current Amazon and previous Intuit experience are represented accurately.
- The full profile is usable without AI and indexable by search engines.
- The site works at mobile and desktop sizes and is keyboard accessible.
- The Astro site builds and deploys through GitHub Pages with the existing `CNAME`.
- AI failure does not block access to portfolio content.
- Tests, build, and security checks pass.
- Public contact, résumé, and privacy choices have been explicitly approved.

## 23. Confirmed decisions and remaining setup

Confirmed:

1. Public email: `chintanpuggalokbackenddev@gmail.com`.
2. Publish the supplied résumé as-is, including the phone number contained in the PDF.
3. Use the existing profile photo.
4. Display an “open to opportunities” statement.
5. Keep the existing Google Analytics property without collecting chat content.
6. Treat the supplied résumé as approved public information.
7. Do not display the phone number elsewhere or place it in AI context.
8. Do not persist chat history across browser sessions initially.

Remaining infrastructure setup:

1. Authenticate Wrangler with Chintan's Cloudflare account.
2. Store the OpenRouter credential using `wrangler secret put OPENROUTER_API_KEY`.
3. Deploy and record the Worker endpoint after the chat API is implemented and reviewed.
