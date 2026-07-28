# Plan 002: Correct Notice of Assessment Imports

## Executor instructions

Implement after Plan 001. Reproduce the built-in sample failure before editing, then fix the parser and application logic together. The stated assessment outcome in a Notice of Assessment is authoritative; do not manufacture an outcome from absent gross-income inputs.

Before editing, check for drift:

```bash
git diff --stat d7a1583..HEAD -- src/parser/ruleBasedParser.ts src/components/upload/sampleDocumentText.ts src/lib/applyParsedDocument.ts src/parser/ruleBasedParser.test.ts src/lib/applyParsedDocument.test.ts
```

If the parser field names or document application flow have changed, update the regression cases before implementing.

## Status

- Priority: P1 — release blocker
- Effort: M
- Risk: Medium
- Depends on: Plan 001
- Category: Correctness / document import
- Planned at: commit `d7a1583`, 2026-07-28

## Why this change

The built-in Notice of Assessment sample says:

```text
Refund $1,284
```

The local parser only recognises:

```ts
/(?:Outcome|Result) of this notice ... (CR|DR)?/i
```

When the outcome is missed, `applyParsedDocument` recalculates from a blank gross income. The audited reproduction imported taxable income `$89,670` and withholding `$24,167`, then displayed a false `$24,167` refund because gross income was still zero.

Conventions to preserve:

- Positive `assessmentResult` means refund; negative means payable.
- A Notice of Assessment may legitimately provide taxable income without gross income.
- Local parsing must remain offline.
- Parsed field values retain confidence and source text.

## Scope

In scope:

- Parse common explicit refund/payable phrases as signed outcomes.
- Preserve recognised CR/DR outcome variants.
- Prevent an incomplete Notice of Assessment from replacing its stated or existing outcome with a derived blank-input result.
- Add regression tests based on the synthetic built-in sample.

Out of scope:

- General per-field provenance and legacy migration; Plan 003.
- New AI-provider extraction behavior.
- Reconstructing gross income from taxable income.
- Changing the tax brackets or Medicare schedules.

## Git workflow

```bash
git switch -c codex/plan-002-noa-imports
```

Use an imperative commit title such as `Correct Notice of Assessment imports`. Do not push or open a pull request unless instructed.

## Implementation steps

### 1. Add parser regression cases

Extend `src/parser/ruleBasedParser.test.ts` with table-driven synthetic Notice of Assessment cases:

- `Refund $1,284` → `assessmentResult: 1284`
- `Amount payable $1,284` → `assessmentResult: -1284`
- `Outcome of this notice: $1,284 CR` → `1284`
- `Result of this notice $1,284 DR` → `-1284`

Require high confidence and source text containing the matched phrase. Reject ambiguous bare numbers rather than guessing their sign.

Verify:

```bash
npm run test:run -- src/parser/ruleBasedParser.test.ts
```

Expected before the fix: at least the `Refund` and `Amount payable` cases fail for the right reason.

### 2. Extend the local parser deliberately

In `src/parser/ruleBasedParser.ts`, extract explicit signed phrases before or alongside the existing CR/DR pattern. Keep parsing rules narrow enough that a due date, account balance, or withholding line cannot be mistaken for the assessment outcome.

Suggested precedence:

1. Explicit `Refund` phrase → positive.
2. Explicit `Amount payable`, `Amount due`, or equivalent ATO bill phrase → negative.
3. `Outcome/Result of this notice` with CR/DR.
4. No outcome field when sign is ambiguous.

Do not use a sign-less generic currency regex.

Verify:

```bash
npm run test:run -- src/parser/ruleBasedParser.test.ts
```

Expected: all four signed-outcome cases pass.

### 3. Protect document-authoritative assessment figures

Add `src/lib/applyParsedDocument.test.ts` if it does not exist. Apply the built-in Notice of Assessment sample to a blank financial year and assert:

- `taxableIncome === 89670`
- `taxWithheld === 24167`
- `medicareLevy === 1793`
- `helpRepayment === 3401`
- `assessmentResult === 1284`
- `grossIncome === 0`
- the result is never a derived `24167` refund

Then update `src/lib/applyParsedDocument.ts` so the assessment calculation is only used when it has sufficient underlying inputs and no authoritative parsed assessment exists. Use explicit presence checks (`value !== undefined`) rather than truthiness, because zero is a valid tax figure.

For a Notice of Assessment with no parsed outcome and no sufficient gross/deduction inputs, preserve the existing assessment value or leave the blank default. Do not infer a full-withholding refund.

Verify:

```bash
npm run test:run -- src/lib/applyParsedDocument.test.ts
```

Expected: the sample assertions pass and a synthetic zero-dollar outcome is preserved.

### 4. Align the built-in sample with parser coverage

Keep `src/components/upload/sampleDocumentText.ts` representative of a real phrase that the parser supports. Do not change `$1,284` merely to make the old regex pass; the parser must understand the user-facing sample.

Add a test that feeds `buildSampleDocumentText('notice_of_assessment')` through the local parser so future sample-copy changes cannot silently break the demo.

Verify:

```bash
npm run test:run -- src/parser/ruleBasedParser.test.ts src/lib/applyParsedDocument.test.ts
```

Expected: the exact built-in sample imports the expected figures.

### 5. Run release checks and a visual smoke test

```bash
npm run lint
npm run test:run
npm run build
```

Open the built application, choose “Try a sample document” for Notice of Assessment, and confirm the dashboard shows a `$1,284` refund with taxable income `$89,670`, not a `$24,167` refund.

## Test plan

- Test refund, payable, CR, DR, zero-dollar, comma, and decimal variants.
- Test a Notice of Assessment with no outcome phrase; it must not create a false refund.
- Test a non-assessment document containing the word “refund”; it must not populate `assessmentResult`.
- Apply the exact built-in sample to both a blank year and a year with an existing assessment value.
- Confirm no test or implementation invokes an AI parser or the network.

## Done criteria

- The built-in sample imports a positive `$1,284` assessment result.
- Explicit payable wording imports a negative value.
- An incomplete Notice of Assessment cannot derive a full-withholding refund from gross income zero.
- Zero is handled as a present value.
- Lint, all tests, build, and the visual smoke test pass.

## STOP conditions

Stop and report before proceeding if:

- Real supported notices use outcome wording whose sign cannot be determined.
- Correctness would require guessing gross income from taxable income.
- The fix requires overwriting a user-entered assessment figure without provenance; defer that conflict to Plan 003.
- The parser/provider adapter no longer exposes source text or document type.

## Maintenance notes

Keep explicit outcome patterns table-driven and covered by realistic synthetic phrases. When ATO notice wording changes, add the new phrase and its sign as a regression case before changing the parser.
