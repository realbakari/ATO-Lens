# Plan 004: Version Medicare and Super Rules by Financial Year

## Executor instructions

Implement after Plans 001 and 003. Verify every threshold and rate against an official ATO source at implementation time. Do not silently apply a rule from one financial year to another. If an official schedule is unavailable, represent that uncertainty in the calculation result and UI instead of guessing.

Before editing, check for drift:

```bash
git diff --stat d7a1583..HEAD -- src/engine/taxCalculator.ts src/engine/superGuaranteeAudit.ts src/types/tax.ts src/App.tsx src/components/income/IncomeSection.tsx src/components/super/SuperSection.tsx src/components/dashboard/SummaryTable.tsx src/components/dashboard/TaxReceiptView.tsx src/components/dashboard/OverviewSection.tsx src/components/export/ExportSummaryModal.tsx
```

Reconcile changes to engine return types or year labels before implementing.

## Status

- Priority: P1 — release blocker
- Effort: L
- Risk: High
- Depends on: Plans 001 and 003
- Category: Financial correctness
- Planned at: commit `d7a1583`, 2026-07-28

## Why this change

The current engine exposes a financial-year parameter but applies shared Medicare values:

```ts
const MEDICARE_LEVY_LOWER_THRESHOLD = 28011;
const MEDICARE_LEVY_UPPER_THRESHOLD = 35013;
```

The UI and super audit also describe every year as a `12.0%` SG year. Official schedules differ:

- 2024–25 Medicare single thresholds: lower `$27,222`, upper `$34,027`.
- 2024–25 Super Guarantee rate: `11.5%`.
- 2025–26 and later legislated SG rate: `12%`.

Official sources verified during planning:

- ATO Medicare levy parameters: `https://www.ato.gov.au/myTax25MedicareLevy`
- ATO Super Guarantee rates: `https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee`

The 2026–27 Medicare low-income thresholds were not found as a published official schedule during the audit. The product must not present a carried-forward threshold as exact.

Repository convention: financial-rate code comments must cite the applicable ATO source.

## Scope

In scope:

- Resolve Medicare schedules by financial year.
- Resolve SG rates by financial year.
- Propagate exact/estimated/unsupported rule status to consumers.
- Replace hard-coded `12%` and shared-year labels in calculations and UI.
- Add boundary and rendering tests.

Out of scope:

- Family/senior Medicare thresholds unless the product already collects the required facts.
- Predicting unpublished future thresholds.
- Legal or tax advice.
- Broad redesign of every tax schedule.

## Git workflow

```bash
git switch -c codex/plan-004-year-specific-rules
```

Use an imperative commit title such as `Version tax and super rules by year`. Do not push or open a pull request unless instructed.

## Implementation steps

### 1. Define rule-resolution result types

In `src/types/tax.ts` or the relevant engine module, define an explicit rule status such as:

```ts
type RuleStatus = 'exact' | 'estimated' | 'unsupported';
```

Calculation metadata must identify:

- requested financial year
- source financial year, when a latest-known schedule is deliberately used as an estimate
- status
- source URL

Avoid returning a plain number that looks authoritative when the year is unsupported.

Verify:

```bash
npm run build
```

Expected: all consumers must consciously handle the new metadata.

### 2. Add year-keyed Medicare schedules

Replace global Medicare thresholds with a year-keyed schedule resolver. At minimum, encode:

- `2024-25`: lower `$27,222`, upper `$34,027`, rate `2%`.
- `2025-26`: only after re-verifying the existing `$28,011` / `$35,013` values against an official ATO page and citing it directly.

For an unsupported year:

- Do not label a carried-forward result as exact.
- Prefer returning `amount: null` with `status: 'unsupported'` when the UI can render “estimate unavailable”.
- If existing numeric model constraints require a latest-known estimate temporarily, return it with `status: 'estimated'` and the actual source year, and show that status everywhere it is displayed.

Do not use zero to mean unavailable.

