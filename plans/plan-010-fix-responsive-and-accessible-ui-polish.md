# Plan 010: Fix Responsive and Accessible UI Polish

## Executor instructions

Implement after Plans 001, 005, and 009 so the UI is tested against the corrected data states and target Electron runtime. Work from shared interaction primitives outward. Preserve the compact dark financial-workspace aesthetic while making every essential action usable by keyboard and at the Electron minimum window size.

Before editing, check for drift:

```bash
git diff --stat d7a1583..HEAD -- src/components/layout/Navbar.tsx src/components/common/Modal.tsx src/components/common/Drawer.tsx src/components/upload/UploadModal.tsx src/components/dashboard/OverviewSection.tsx src/components/income/IncomeSection.tsx src/components/deductions/DeductionsSection.tsx src/components/super/SuperSection.tsx src/components/compare/CompareYearsSection.tsx src/components/chat/LocalChatDrawer.tsx src/components/provenance/ProvenanceDrawer.tsx src/components/export/ExportSummaryModal.tsx src/components/common/EmptyWorkspaceState.tsx src/index.css
```

If overlay or navigation primitives have already been introduced, extend them instead of creating competing abstractions.

## Status

- Priority: P2 — required release polish
- Effort: L
- Risk: Medium
- Depends on: Plans 001, 005, and 009
- Category: UI / responsive design / accessibility
- Planned at: commit `d7a1583`, 2026-07-28

## Why this change

Visual smoke testing found the desktop layout polished at `1440×900`, but essential behavior degrades at narrower supported sizes:

- Electron permits `900×650`, while the financial-year selector is hidden below Tailwind's `lg` breakpoint (`1024px`).
- Navigation/toolbars can clip or horizontally scroll without a compact year control.
- `src/components/common/Modal.tsx` closes on Escape but does not consistently trap focus, make the background inert, or restore focus.
- Export and provenance overlays implement separate dialog behavior.
- The upload drop zone is a pointer-only `<div>` paired with a `className="hidden"` file input.
- Several cards/rows rely on click handlers without native keyboard semantics.

Conventions to preserve:

- Zinc/black background and card palette.
- Emerald positive/action accents, amber warnings/unknown states, rose negative states.
- Dense mono typography for figures and labels.
- Electron minimum window remains `900×650`.

## Scope

In scope:

- Keep financial-year selection available at every supported width.
- Standardise modal/drawer focus, keyboard, and semantic behavior.
- Make upload, cards, rows, toggles, inputs, and icon actions keyboard accessible.
- Correct essential responsive clipping at desktop minimum and a narrow browser viewport.
- Add interaction tests and visual QA.

Out of scope:

- A complete visual redesign.
- Lowering Electron's minimum window size.
- Rewriting all charts for screen readers beyond meaningful summaries already in scope.
- Changing financial calculations or prose.

## Git workflow

```bash
git switch -c codex/plan-010-ui-accessibility
```

Use an imperative commit title such as `Improve responsive and accessible UI`. Do not push or open a pull request unless instructed.

## Implementation steps

### 1. Add a compact financial-year control

Update `src/components/layout/Navbar.tsx` so financial-year selection remains available below `lg`:

- Keep the existing desktop control where it fits.
- Add a compact labelled `<select>` or menu for widths under `1024px`.
- Ensure the selected year, change action, and focus state are visible at `900px`.
- Avoid duplicate focusable controls at the same breakpoint.
- Keep nav overflow from hiding the selector or primary upload/export actions.

Add a component test that changes the selected year through the compact control.

Verify:

```bash
npm run test:run -- src/components/layout/Navbar.test.tsx
```

Expected: both desktop and compact variants provide the same selection behavior.

### 2. Make one accessible modal primitive

Harden `src/components/common/Modal.tsx` with:

- `role="dialog"` and `aria-modal="true"` where native `<dialog>` is not used.
- `aria-labelledby` wired to a unique title ID.
- Optional `aria-describedby` for subtitle/body help.
- Initial focus on a sensible element or the dialog container.
- Tab/Shift+Tab focus containment.
- Escape closes only the topmost open overlay.
- Background is inert or otherwise unavailable to assistive technology.
- Focus returns to the opener on close.
- Backdrop click behavior does not trigger from clicks inside the panel.

Use a native `<dialog>` only if it behaves consistently in the Electron version selected by Plan 009 and in jsdom tests; otherwise implement a small tested focus manager.

Add tests for title association, focus entry, tab wrap, Escape, and focus restoration.

### 3. Unify custom overlays and drawers

Refactor:

- `src/components/export/ExportSummaryModal.tsx`
- `src/components/provenance/ProvenanceDrawer.tsx`
- `src/components/chat/LocalChatDrawer.tsx`

Use the shared modal behavior and, if needed, create `src/components/common/Drawer.tsx` that composes the same overlay/focus contract.

Rules:

