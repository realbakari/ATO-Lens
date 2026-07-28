# Plan 007: Enforce Redaction at Provider Boundaries

## Executor instructions

Implement after Plans 001 and 006. Treat the provider client as the security boundary: callers may redact for display, but no external chat request may depend on every caller remembering to do so. Preserve the existing explicit behavior that AI document parsing uploads the original PDF when the user selects that provider.

Before editing, check for drift:

```bash
git diff --stat d7a1583..HEAD -- src/storage/privacyLog.ts src/lib/aiChatClient.ts src/components/chat/LocalChatDrawer.tsx src/parser/ruleBasedParser.ts src/parser/claudeParser.ts src/parser/openaiParser.ts src/parser/geminiParser.ts src/storage/privacyLog.test.ts src/lib/aiChatClient.test.ts
```

If provider request assembly has moved, apply redaction at the final shared boundary immediately before serialisation/fetch.

## Status

- Priority: P1 — release blocker
- Effort: M
- Risk: Medium
- Depends on: Plans 001 and 006
- Category: Privacy / security
- Planned at: commit `d7a1583`, 2026-07-28

## Why this change

The application has a reusable `redactSensitiveData` helper, but chat safety currently relies on caller behavior. A multi-turn provider request contains:

- system context assembled from financial records
- prior user and assistant turns
- the current user message

Redacting only the newest displayed message can still send an earlier raw identifier. The shared `sendChatMessage` request builder must guarantee that every outbound text field is redacted.

The current TFN matching is also too broad around eight-digit sequences and can obscure legitimate financial values. Redaction should be label-aware where digit length is otherwise ambiguous.

Conventions to preserve:

- Local rule-based parsing and OCR stay offline.
- Network activity records whether a payload was redacted.
- Original PDF uploads to selected AI parsers remain an explicit, unredacted user choice.
- Sensitive values must not appear in logs or error messages.

## Scope

In scope:

- Redact system, history, and current chat text immediately before provider request serialisation.
- Improve label-aware TFN and financial-identifier patterns.
- Align privacy logging with actual outbound behavior.
- Add fetch-level tests that inspect the complete request body.

Out of scope:

- Redacting binary PDFs sent to AI document parsers.
- Claiming anonymisation or irreversible de-identification.
- Credential storage redesign.
- Network policy outside the existing AI clients.

## Git workflow

```bash
git switch -c codex/plan-007-provider-redaction
```

Use an imperative commit title such as `Enforce redaction at AI provider boundaries`. Do not push or open a pull request unless instructed.

## Implementation steps

### 1. Specify redaction behavior with synthetic fixtures

Extend `src/storage/privacyLog.test.ts` using deliberately synthetic examples for:

- Labelled 8- and 9-digit TFNs, with spaces.
- Labelled Medicare numbers.
- BSBs.
- Labelled bank account numbers.
- Email, phone, and address patterns already supported.
- Ordinary dollar amounts, financial years, and invoice/reference numbers that should remain readable.

Policy:

- Labelled TFNs are redacted.
- Retain existing safe handling for unlabelled canonical 9-digit TFN patterns only when false-positive risk is acceptable and tests define it.
- Do not redact every unlabelled eight-digit number.
- Do not corrupt `$12,345.67`, `2025-26`, percentages, or HELP balances.

Verify:

```bash
npm run test:run -- src/storage/privacyLog.test.ts
```

Expected before implementation: the new false-positive/label cases expose the current mismatch.

### 2. Harden `redactSensitiveData`

Update `src/storage/privacyLog.ts` with narrow, documented patterns. Prefer a label plus optional punctuation/spacing for ambiguous identifiers. Preserve enough surrounding text that prompts remain understandable while replacing the sensitive value consistently.

Redact filenames or network activity descriptions if they can contain a taxpayer identifier. Never include an original identifier in a thrown error or console log.

Run the redaction suite after every pattern change; regex ordering must not cause one replacement token to be reprocessed by another rule.

### 3. Redact the complete chat payload at the final boundary

In `src/lib/aiChatClient.ts`, construct a sanitised copy immediately before provider-specific JSON is created:

- redact the system prompt
- redact every prior user turn
- redact every prior assistant turn, because an assistant may have echoed an identifier
- redact the current message
- redact optional document/source labels that enter the prompt

Do not mutate React state or the caller's message array. Provider adapters must receive only the sanitised copy.

Keep local Ollama behavior consistent with the product privacy statement: if it uses the shared client, redact it too unless there is an explicit, tested user setting to opt out.

Verify:

```bash
npm run test:run -- src/lib/aiChatClient.test.ts
```

Expected: mocked fetch bodies for every supported provider contain replacement markers and no raw synthetic identifiers.

### 4. Make network logging truthful

For outbound AI chat requests, set `payloadRedacted: true` only after final-boundary redaction succeeds.

For Claude/OpenAI/Gemini PDF parsing:

- Preserve `payloadRedacted: false`, because the original PDF is uploaded.
- Make the user-triggered nature clear in the activity description.

For local parser/OCR:

- Record the activity as offline/local, not as a network request.
- Never log raw extracted text or sensitive filenames.

Add assertions around log entries where the API permits deterministic inspection.

### 5. Remove caller-only security assumptions

Review `src/components/chat/LocalChatDrawer.tsx` and parser clients. Caller-side redaction may remain for a local preview, but comments and tests must not imply it is the enforcement point.

Search all external sends:

```bash
rg -n "fetch\\(|XMLHttpRequest|sendChatMessage|logNetworkActivity" src
```

For every result, document whether the payload is:

- offline
- redacted text
- original user-selected binary
- updater traffic outside the renderer

Do not broaden this change into unsupported endpoints.

### 6. Run complete verification

```bash
npm run lint
npm run test:run
npm run build
```

Use mocked providers or a local intercepting endpoint to inspect a multi-turn request. Do not send a synthetic identifier to a real third-party API merely to verify redaction.

## Test plan

- Every provider request body with identifiers in system, old user, old assistant, and current user content.
- Immutability of the input history.
- False-positive fixtures for amounts, years, percentages, and ordinary reference numbers.
- Network activity flags for redacted chat versus raw PDF upload.
- Error/log inspection for raw identifiers.
- Local/offline behavior unchanged.

## Done criteria

- All outbound chat text is redacted at the shared final boundary.
- Prior turns and assistant echoes cannot leak a raw identifier.
- Labelled identifiers are removed without broadly destroying legitimate amounts.
- Activity logs correctly distinguish redacted text, original binary upload, and offline processing.
- Lint, all tests, build, and intercepted-payload inspection pass.

## STOP conditions

Stop and report before proceeding if:

- A provider SDK serialises data outside the shared client before redaction can run.
- Required prompt semantics cannot survive redaction without an explicit product decision.
- Tests reveal existing logs or persisted data contain raw identifiers outside this plan's scope.
- A new identifier category has unacceptable false positives without better structured input.

## Maintenance notes

Every new provider must consume the sanitised message model and pass the same body-inspection contract tests. Keep binary-upload disclosure separate from text-redaction claims.