Add boundary tests immediately below, at, through, and above each threshold. Include an unsupported future year.

Verify:

```bash
npm run test:run -- src/engine/taxCalculator.test.ts
```

Expected: both supported schedules pass their own boundaries and the unsupported year is explicit.

### 3. Add a year-keyed SG rate resolver

Create one canonical `getSuperGuaranteeRate(financialYear)` helper:

- `2024-25` → `11.5%`
- `2025-26` onward → `12.0%`, within the officially legislated range confirmed at implementation

Return rule metadata instead of embedding percentage literals throughout the app. Cite the ATO SG source in the schedule definition.

Update `src/engine/superGuaranteeAudit.ts` to use the year rate when calculating expected contributions. Preserve an explicit contribution-level percentage only when the data model shows it is an authoritative employer-period value.

Verify:

```bash
npm run test:run -- src/engine/superGuaranteeAudit.test.ts
```

Expected: identical earnings produce different expected amounts in 2024–25 and 2025–26.

### 4. Propagate rule status through the calculation model

Update engine return values and `AustralianFinancialYear` persistence as needed so a consumer can distinguish:

- exact calculation
- labelled estimate using a known schedule
- unavailable calculation

Integrate with Plan 003 origins: year-rule engine values are `derived`; document/manual values remain authoritative even when the engine schedule is unsupported.

Never replace a document-reported Medicare amount with `null`, zero, or an estimate merely because a schedule is unavailable.

Verify:

```bash
npm run test:run -- src/engine/taxCalculator.test.ts src/lib/applyParsedDocument.test.ts src/lib/manualFigures.test.ts
```

Expected: a document amount survives unsupported-rule resolution while a derived field reports its status.

### 5. Remove hard-coded rule claims from the UI

Search all renderer text:

```bash
rg -n "11\\.5|12\\.0|12%|Medicare|SG" src
```

Update at least:

- `src/App.tsx`
- `src/components/income/IncomeSection.tsx`
- `src/components/super/SuperSection.tsx`
- `src/components/dashboard/SummaryTable.tsx`
- `src/components/dashboard/TaxReceiptView.tsx`
- `src/components/dashboard/OverviewSection.tsx`
- `src/components/export/ExportSummaryModal.tsx`

Rules:

- Display the selected year's actual SG percentage.
- Label estimates with the source year.
- Render “Medicare estimate unavailable for this year” for unsupported derived calculations.
- Do not claim an unsupported estimate is an ATO assessment.
- Maintain the existing zinc/black UI with emerald success, amber uncertainty, and rose negative states.

Add component assertions for 2024–25, 2025–26, and an unsupported year.

### 6. Run complete verification

```bash
npm run lint
npm run test:run
npm run build
```

Visually inspect the relevant cards for 2024–25 and 2025–26. Confirm the selected year changes both calculations and labels.

## Test plan

- Medicare threshold boundaries for every supported year.
- SG rate and expected contribution for 2024–25 and 2025–26.
- Unsupported future-year behavior without zero-as-unavailable.
- Document/manual Medicare values under an unsupported schedule.
- UI copy and amber state for estimates/unavailable rules.
- A search proving no unconditional `12%` or shared threshold remains.

## Done criteria

- Medicare schedules are resolved by financial year with official source citations.
- SG calculations and UI use a canonical year-specific rate.
- Unsupported rules cannot appear exact.
- Document/manual values retain authority under Plan 003.
- Lint, all tests, build, and visual checks pass.

## STOP conditions

Stop and report before proceeding if:

- An official ATO source cannot substantiate a value that would be presented as exact.
- The product lacks information needed to calculate a requested Medicare category.
- Supporting `null`/status results requires a wider product decision about exports or persisted schema.
- A rate change would reinterpret existing document-authoritative data.

## Maintenance notes

Treat schedules as versioned data, not scattered constants. Each annual update should add a new schedule fixture, source URL, boundary tests, and a UI test; never mutate a historical schedule in place.
