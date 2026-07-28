# Plan 001: Establish the Release Test and CI Baseline

## Executor instructions

Implement this plan from a clean branch before changing tax calculations, parsing, privacy, packaging, or UI behavior. Read `CLAUDE.md`, `package.json`, and the touched modules first. Keep every test deterministic and offline. Do not weaken lint or TypeScript settings to make the suite pass.

Before editing, check for drift:

```bash
git diff --stat d7a1583..HEAD -- package.json package-lock.json .github/workflows/ci.yml vitest.config.ts src/test/setup.ts src/engine/taxCalculator.test.ts src/parser/ruleBasedParser.test.ts src/storage/privacyLog.test.ts
```

If those files have materially changed, reconcile this plan with the current code before continuing.

## Status

- Priority: P1 — release blocker
- Effort: M
- Risk: Low
- Depends on: None
- Category: Tests / release engineering
- Planned at: commit `d7a1583`, 2026-07-28

## Why this change

The repository currently has no automated test command. Its package scripts are limited to:

```json
"build": "tsc -b && vite build",
"lint": "oxlint",
"electron:build": "npm run build && electron-builder"
```

There is an existing `.github/workflows/ci.yml`, but it only runs `npx tsc --noEmit` and `npm run build`; it does not run the repository's linter or any behavior tests. The application calculates and imports financial figures, stores private data, and publishes desktop binaries. A successful type-check/build alone cannot catch the release-critical regressions identified in the audit.

Repository conventions to preserve:

- React 19, TypeScript, Vite, Tailwind, and Electron.
- `npm run lint` and `npm run build` are the existing required verification commands.
- Tests must not make network requests or use real identifiers, API keys, or taxpayer data.
- Tax-rule fixtures should name their financial year and cite the governing source when a rate is asserted.

## Scope

In scope:

- Add Vitest with jsdom and Testing Library.
- Add deterministic `test` and `test:run` scripts.
- Extend the existing GitHub Actions CI workflow to run install, lint, tests, and build.
- Establish representative passing unit tests for stable tax calculation, local parsing, and redaction behavior.
- Provide shared browser-test setup.

Out of scope:

- Fixing the Notice of Assessment bug; Plan 002 adds that regression case.
- Redesigning financial provenance; Plan 003 owns that behavior.
- Requiring a coverage percentage before the codebase has a measured baseline.
- Packaging or publishing release artifacts.

## Git workflow

```bash
git switch -c codex/plan-001-release-test-baseline
```

Use an imperative commit title such as `Add release test and CI baseline`. Do not push or create a pull request unless instructed.

## Implementation steps

### 1. Install the test stack

Add compatible development dependencies for:

- `vitest`
- `jsdom`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`

Add scripts with unambiguous CI behavior:

```json
"test": "vitest",
"test:run": "vitest run"
```

Do not make `npm test` enter watch mode in CI; the workflow must call `npm run test:run`.

Verify:

```bash
npm install
npm ls vitest jsdom @testing-library/react
```

Expected: all packages resolve without peer-dependency errors and `package-lock.json` is updated by npm.

### 2. Configure Vitest

Create `vitest.config.ts` using the existing Vite React setup where practical. Configure:

- jsdom for component tests.
- A setup file at `src/test/setup.ts`.
- `@testing-library/jest-dom` matchers.
- Test discovery under `src/**/*.test.{ts,tsx}`.
- Automatic mock restoration and cleanup.

Tests must run in a single command without depending on Vite's dev server, Electron, or the internet.

Verify:

```bash
npm run test:run
```

Expected at this point: Vitest starts successfully; it may report no test files until Step 3.

### 3. Add stable characterization tests

Create focused tests for behavior already intended to be correct:

- `src/engine/taxCalculator.test.ts`
  - A zero-income year produces no income tax or percentage division errors.
  - A representative supported-year income crosses the correct resident tax brackets.
  - The result is finite and internally consistent.
- `src/parser/ruleBasedParser.test.ts`
  - A synthetic text-layer document can be parsed fully offline.
  - A recognised amount preserves commas and decimals.
  - Stored/source text does not expose a synthetic labelled TFN.
- `src/storage/privacyLog.test.ts`
  - Labelled TFN, Medicare, BSB, and account examples are redacted.
  - Ordinary monetary values and financial-year strings remain readable.

Mock PDF extraction at the narrowest boundary instead of constructing a fragile binary PDF fixture. Use obviously synthetic identifiers and document that they are test-only.

Do not encode a known bug as expected behavior. Leave the Notice of Assessment `Refund $…` regression for Plan 002, where the behavior and fix land together.

Verify:

```bash
npm run test:run
```

Expected: all committed tests pass with no network calls and no unhandled console errors.

### 4. Complete the CI release gate

Update the existing `.github/workflows/ci.yml` for pushes and pull requests. Preserve its Node 20/npm-cache setup and add:

- `npm run lint`
- `npm run test:run`
- `npm run build`

Retain `npm ci` and a TypeScript check where it adds signal without duplicating a full build unnecessarily. Keep this workflow separate from the release workflow so routine pull requests do not package desktop binaries.

Verify the YAML locally with an available workflow linter, or carefully inspect indentation and expressions if none is installed.

Expected: each job uses the committed lockfile and every quality command is visible in the workflow.

### 5. Run the complete local gate

```bash
npm run lint
npm run test:run
npm run build
git status --short
```

Expected:

- Lint exits zero.
- All tests pass.
- TypeScript and Vite build successfully.
- Only the files in this plan are modified.

## Test plan

- Run the suite twice to confirm tests do not leak state.
- Run with network disabled; results must be unchanged.
- Temporarily break one assertion and confirm Vitest returns a non-zero exit code, then restore it.
- Confirm CI uses `npm ci`, not `npm install`.
- Confirm test fixtures contain no production secret, real TFN, Medicare number, bank account, or API key.

## Done criteria

- `npm run test:run`, `npm run lint`, and `npm run build` all pass.
- CI runs those commands for pushes and pull requests.
- The suite covers a stable calculation, local parser behavior, and redaction.
- There are no network-dependent or timing-dependent tests.
- No application behavior has been changed merely to satisfy the harness.

## STOP conditions

Stop and report before proceeding if:

- A test dependency requires downgrading React, TypeScript, or Vite.
- `npm install` introduces high/critical runtime vulnerabilities.
- Stable characterization tests expose a new calculation or privacy defect not covered by Plans 002–007.
- The current repository already has a different test stack or CI convention that materially conflicts with this plan.

## Maintenance notes

Every later bug fix should add its regression test in the same commit. Keep the default suite fast and offline; put packaging and signed-binary checks in the release workflow rather than Vitest.