- Export is a dialog at all sizes.
- Provenance drawer is a dialog-like overlay when it blocks/overlays content.
- Chat may be a complementary region when persistently docked on desktop, but must behave as a modal/full-screen drawer when overlaid at narrow widths.
- Every icon-only close button has an accessible name.
- Only one overlay owns Escape and focus at a time.

Do not nest interactive buttons inside other buttons during refactoring.

### 4. Make file upload keyboard operable

In `src/components/upload/UploadModal.tsx`:

- Associate a visible label/button with the file input.
- Use an `sr-only` input rather than `display: none` when direct focus is intended, or make a native button the clearly labelled focus target.
- Support Enter/Space through native semantics.
- Retain drag-and-drop as an enhancement.
- Announce processing progress and errors with an appropriate live region.
- Label document-type and provider controls.
- Expose parser selection through native buttons with `aria-pressed` or a radio-group pattern.

Add tests for browse activation, parser selection, progress/error announcement, and disabled processing state.

### 5. Correct pointer-only and unlabeled controls

Audit at least:

- `src/components/dashboard/OverviewSection.tsx`
- `src/components/income/IncomeSection.tsx`
- `src/components/deductions/DeductionsSection.tsx`
- `src/components/super/SuperSection.tsx`
- `src/components/compare/CompareYearsSection.tsx`
- `src/components/common/EmptyWorkspaceState.tsx`

For each click target:

- Prefer a native `<button>`, `<a>`, `<input>`, or `<select>`.
- If a whole card is interactive, use one clear button/link layer without invalid nested controls.
- Give form fields persistent labels.
- Use `aria-pressed` for view toggles.
- Name icon-only actions.
- Ensure tables do not contain invalid button nesting.
- Add a visible `:focus-visible` ring with sufficient contrast.

Search:

```bash
rg -n "onClick=|<input|<select|<button" src/components
```

Review each result rather than mechanically adding roles to `<div>` elements.

### 6. Resolve responsive clipping

Test and adjust layout at:

- `1440×900` — standard desktop.
- `900×650` — Electron minimum.
- `390×844` — narrow web/responsive stress case.

Requirements:

- Financial-year selection and primary actions remain reachable.
- Essential navigation does not disappear behind overflow.
- Horizontal scrolling, where unavoidable for data tables, has an accessible focusable region and does not scroll the entire page.
- Modals fit within viewport with internal body scrolling and visible close/action controls.
- Drawers do not exceed viewport width/height.
- Comparison controls stack cleanly.
- Long amounts and labels do not overlap.

Prefer local responsive adjustments over globally shrinking all text.

### 7. Add automated interaction checks

Using the Plan 001 stack, test:

- compact year selector
- modal focus lifecycle
- drawer/dialog semantics
- upload keyboard path
- labelled inputs/selects
- `aria-pressed` toggles
- icon-button names

If practical, add `axe-core`/`vitest-axe` as a focused development dependency and assert no serious violations in the shared primitives and representative screens. Automated accessibility results supplement, not replace, keyboard testing.

### 8. Run visual and keyboard QA

```bash
npm run lint
npm run test:run
npm run build
```

Use the in-app browser or packaged Electron app to inspect all three target viewports. Complete the primary flow using only keyboard:

1. Select financial year.
2. Open upload.
3. Select parser/document type.
4. Choose the sample or a test file.
5. Navigate dashboard sections.
6. Open and close provenance, chat, privacy, and export overlays.
7. Confirm focus returns to each opener.

Check light/dark OS focus behavior only insofar as the app remains dark-themed.

## Test plan

- Keyboard-only end-to-end primary flow.
- Modal Tab/Shift+Tab/Escape/focus restoration.
- Nested/topmost overlay behavior.
- Screen reader landmark/name inspection for dialogs, drawers, file control, and icon buttons.
- Responsive visual inspection at `1440×900`, `900×650`, and `390×844`.
- Zoom to 200% at the Electron minimum viewport.
- Long currency values and long document names.
- Pointer drag-and-drop still works after the keyboard fix.

## Done criteria

- Financial-year selection works at `900px` and narrow browser widths.
- Shared overlays trap/restore focus and expose correct names/roles.
- Upload and all essential actions work with keyboard alone.
- No essential control is clipped at the Electron minimum size.
- Automated tests, lint, build, keyboard flow, and viewport review pass.
- Existing theme and information density remain recognisable.

## STOP conditions

Stop and report before proceeding if:

- The selected Electron runtime cannot support the chosen dialog/inert strategy reliably.
- Fixing a click target requires changing a product workflow or destructive-action confirmation.
- A chart needs a product decision about an equivalent textual data table.
- Responsive support below `900px` conflicts with a deliberate desktop-only requirement; still complete the `900×650` target.

## Maintenance notes

Build new overlays from the shared primitive and new click actions from native controls. Add the Electron minimum viewport to every release smoke test so desktop-only breakpoint regressions do not return.
