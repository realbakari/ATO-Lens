# ATO Lens Release Remediation Plans

These plans cover all ten findings selected from the 2026-07-28 release audit at commit `d7a1583`. The numbering below is execution order, not the original finding order: test and data-model foundations come before the fixes that depend on them.

All ten plans were implemented and locally verified in the working tree on 2026-07-28. The changes remain uncommitted so they can be reviewed before release.

## Execution index

| Order | Plan | Original finding covered | Priority | Effort | Depends on | Status |
|---|---|---:|---|---|---|---|
| 1 | [Plan 001 — Establish the Release Test and CI Baseline](./plan-001-release-test-and-ci-baseline.md) | 9 | P1 | M | None | Verified |
| 2 | [Plan 002 — Correct Notice of Assessment Imports](./plan-002-correct-notice-of-assessment-imports.md) | 1 | P1 | M | 001 | Verified |
| 3 | [Plan 003 — Track Figure Origins and Preserve Valid Zeroes](./plan-003-track-figure-origins.md) | 2 | P1 | L | 001, 002 | Verified |
| 4 | [Plan 004 — Version Medicare and Super Rules by Financial Year](./plan-004-version-tax-and-super-rules-by-financial-year.md) | 3 | P1 | L | 001, 003 | Verified |
| 5 | [Plan 005 — Ground Narratives and Compliance Claims in Actual Data](./plan-005-ground-narratives-and-compliance-in-data.md) | 4 | P1 | M | 001, 004 | Verified |
| 6 | [Plan 006 — Remove Unprompted Font Requests and Correct Privacy Copy](./plan-006-remove-unprompted-font-requests-and-correct-privacy-copy.md) | 5 | P1 | S | 001 | Verified |
| 7 | [Plan 007 — Enforce Redaction at Provider Boundaries](./plan-007-enforce-redaction-at-provider-boundaries.md) | 6 | P1 | M | 001, 006 | Verified |
| 8 | [Plan 008 — Unify the Release Version and Validate Tags](./plan-008-unify-release-version-and-validate-tags.md) | 7 | P1 | S | 001 | Verified |
| 9 | [Plan 009 — Upgrade Electron and the Packaging Toolchain](./plan-009-upgrade-electron-and-packaging-toolchain.md) | 8 | P1 | L | 001, 008 | Verified |
| 10 | [Plan 010 — Fix Responsive and Accessible UI Polish](./plan-010-fix-responsive-and-accessible-ui-polish.md) | 10 | P2 | L | 001, 005, 009 | Verified |

## Dependency notes

- Plan 001 is the release gate for every behavior change. Later plans add regression cases to the same test harness.
- Plan 002 fixes the immediate false-refund reproduction before Plan 003 generalises authoritative-versus-derived figures.
- Plan 003 must precede year-rule work so a newly derived estimate cannot overwrite document or manual values.
- Plan 004 supplies the rule metadata used by the super and narrative corrections in Plan 005.
- Plans 006 and 007 separate two privacy concerns: passive renderer requests/copy first, enforced outbound text redaction second.
- Plan 008 makes version checks deterministic before Plan 009 changes the packaging toolchain.
- Plan 010 follows the corrected narrative states and upgraded Electron runtime, avoiding duplicate work in `SuperSection` and shared overlay behavior.

Plans 006 and 008 may be implemented in parallel after Plan 001 if separate branches are used. Plans 004–005 and Plans 006–009 also touch mostly independent areas, but their declared dependencies still apply. Rebase and rerun the complete gate before merging.

## Release gate result

The local release gate passed:

```bash
npm ci
npm audit --omit=dev
npm audit --audit-level=high
npm run lint
npm run test:run
npm run build
```

- 44 tests passed across 15 files
- lint and production build passed
- production and full dependency audits reported zero vulnerabilities
- package/tag version validation passed for `1.0.1`
- the arm64 DMG and ZIP passed integrity checks with packaged version `1.0.1`
- the built-in Notice of Assessment sample shows a `$1,284` refund
- no passive webfont request is present
- keyboard traps, focus restoration, and responsive layouts were visually checked

## Deferred release-environment checks

- The local macOS artifact is unsigned because release signing credentials were not configured.
- Windows and Linux artifacts remain CI-only checks and were not built on this Mac.
- Vite still emits a non-blocking warning for the large main/PDF worker chunks; code splitting is a follow-up performance task.

## Review handoff

Review the working-tree changes and generated macOS artifacts before committing, signing, tagging, or publishing. No push, tag, release, or external publication was performed.
