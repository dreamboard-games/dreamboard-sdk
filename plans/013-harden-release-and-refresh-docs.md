# 013 Harden Release Automation and Refresh Docs

- Status: Proposed
- Priority: P1
- Risk: High
- Effort: Medium
- Primary owner: Release engineering
- Depends on: 002-012
- Planned at: `d84c620`

## Summary

Finish the hardening train with immutable GitHub Action pins, least-privilege
OIDC publishing, exact-tarball promotion, current alpha documentation, and
cross-repository integration evidence.

## Current State

`.github/workflows/sdk-ci.yml` and `.github/workflows/release-alpha.yml` use
floating major tags such as:

```yaml
uses: actions/checkout@v4
uses: oven-sh/setup-bun@v2
uses: pnpm/action-setup@v4
uses: actions/setup-node@v4
```

The release workflow grants `id-token: write` at workflow scope and performs
verification and publishing in the same job.

Documentation has also drifted:

- `docs/alpha-publish.md` still references `0.3.0-alpha.1`;
- `packages/sdk/README.md` describes individual package publication despite
  the one-package architecture;
- `packages/reducer-contract/README.md` points to a nonexistent
  `infrastructure/reducer-bundle-abi` subpath;
- the root README does not clearly make `pnpm check` the authoritative local
  gate.

## Release Contract

- CI verifies the repository with one read-only `pnpm check`.
- All third-party actions are pinned to immutable full commit SHAs.
- Verification has no OIDC permission.
- Publishing receives only the verified tarball artifact.
- `id-token: write` exists only on the publish job.
- npm alpha publication uses provenance and the `alpha` dist-tag.
- docs derive versions from package metadata rather than hard-coded examples.

## Scope

### In scope

- CI and alpha workflow hardening;
- Dependabot coverage for GitHub Actions;
- exact tarball artifact handoff;
- package and alpha publishing docs;
- release notes for phases 002-012;
- local CLI/private-host integration receipts;
- final repository verification.

### Out of scope

- stable release promotion;
- changing npm organization ownership;
- publishing additional packages;
- unrelated documentation redesign.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-013-release-docs
```

Prefer two commits on one branch:

```text
Harden SDK alpha release automation
Refresh SDK alpha contract documentation
```

Keep workflow and documentation review separable. Do not publish from the
implementation branch.

## Implementation Steps

### 1. Resolve and pin every action

Replace floating tags with approved full commit SHAs and retain the human
readable tag in a comment:

```yaml
- uses: actions/checkout@<full-commit-sha> # v4.x.y
- uses: pnpm/action-setup@<full-commit-sha> # v4.x.y
- uses: actions/setup-node@<full-commit-sha> # v4.x.y
- uses: oven-sh/setup-bun@<full-commit-sha> # v2.x.y
```

Do not invent SHAs in implementation. Resolve each from the official action
repository, verify the release tag, and record the selected tag in the pull
request.

Pin artifact upload/download actions the same way.

### 2. Add GitHub Actions dependency updates

Add or extend `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

Dependabot proposes pin updates; reviewers still verify the official release
tag and changelog.

### 3. Keep CI as a thin caller

The CI workflow established in phase 001 should do:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm check
```

It must not independently maintain a partial list of build, test, lint, or
package commands.

### 4. Split alpha verification and publishing

Use job-level permissions:

```yaml
permissions:
  contents: read

