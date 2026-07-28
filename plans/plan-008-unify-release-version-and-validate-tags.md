# Plan 008: Unify the Release Version and Validate Tags

## Executor instructions

Implement after Plan 001. Make `package.json` the single application-version source and fail the release workflow before building when a tag or manual input disagrees. Do not publish or push a tag while implementing this plan.

Before editing, check for drift:

```bash
git diff --stat d7a1583..HEAD -- package.json electron/main.cjs .github/workflows/electron-release.yml scripts/check-release-version.mjs scripts/check-release-version.test.ts electron-builder.yml
```

If release inputs, artifact naming, or About-panel code have changed, trace every version consumer before editing.

## Status

- Priority: P1 — release blocker
- Effort: S
- Risk: Low
- Depends on: Plan 001
- Category: Release engineering
- Planned at: commit `d7a1583`, 2026-07-28

## Why this change

The package version is:

```json
"version": "1.0.1"
```

But `electron/main.cjs` hard-codes both About-panel fields to `1.0.0`:

```js
applicationVersion: '1.0.0',
version: '1.0.0',
```

The release workflow also accepts a tag or optional manual version and uses it to name a draft release without first proving that it matches the packaged application. This can publish correctly built binaries under the wrong release label.

Conventions to preserve:

- Release tags use a leading `v`.
- `electron-builder` reads package metadata.
- macOS builds both architectures in one job so `latest-mac.yml` remains coherent.
- Releases remain drafts until explicitly published.

## Scope

In scope:

- Use Electron's runtime package version in the About panel.
- Add a cross-platform release-version validation script.
- Gate every packaging job on the validated version.
- Use the validated output for release naming/tagging.
- Test tag and manual-dispatch edge cases.

Out of scope:

- Incrementing `1.0.1` to a new version.
- Creating a tag, release, commit, or pull request.
- Dependency upgrades; Plan 009.
- Changing artifact formats.

## Git workflow

```bash
git switch -c codex/plan-008-release-version
```

Use an imperative commit title such as `Validate release version before packaging`. Do not push, tag, or create a release unless instructed.

## Implementation steps

### 1. Remove About-panel version literals

In `electron/main.cjs`, read the application version after Electron is ready:

```js
const applicationVersion = app.getVersion();
```

Use that value for both `applicationVersion` and `version` in `app.setAboutPanelOptions`.

Do not import a second copied version constant. In development and packaged builds, `app.getVersion()` should resolve from package metadata.

Verify:

```bash
rg -n "1\\.0\\.0|applicationVersion|app\\.getVersion" electron/main.cjs
```

Expected: the About panel has no version literal.

### 2. Add a portable validation script

Create `scripts/check-release-version.mjs`. It must:

- Read and validate `package.json.version`.
- Accept a release reference/version from a command argument or a documented environment variable.
- Normalise exactly one optional leading `v`.
- Reject an empty tag-triggered value.
- Reject multiple `v` prefixes, whitespace, malformed semver, or any value not exactly equal to the package version.
- Print a machine-readable validated version only on success.
- Exit non-zero with a clear message on mismatch.

Keep it Node-only and cross-platform; do not rely on Bash parameter expansion so Windows runners can use it.

Add an npm script such as:

```json
"release:check-version": "node scripts/check-release-version.mjs"
```

### 3. Test the validator

Under the Plan 001 test harness, add cases:

- `1.0.1` succeeds for package `1.0.1`.
- `v1.0.1` succeeds and returns `1.0.1`.
- `1.0.0`, `vv1.0.1`, whitespace, empty tagged input, and malformed semver fail.
- Manual dispatch with no input follows one documented behavior:
  - either use package version explicitly, or
  - fail and require an exact input.

Prefer using the package version for an empty manual dispatch only if the workflow clearly shows that value before packaging.

Verify:

```bash
npm run test:run -- scripts/check-release-version.test.ts
npm run release:check-version -- v1.0.1
```

Expected: tests pass and the command prints `1.0.1`.

### 4. Gate the release workflow

Add a `verify-version` job at the start of `.github/workflows/electron-release.yml`:

- Checkout.
- Setup Node 20.
- Derive the requested value from tag ref or manual input without shell-specific parsing.
- Run the validator.
- Expose the validated package version as a job output.

Make `build-mac`, `build-windows`, and `build-linux` depend on `verify-version`. The build matrix must not begin on mismatch.

Make `publish` consume the verified output for:

- draft release name
- tag selection for manual dispatch, if the workflow supports it
- any versioned artifact checks

Do not recompute the version independently in the publish job.

### 5. Verify packaged metadata

Add a post-package check appropriate to each platform, at minimum:

- macOS: read `CFBundleShortVersionString` from packaged `Info.plist`.
- Windows/Linux: inspect builder metadata or artifact names plus package metadata using a portable script.

Fail if packaged metadata differs from the verified version. Preserve existing artifact paths and updater manifests.

### 6. Run complete verification

```bash
npm run lint
npm run test:run
npm run build
npm run release:check-version -- v1.0.1
```

Review workflow dependencies and expressions. If available, validate the workflow with `actionlint`.

## Test plan

- Tag input with and without a single `v`.
- Mismatch, malformed, empty, and whitespace inputs.
- Manual dispatch behavior.
- About panel in a packaged build.
- `Info.plist` version versus `package.json`.
- Workflow dependency graph: no packaging job can skip validation.

## Done criteria

- `package.json` is the application-version source.
- About panel displays `app.getVersion()`.
- A mismatched tag/input fails before packaging.
- Release naming and metadata use one validated output.
- Tests, lint, build, and workflow inspection pass.

## STOP conditions

Stop and report before proceeding if:

- A platform requires a distinct version scheme not representable by package semver.
- Existing updater metadata intentionally uses a different version.
- Manual dispatch cannot target a deterministic tag without a product decision.
- A workflow change would publish a non-draft release or overwrite an existing release.

## Maintenance notes

Future release preparation should update only `package.json`/lockfile version, then create the matching `vX.Y.Z` tag. Keep the validator small enough to run locally and in every packaging job.
