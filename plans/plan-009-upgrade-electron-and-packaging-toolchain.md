# Plan 009: Upgrade Electron and the Packaging Toolchain

## Executor instructions

Implement after Plans 001 and 008. Upgrade deliberately to supported non-vulnerable versions, review release notes for every major jump, and verify all three packaging targets. Do not use `npm audit fix --force` as a substitute for controlled upgrades.

Before editing, check for drift:

```bash
git diff --stat d7a1583..HEAD -- package.json package-lock.json electron/main.cjs electron/preload.js electron/updater.cjs electron-builder.yml .github/workflows/electron-release.yml
```

Re-run the audit first; advisory ranges may have changed since planning.

## Status

- Priority: P1 — release blocker
- Effort: L
- Risk: High
- Depends on: Plans 001 and 008
- Category: Security / release tooling
- Planned at: commit `d7a1583`, 2026-07-28

## Why this change

At commit `d7a1583`:

- Runtime-only `npm audit --omit=dev` is clean.
- Full `npm audit --audit-level=high` reports 29 issues: 28 high and 1 critical.
- The affected toolchain includes Electron `34.x`, electron-builder `25.1.8`, and vulnerable transitive archive tooling.
- The audit's available major upgrades pointed to Electron at least `43.2.0` and electron-builder at least `26.15.3`.

Even though many issues are development/packaging dependencies, they process untrusted project paths and create release artifacts. A new public binary should be built with a clean high/critical audit where maintained fixes exist.

Security settings to preserve from `electron/main.cjs`:

```js
nodeIntegration: false,
contextIsolation: true,
sandbox: true
```

## Scope

In scope:

- Upgrade Electron, electron-builder, and compatible updater dependencies.
- Refresh the npm lockfile.
- Adapt API/config changes required by supported versions.
- Re-run security, renderer, updater, and packaging verification.
- Preserve artifact names and update manifests.

Out of scope:

- Adding Windows code-signing credentials.
- Publishing artifacts.
- Broad dependency upgrades unrelated to the advisories unless required for compatibility.
- Weakening Electron sandbox settings.

## Git workflow

```bash
git switch -c codex/plan-009-electron-toolchain
```

Use an imperative commit title such as `Upgrade Electron release toolchain`. Do not push or publish unless instructed.

## Implementation steps

### 1. Capture the current baseline

From a clean install:

```bash
npm ci
npm audit --omit=dev
npm audit --audit-level=high
npm run lint
npm run test:run
npm run build
```

Record:

- direct and transitive vulnerable packages
- current artifact filenames/config
- updater manifest names
- packaged app version from Plan 008

Expected: runtime audit clean, full audit reproduces or improves on the planning result, and functional checks pass before upgrades.

### 2. Select maintained target versions

Consult official release notes/documentation for:

- Electron current supported stable line and breaking changes from 34.x.
- electron-builder current stable version and migration notes from 25.x.
- electron-updater compatibility with the selected builder/runtime.

Choose versions outside every reported advisory range. Use exact or normal repository-compatible ranges; do not select a version solely because audit suggests it without reviewing breaking changes.

Document target versions and relevant migration notes in the commit/PR description, not as unexplained code comments.

### 3. Upgrade direct dependencies and lockfile

Update `package.json` and run npm so `package-lock.json` is regenerated consistently.

Inspect:

```bash
npm ls electron electron-builder electron-updater tar
npm audit --audit-level=high
```

Expected:

- Selected direct versions are installed once where possible.
- No high or critical advisory remains.
- No invalid or unmet dependency appears.

If a high/critical advisory has no maintained fix, stop and document the exact package, reachability, and mitigation rather than suppressing it.

### 4. Adapt Electron and builder APIs

Review and test:

- `electron/main.cjs`
- `electron/preload.js`
- `electron/updater.cjs`
- `electron-builder.yml`
- `.github/workflows/electron-release.yml`

Preserve:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- narrow preload exposure
- relative `dist` loading in packaged mode
- optional automatic update setting
- mac arm64+x64 manifest coherence
- current DMG, ZIP, EXE, AppImage, blockmap, and `latest*.yml` publication paths

Do not enable remote module, Node in renderer, blanket certificate bypass, or disabled web security to resolve incompatibilities.

### 5. Run application tests under the new runtime

```bash
npm run lint
npm run test:run
npm run build
npm run electron:dev
```

Smoke-test:

- startup/first paint
- menu and About version
- localStorage persistence
- offline sample document import
- export
- chat drawer without provider credentials
- update-menu controls without publishing

Check the console for deprecations, CSP failures, preload errors, and renderer crashes.

### 6. Build and inspect local artifacts

On macOS, perform an unsigned local build:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build
```

Verify:

- DMG and ZIP open successfully.
- Packaged app launches.
- Version matches Plan 008.
- `hdiutil verify` passes for the DMG.
- `unzip -t` passes for the ZIP.
- updater metadata references the produced files.

Do not delete prior user artifacts broadly; build into the configured `release` directory and compare names explicitly.

### 7. Verify the CI packaging matrix

Run or request CI for macOS, Windows, and Linux without publishing:

- macOS signed/notarised path when secrets are available, plus documented unsigned fallback.
- Windows installer and updater metadata.
- Linux AppImage and updater metadata.

Confirm Plan 008's version gate runs before all builds. Check artifacts and checksums from each job.

### 8. Re-run the security gate

```bash
npm audit --omit=dev
npm audit --audit-level=high
npm run lint
npm run test:run
npm run build
```

Expected: zero high/critical audit findings and all functional checks pass.

## Test plan

- Baseline-versus-upgraded audit.
- Unit/component regression suite.
- Electron dev smoke test.
- Local macOS unsigned packaging and archive integrity.
- CI packaging on macOS, Windows, and Linux.
- Signed/notarised macOS verification when credentials exist.
- About/package/artifact/updater version consistency.
- Security preference inspection.

## Done criteria

- Electron and builder are on maintained versions outside known advisory ranges.
- `npm audit --audit-level=high` reports zero high/critical issues.
- Security preferences are not weakened.
- App, updater controls, and local persistence work under the new Electron runtime.
- All platform artifacts and updater manifests are produced as expected.
- Tests, lint, build, and release-version validation pass.

## STOP conditions

Stop and report before proceeding if:

- Any high/critical advisory remains without a reviewed mitigation.
- The upgrade requires disabling sandbox, context isolation, certificate checks, or web security.
- Artifact names or updater metadata become incompatible with already published update channels.
- A platform build cannot be verified.
- Signing/notarisation behavior changes in a way that could publish an untrusted binary as signed.

## Maintenance notes

Schedule regular Electron/toolchain upgrades rather than accumulating multiple major versions. Keep runtime-only and full audit results distinct, but gate public release tooling on unresolved high/critical findings.
