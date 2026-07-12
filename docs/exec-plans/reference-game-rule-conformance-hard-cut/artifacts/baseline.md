# Phase 00 Repository Baseline

Recorded: 2026-07-13 (Australia/Sydney)

Authority baseline: `05509e395bb5b6ec28cac4b7724a649ea9e56988`.

## Repository State

| Repository                       | Branch / upstream                                                                          | HEAD                                       | Merge base with upstream                   | Merge base with `origin/main`              | Ahead / behind | Remote                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ | -------------- | --------------------------------------------------------- |
| `/Users/mac/code/dreamboard-sdk` | `codex/browser-demo-compiled-replay-sdk` / `origin/codex/browser-demo-compiled-replay-sdk` | `05509e395bb5b6ec28cac4b7724a649ea9e56988` | `05509e395bb5b6ec28cac4b7724a649ea9e56988` | `532c52879d746fc6ed04a8b6860e9a0b87987b66` | `0 / 0`        | `https://github.com/dreamboard-games/dreamboard-sdk.git`  |
| `/Users/mac/code/dreamboard`     | `codex/recover-alpha-cli-source` / `origin/codex/recover-alpha-cli-source`                 | `906c56a11cd58ca7ba32a135a38224e6872d3d8c` | `906c56a11cd58ca7ba32a135a38224e6872d3d8c` | `b283400df059779d09b31f2ff6e30e47ca1cbe2b` | `0 / 0`        | `git@github.com:dreamboard-games/dreamboard.git`          |
| `/Users/mac/code/internal`       | `staging-control` / `origin/staging-control`                                               | `795c445cf22916a03806fd1ffe4c64051055f642` | `795c445cf22916a03806fd1ffe4c64051055f642` | `58a3666b36b38d3f11da219c2b021f4731f4793a` | `0 / 0`        | `git@github.com:dreamboard-games/dreamboard-internal.git` |

`ahead / behind` is the output of `git rev-list --left-right --count
@{upstream}...HEAD`, shown as upstream-only / HEAD-only.

## Package And Lock State

| Repository       | Relevant versions                                               | Package manager | Root lock SHA-256                                                  |
| ---------------- | --------------------------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| `dreamboard-sdk` | root and `@dreamboard-games/sdk` `0.4.0-alpha.8`                | `pnpm@10.4.1`   | `a6584ad8f1bdbcbabf5ac4b34fb43af807134822d756b57948c2fcb34fa36e30` |
| `dreamboard`     | root `0.0.1`; CLI `0.1.30-alpha.43`; CLI core `0.1.30-alpha.19` | `pnpm@10.4.1`   | `92517e20f302220f645fe82960439c5ea5da9bc44e7e8b4e595e5dcb4d3d4a6e` |
| `internal`       | root `0.0.1`                                                    | `pnpm@10.4.1`   | `32ca21893890ce11ce9b778809d606e32eb47f1eed042a7ce50ba83e3bc67335` |

The nine game-local locks are measured separately in
[source-size-baseline.md](source-size-baseline.md) and are retained provenance
inputs.

## Worktree Ownership

### SDK planning and rule slice

The SDK checkout is intentionally dirty. Its modified files are the approved
nine rule/theme briefs and READMEs, the consolidated canonical brief/docs links,
the new execution-plan family, and the narrow reference-game scanner allowance.
These are this workstream's inputs; no whole-worktree staging is implied.

The authoritative rule edits are not represented by `HEAD` yet. The commit that
first records them must be captured in the next phase receipt before any public
package or source archive claims those rules.

### Public Dreamboard

The public checkout is clean at baseline.

### Internal unrelated dirty slice

The following pre-existing internal changes are outside this plan and must not
be staged, rewritten, or used as proof:

- `apps/web/src/features/game-session/pages/DemoPage.tsx`
- `plans/README.md`
- `tests/local-aws/published-demos.test.mjs`
- `tools/perf/src/local-aws-browser-latency.test.ts`
- `tools/perf/src/targets/local-aws-browser-latency.ts`
- untracked `plans/002-sdk-only-plugin-runtime-contract.md` through
  `plans/011-thin-generated-ui-contracts.md`

Later internal edits must avoid these paths or explicitly stop if an intended
change cannot be separated safely.

## Command Evidence

All commands below exited `0`:

```text
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse --abbrev-ref --symbolic-full-name @{upstream}
git merge-base HEAD @{upstream}
git merge-base HEAD origin/main
git rev-list --left-right --count @{upstream}...HEAD
git remote get-url origin
node -p <package version projection>
shasum -a 256 pnpm-lock.yaml
```

These are local Git/source observations only. They do not prove packed-package,
CI, local-stack, staging, or production behavior.
