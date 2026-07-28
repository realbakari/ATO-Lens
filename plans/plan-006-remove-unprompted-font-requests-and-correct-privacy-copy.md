# Plan 006: Remove Unprompted Font Requests and Correct Privacy Copy

## Executor instructions

Implement after Plan 001. Make the renderer fully usable with system fonts and align every privacy statement with actual network behavior. This plan changes copy and passive network behavior; it does not yet change AI chat redaction logic, which belongs to Plan 007.

Before editing, check for drift:

```bash
git diff --stat d7a1583..HEAD -- index.html src/index.css tailwind.config.js src/App.tsx src/components/privacy/PrivacyModal.tsx src/components/faq/FAQSection.tsx README.md
```

Re-audit external URLs and boot logic if these files have changed.

## Status

- Priority: P1 — release blocker
- Effort: S
- Risk: Low
- Depends on: Plan 001
- Category: Privacy / UI boot
- Planned at: commit `d7a1583`, 2026-07-28

## Why this change

The app describes itself as local-first and says update checks are its only unprompted network request, but `index.html` loads remote Google fonts through preconnect and stylesheet requests. `src/App.tsx` also waits for `document.fonts.ready`, adding a boot dependency and delay for nonessential typography.

Some privacy copy overstates redaction. The original PDF is intentionally uploaded when a user chooses Claude, OpenAI, or Gemini parsing, while local parsing stores/display text after local processing. The product should state exactly what leaves the machine and when.

Conventions to preserve:

- Zinc/black visual theme.
- Monospace treatment for figures and compact labels.
- Optional AI adapters remain user-triggered.
- Automatic update checks remain user-switchable.

## Scope

In scope:

- Remove remote font requests.
- Use a robust system font stack.
- Remove webfont-dependent boot waiting.
- Correct privacy/FAQ/README claims to match actual behavior.
- Add a static regression test for renderer font URLs.

Out of scope:

- Bundling new font assets.
- Redacting multi-turn AI chat payloads; Plan 007.
- Removing user-triggered AI providers.
- Changing the GitHub update mechanism.

## Git workflow

```bash
git switch -c codex/plan-006-local-fonts-privacy-copy
```

Use an imperative commit title such as `Remove remote fonts and clarify privacy`. Do not push or open a pull request unless instructed.

## Implementation steps

### 1. Remove remote font resources

Delete from `index.html`:

- Google Fonts preconnects.
- Remote font stylesheet links.
- Inline `onload` font stylesheet tricks.
- Any `<noscript>` remote-font fallback.

Search the renderer shell:

```bash
rg -n "fonts\\.googleapis|fonts\\.gstatic|@import.+https?://|preconnect" index.html src tailwind.config.js
```

Expected: no unprompted font host remains.

### 2. Use system font stacks

Update `src/index.css` and `tailwind.config.js` so the primary stacks use fonts available on supported systems:

- Sans: system UI (`ui-sans-serif`, `system-ui`, platform fallbacks).
- Mono: `ui-monospace`, `SFMono-Regular`, `Cascadia Code`, `Roboto Mono`, `Consolas`, monospace fallbacks.

Do not list `Inter`, `Geist`, or another unbundled family first. Preserve existing typography hierarchy through weight, size, spacing, and casing rather than a remote asset.

Build and visually compare the navbar, dashboard cards, tables, modal, and chat at the Electron minimum viewport.

### 3. Remove font-dependent app boot

In `src/App.tsx`, remove any mandatory `document.fonts.ready` wait and fixed delay that exists only to hide font swapping.

If a short loader is still required for restoring local state, tie it to that real state operation and make the fallback bounded. Do not delay first paint for fonts.

Add a component test proving the workspace renders when `document.fonts` is missing or never resolves.

Verify:

```bash
npm run test:run -- src/App.test.tsx
```

Expected: initial UI becomes available without a font promise.

### 4. Make privacy language factual

Update `src/components/privacy/PrivacyModal.tsx`, `src/components/faq/FAQSection.tsx`, and `README.md` to state:

- Offline parser and OCR run on the device.
- Choosing Claude, OpenAI, or Gemini parsing uploads the original selected PDF to that provider.
- AI chat sends chat context to the selected provider; Plan 007 will guarantee provider-boundary text redaction.
- Ollama is sent to the user-configured local/self-hosted endpoint.
- Automatic update checks contact GitHub when enabled.
- After remote fonts are removed, ordinary renderer display makes no font request.
- Local storage stays on the device unless the user exports or deliberately invokes a provider.

Avoid saying all data is redacted before storage/display unless the implementation proves that exact boundary. Avoid absolute security promises.

### 5. Add a passive-network regression check

Add a small test or script under the Plan 001 harness that reads the production HTML/CSS inputs and fails if it finds an external font stylesheet, font preconnect, or CSS font import.

This check should allow documented application links and update endpoints; its target is passive renderer font loading, not every URL string in the repository.

Verify:

```bash
npm run test:run
npm run build
rg -n "fonts\\.googleapis|fonts\\.gstatic" dist
```

Expected: tests pass and the production renderer contains no Google font host.

### 6. Run complete verification

```bash
npm run lint
npm run test:run
npm run build
```

Launch with network disabled and confirm first paint, icons, layouts, privacy modal, and FAQ remain usable.

## Test plan

- Static scan of `index.html`, CSS, configuration, and built `dist`.
- App boot with unavailable `document.fonts`.
- Offline visual smoke test.
- Copy review against local parser, AI parser, chat, Ollama, export, and updater boundaries.
- Browser/devtools network panel: no request occurs on initial renderer load except a documented update check initiated by Electron when enabled.

## Done criteria

- No remote font request or preconnect exists.
- App boot no longer waits on remote typography.
- System stacks retain a coherent UI.
- Privacy copy accurately distinguishes offline, provider upload, chat, update, export, and local storage behavior.
- Lint, tests, build, offline boot, and network inspection pass.

## STOP conditions

Stop and report before proceeding if:

- Product branding requires a specific font and no licensed local asset is available.
- Network inspection finds another unprompted renderer request not covered by the documented updater.
- Privacy copy cannot be made accurate without first changing behavior assigned to Plan 007.
- Removing the font wait exposes a separate asynchronous state-restoration bug.

## Maintenance notes

Any future third-party asset must be bundled or explicitly documented as a network dependency. Treat privacy copy as a contract: update it in the same change whenever a data or network boundary changes.
