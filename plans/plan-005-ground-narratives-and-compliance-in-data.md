# Plan 005: Ground Narratives and Compliance Claims in Actual Data

## Executor instructions

Implement after Plans 001 and 004. Every sentence presented as analysis must be derivable from the selected financial-year data or clearly labelled as general information. Remove sample-specific explanations and unsupported causal claims.

Before editing, check for drift:

```bash
git diff --stat d7a1583..HEAD -- src/engine/superGuaranteeAudit.ts src/components/super/SuperSection.tsx src/components/chat/LocalChatDrawer.tsx src/components/compare/CompareYearsSection.tsx src/engine/superGuaranteeAudit.test.ts src/components/chat/LocalChatDrawer.test.tsx src/components/compare/CompareYearsSection.test.tsx
```

If chat response generation has moved to another module, keep the logic testable outside the visual component.

## Status

- Priority: P1 — release blocker
- Effort: M
- Risk: Medium
- Depends on: Plans 001 and 004
- Category: Correctness / trust
- Planned at: commit `d7a1583`, 2026-07-28

## Why this change

The current super audit treats no expected contributions as fully compliant:

```ts
const complianceRate = totalExpected > 0
  ? ...
  : 100;
```

The local chat also states that recorded super “meets the mandatory 12.0%” without checking the audit, calculates “effective tax rate” from withholding divided by gross income instead of using the existing `effectiveTaxRate`, and assumes assessment money was credited to a bank.

The year comparison contains sample-specific claims such as:

```text
driven by salary growth and tech allowances
with new laptop and self-education items
crossed into higher HELP threshold rates ($96,420)
```

Those causes are not established by the model and can be false for imported user data.

Conventions to preserve:

- Positive assessment is a refund and negative assessment is payable.
- The app already stores `effectiveTaxRate`.
- Supporting citations should come from actual document/source metadata.
- Financial uncertainty uses neutral or amber UI, not emerald success.

## Scope

In scope:

- Represent no-data super audits explicitly.
- Make local chat responses conditional on actual values and year rules.
- Remove invented causes from year comparison narratives.
- Remove sample-data fallback when the workspace has no data.
- Add deterministic narrative tests.

Out of scope:

- Provider-boundary redaction; Plan 007.
- Adding an LLM or web search to infer causes.
- Tax advice or predictions.
- A broad copy rewrite unrelated to factual grounding.

## Git workflow

```bash
git switch -c codex/plan-005-grounded-narratives
```

Use an imperative commit title such as `Ground financial narratives in user data`. Do not push or open a pull request unless instructed.

## Implementation steps

### 1. Model super audit status explicitly

Update `src/engine/superGuaranteeAudit.ts` to return:

```ts
status: 'no_data' | 'compliant' | 'shortfall'
complianceRate: number | null
```

Policy:

- No contribution records or no auditable ordinary-time earnings → `no_data`, `null`.
- Recorded amount meeting the year-specific expected amount → `compliant`.
- Recorded amount below expected → `shortfall`.

Do not display `100%` when nothing was audited. Retain totals and the year-rule metadata from Plan 004.

Verify:

```bash
npm run test:run -- src/engine/superGuaranteeAudit.test.ts
```

Expected: no-data, exact-compliance, excess, and shortfall cases each have the correct status.

### 2. Render honest super states

Update `src/components/super/SuperSection.tsx`:

- `no_data`: neutral empty state explaining which document/data is needed.
- `compliant`: emerald only when supported by audited records.
- `shortfall`: rose/amber with the calculated difference.
- Always show the selected year's SG rate from Plan 004.

Do not describe an absence of records as employer compliance.

Add component tests for all three states.

### 3. Extract and correct local chat response logic

Move deterministic answer construction from `src/components/chat/LocalChatDrawer.tsx` into a small pure helper if needed for direct tests.

Required behavior:

- With no financial years, say no data is loaded; never substitute a literal/sample financial-year object.
- Super answers use the audit status and actual year rate.
- Effective-tax answers use `fy.effectiveTaxRate`.
- Assessment answers use sign:
  - positive → recorded refund
  - negative → amount payable
  - zero → no recorded balance
- Do not say a refund was credited to a bank unless the imported document explicitly establishes that fact.
- Document citations come from retained provenance; omit the citation when absent rather than inventing a filename.
- Avoid `NaN`/`Infinity` when gross income is zero.

Also update starter prompts so they do not hard-code `12%` for every year.

Verify:

```bash
npm run test:run -- src/components/chat/LocalChatDrawer.test.tsx
```

Expected: cases for empty data, zero gross, refund, payable, each super status, and missing provenance pass.

### 4. Replace invented comparison causes with observed changes

Update `src/components/compare/CompareYearsSection.tsx` to describe only facts supported by the two selected records.

Acceptable:

- “Gross income increased by $X (Y%).”
- “Recorded deductions decreased by $X.”
- “HELP repayment was higher by $X.”

Not acceptable without evidence:

- Naming an allowance, laptop, education item, promotion, or salary cause.
- Claiming a particular threshold crossing unless the actual engine schedule and values demonstrate it.
- Saying a change “caused” a refund outcome when multiple obligations changed.

Use correct directional language for increases, decreases, and unchanged values. Handle a zero denominator with absolute change rather than an invalid percentage.

Verify:

```bash
npm run test:run -- src/components/compare/CompareYearsSection.test.tsx
```

Expected: increase, decrease, unchanged, and zero-base comparisons render only observed facts.

### 5. Remove stale hard-coded claims

```bash
rg -n "12%|12\\.0|96,420|salary growth|tech allowances|laptop|self-education|credited to|100% Compliant" src
```

Review every match. Keep literals only in an explicit test fixture for the matching year or a source-cited schedule from Plan 004.

### 6. Run complete verification

```bash
npm run lint
npm run test:run
npm run build
```

Visually inspect:

- Empty workspace chat and super sections.
- A 2024–25 record with no contributions.
- A shortfall record.
- A refund and a payable assessment.
- A comparison where one baseline is zero.

## Test plan

- Super audit: no data, compliant, excess, shortfall.
- Local chat: no years, zero gross, each assessment sign, each super status, no document metadata.
- Comparison: increase, decrease, unchanged, zero denominator, missing data.
- Search assertions for removed sample-specific prose.
- Visual color/state check so “unknown” is not rendered as success.

## Done criteria

- No-data super records are never reported as compliant.
- Chat uses the stored effective rate and year-specific SG rate.
- Assessment messages respect sign and make no bank-transfer inference.
- Comparison prose contains no invented causes.
- Empty workspaces never use sample figures.
- Lint, tests, build, and visual checks pass.

## STOP conditions

Stop and report before proceeding if:

- A required claim cannot be grounded without changing the data model.
- Existing provenance is insufficient to name a source document.
- The product owner wants inferred explanations presented as fact.
- Plan 004 rule metadata is unavailable at the consumer boundary.

## Maintenance notes

Prefer pure narrative helpers with table-driven tests. Every new financial sentence should have a fixture proving which fields support it and a missing-data case proving it can remain silent or uncertain.
