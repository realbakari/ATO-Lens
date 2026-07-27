# ATO Lens

Local-first Australian tax, income, super, and HELP loan workspace.

## Stack

- React 19 + TypeScript, Vite
- Tailwind CSS v4
- Electron (desktop build)
- No backend server - everything runs in the browser/renderer process

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — Type-check (`tsc -b`) then production build
- `npm run lint` — oxlint
- `npm run electron:dev` — Run the desktop app against the dev server
- `npm run electron:build` — Build and package the desktop app

## Architecture

- `src/App.tsx` — top-level state, tab routing, modal orchestration
- `src/engine/` — tax calculations (brackets, Medicare levy, LITO, HELP repayment, super guarantee audit, reconciliation checks)
- `src/parser/` — document parsing providers (`rule_based`, `claude`, `openai`, `gemini`), all implementing `DocumentParserProvider` from `providerAdapter.ts`
- `src/lib/apiKeys.ts` — local storage of user-supplied AI provider API keys
- `src/lib/aiChatClient.ts` — direct browser-to-provider chat requests (Claude/OpenAI/Gemini)
- `src/lib/aiTaxOptimizer.ts` — AI-assisted deduction analysis, falls back to a local heuristic
- `src/storage/` — local persistence (`db.ts`) and the redaction/network-activity log (`privacyLog.ts`)
- `src/components/` — one folder per feature area (dashboard, income, deductions, super, help, compare, upload, chat, privacy, provenance, export, optimization)

## Conventions

- All financial figures use real ATO rates/thresholds for the relevant financial year - when changing a rate, cite the ATO source page in a comment.
- Sensitive data (TFN, Medicare number, BSB) must be redacted via `redactSensitiveData()` before logging or sending to any AI provider.
- AI provider calls must fail gracefully to a local/offline fallback (see `claudeParser.ts`, `openaiParser.ts`, `geminiParser.ts`, `LocalChatDrawer.tsx`) - never leave the user with a broken UI if there's no key or the network fails.
- Follow the existing dark theme in `src/index.css`: zinc/black surfaces, emerald as the single brand accent, amber for warnings, rose for destructive/negative. Avoid introducing additional accent colors.
- Keep comments factual and minimal - describe what the code does or why, not how it compares to other projects.

## Verification

After changes, run:

- `npm run lint`
- `npm run build`