jobs:
  verify:
    permissions:
      contents: read
    steps:
      # checkout, tool setup, install
      - run: pnpm check
      - run: pnpm --filter @dreamboard-games/sdk pack --pack-destination "$RUNNER_TEMP/package"
      - uses: actions/upload-artifact@<full-commit-sha> # v4.x.y
        with:
          name: sdk-package
          path: ${{ runner.temp }}/package/*.tgz

  publish:
    needs: verify
    environment: npm-alpha
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/download-artifact@<full-commit-sha> # v4.x.y
        with:
          name: sdk-package
          path: package
      - run: npm publish package/*.tgz --tag alpha --provenance
```

The publish job must not rebuild or repack. It promotes exactly the artifact
that passed verification and phase 010's consumer smoke.

### 5. Validate release inputs

Before publishing:

- assert the package version contains an alpha prerelease;
- assert the git tag matches `sdk-v<package-version>` or the repository's
  documented equivalent;
- assert the tarball contains one package;
- assert the package name is `@dreamboard-games/sdk`;
- assert the `alpha` dist-tag is the requested target.

Example:

```sh
SDK_VERSION="$(node -p "require('./packages/sdk/package.json').version")"
case "$SDK_VERSION" in
  *-alpha.*) ;;
  *) echo "Version is not an alpha prerelease: $SDK_VERSION" >&2; exit 1 ;;
esac
```

If the publish job intentionally has no checkout, place version/name metadata
in a signed or immutable artifact generated by the verify job and validate it
against the tarball's `package/package.json`.

### 6. Refresh alpha publishing documentation

Replace hard-coded stale versions with metadata-derived commands:

```sh
SDK_VERSION="$(node -p "require('./packages/sdk/package.json').version")"
npm view "@dreamboard-games/sdk@$SDK_VERSION" version
npm view "@dreamboard-games/sdk" dist-tags --json
```

Document:

- prerequisites and authentication;
- required clean SHA/tag relationship;
- `pnpm check`;
- workflow invocation;
- provenance verification;
- alpha dist-tag verification;
- rollback by dist-tag movement, not package deletion;
- local-registry testing versus public publishing.

### 7. Correct package architecture documentation

Update `packages/sdk/README.md` to state:

- `@dreamboard-games/sdk` is the published package;
- public capability boundaries are export-map subpaths;
- internal workspace packages are not independent consumer installation
  targets.

Correct reducer-contract examples:

```ts
import type { ReducerWire } from "@dreamboard-games/sdk/reducer-contract";
```

Remove the nonexistent
`@dreamboard-games/sdk/infrastructure/reducer-bundle-abi` reference.

Update the root README development section:

```sh
pnpm install --frozen-lockfile
pnpm check
```

State that `pnpm check` is read-only and authoritative.

### 8. Write hard-cut release notes

Document behavior changes from this train:

- board-local topology IDs;
- all card homes materialized, omitted home means detached;
- prototype-sensitive manifest keys rejected;
- stricter card-location invariants;
- required `GameInput.params`;
- non-negative safe-integer resource/deal semantics;
- ownership contract version 31 and strict project paths;
- plugin protocol version 2 handshake;
- bounded JSON payloads;
- corrected public export declarations.

Include migration examples instead of only labels:

```ts
// Before
submitInteraction({ playerId, interactionId });

// After
submitInteraction({ playerId, interactionId, params: {} });
```

### 9. Produce cross-repository integration receipts

Record:

- SDK commit SHA and packed tarball hash;
- public CLI commit SHA tested with ownership version 31;
- private host commit SHA tested with protocol version 2;
- preview-worker test result;
- local package/registry installation result;
- exact commands and dates.

Store the receipt under the repository's established execution-plan artifact
location if implementation governance requires it. Do not place generated
receipts in this advisory `plans/` directory unless the team explicitly
chooses that convention.

### 10. Run final clean-checkout verification

From a clean checkout:

```sh
pnpm install --frozen-lockfile
pnpm check
```

Then prove the command is read-only:

```sh
git diff --exit-code
git status --short
```

Run phase 010's exact-tarball consumer smoke and the coordinated CLI/host
integration suites one final time.

## Test Plan

Workflow validation:

- lint YAML with the repository's existing workflow checker;
- verify every `uses:` reference is a 40-character SHA;
- verify only the publish job has `id-token: write`;
- verify publish depends on verify;
- verify publish downloads rather than rebuilds the tarball;
- verify the npm command includes `--tag alpha --provenance`.

Suggested static checks:

```sh
rg 'uses: .*@(v[0-9]+|main|master)$' .github/workflows
rg -n 'id-token: write' .github/workflows
```

Documentation checks:

```sh
pnpm docs:check
rg '0\.3\.0-alpha\.1|infrastructure/reducer-bundle-abi' \
  README.md docs packages
```

Final:

```sh
pnpm check
git diff --exit-code
```

Perform a dry-run or non-publishing workflow validation first. The first real
alpha publication requires an authorized release owner and protected
`npm-alpha` environment approval.

## Done Criteria

- Every third-party action is pinned to an immutable full SHA.
- Dependabot covers GitHub Actions.
- Verification and publish are separate least-privilege jobs.
- Publish promotes the exact verified tarball with provenance.
- Alpha docs derive the current version from package metadata.
- Package architecture and reducer-contract imports are accurate.
- Release notes cover every hard contract correction.
- CLI, host, preview-worker, and packed-consumer receipts identify exact SHAs.
- `pnpm check` passes and leaves a clean checkout unchanged.

## STOP Conditions

- Stop if the exact official commit behind an action tag cannot be verified.
  Do not use a floating tag as a temporary substitute.
- Stop if npm trusted publishing or protected environment configuration is not
  established. Complete that control before granting OIDC.
- Stop if verification and publish cannot exchange the exact same tarball.
  Do not rebuild in the privileged job.
- Stop if any coordinated CLI or host repository is not compatible with the
  hard cuts. Resolve the cross-repository train before publishing.

## Maintenance

Action updates arrive through reviewed Dependabot pull requests. Every alpha
release promotes a verified tarball artifact, and documentation examples
derive the version from `packages/sdk/package.json`.
