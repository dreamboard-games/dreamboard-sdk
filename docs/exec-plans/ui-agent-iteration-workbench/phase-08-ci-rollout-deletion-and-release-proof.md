# Phase 08: CI Rollout, Deletion, And Release Proof

Status: complete for the required Workbench foundation.

## Objective

Promote the new UI iteration system into required CI and release evidence,
delete superseded paths, and leave one documented workflow for coding agents
and implementation teams.

## 08A. Define CI tiers

### Pull request fast gate

Required for every SDK pull request:

```bash
pnpm ui:coverage:check
pnpm ui:catalog:check
pnpm ui:fixtures:check
pnpm ui:test:stories
pnpm ui:test:changed --base origin/main
```

The changed scenario lane runs:

- impacted pure Storybook interactions;
- impacted visual stories;
- impacted Workbench scenarios in Chromium desktop;
- impacted touch-capable scenarios in Chromium touch phone;
- component coverage and fixture contract checks.

If selection is incomplete or unknown, run the full Chromium Workbench suite.

### Main branch full gate

Required after merge:

```bash
pnpm ui:check
pnpm reference-games:test:packed --required
pnpm ui:test:parity
```

This runs:

- every Storybook interaction and visual baseline;
- the required Workbench set, including Hearts across Chromium desktop,
  Chromium touch phone, and WebKit phone plus desktop drag and draft;
- the isolated Hearts, Hex Network Trading, and Worker Placement Tableau packed
  reference consumers;
- Hearts source observation generation. The internal workflow owns the
  required packed real-host execution.

### Release gate

Required before SDK publication:

```bash
pnpm check
pnpm ui:release-proof
```

`ui:release-proof` checks out the internal host, uses the exact tarball that
would be published, executes Hearts real-host parity, and retains all receipts
and digests. A real-device canary is optional unless
`--require-device-canary` is explicitly supplied.

## 08B. Consolidate root commands

Final target:

```jsonc
{
  "scripts": {
    "ui:storybook": "pnpm --filter @dreamboard-games/sdk storybook",
    "ui:workbench": "node scripts/ui/open-ui-workbench.mjs",
    "ui:workbench:dev": "pnpm --filter @dreamboard-games/ui-workbench dev",
    "ui:coverage:check": "node scripts/ui/assert-component-coverage.mjs",
    "ui:catalog:check": "node scripts/ui/generate-scenario-catalog.mjs --check",
    "ui:fixtures:check": "node scripts/ui-fixtures/check-fixtures.mjs",
    "ui:test:stories": "node scripts/ui/run-story-tests.mjs",
    "ui:test:visual": "node scripts/ui/run-visual-tests.mjs",
    "ui:test": "node scripts/ui/run-ui-scenarios.mjs",
    "ui:test:changed": "node scripts/ui/run-ui-scenarios.mjs --changed",
    "ui:test:packed": "node scripts/ui/run-packed-ui-scenarios.mjs",
    "ui:test:parity": "node scripts/ui/run-ui-parity.mjs",
    "ui:check": "pnpm ui:hard-cut:check && pnpm ui:check:baseline && pnpm ui:test --scenario hearts.pass-three.mobile",
    "ui:release-proof": "node scripts/ui/create-ui-release-proof.mjs",
  },
}
```

Once the gate is stable, add `pnpm ui:check` to root `pnpm check` before
`pack:dry-run`. Keep `ui:release-proof` separate because it requires the final
packed artifact and cross-repo parity.

## 08C. Enforce time and flake budgets

Initial budgets:

| Lane                                   | Target                              |
| -------------------------------------- | ----------------------------------- |
| Focused single scenario                | under 45 seconds after server start |
| `ui:test:changed` typical component PR | under 5 minutes                     |
| Full SDK-owned `ui:check`              | under 15 minutes with CI sharding   |
| Packed reference consumer proof        | under 15 minutes                    |
| Golden real-host parity                | under 25 minutes                    |

Track p50, p95, retries, and setup time. A lane exceeding its budget for five
consecutive main runs requires owner review and a retained report.

A retry-only pass is not green release evidence. The receipt records attempt
count and first-attempt status.

## 08D. Delete superseded code and content

Delete after all Phase 07 golden scenarios pass:

SDK repository:

- generated `renderSummary` and `renderActions` authoring props;
- public `useMobileHandTrayActive` if no reviewed non-layout consumer remains;
- duplicate panel styling superseded by `Panel`;
- fixture-only global runtime singleton setup;
- browser-interaction protocol `2.0.0` compatibility code after the bounded
  migration window;
- synthetic drag tests that claim end-to-end gesture confidence. Retain narrow
  component event unit tests where they still add value;
- stale Workbench or visual runner scripts replaced by the consolidated
  commands.

Internal repository:

- editable `examples/published/frontier-trails`;
- editable `examples/published/sketchbook`;
- editable `examples/published/hearts`;
- editable `examples/published/artisans-guild`;
- `examples/published/sushi-go`;
- duplicated portable replay-step schema fields;
- old protocol `2.0.0` hard-cut expectations;
- public demo registrations and deployment paths for the retired examples.

Before deleting internal examples, confirm:

- their public demos are already removed;
- no production game instance or test job references their old package IDs;
- real designer games own the intended demo page;
- the digest-pinned reference artifact is available for parity.

Keep historical receipts and migration records.

## 08E. Add deletion guards

Example guard:

```ts
const forbiddenReferencePatterns = [
  /\brenderSummary\s*=/,
  /\brenderActions\s*=/,
  /\buseMobileHandTrayActive\s*\(/,
  /workspace:\*/,
  /examples\/published\/sushi-go/,
];

for (const file of referenceSourceFiles) {
  const source = await readFile(file, "utf8");
  for (const pattern of forbiddenReferencePatterns) {
    if (pattern.test(source)) {
      fail(`${file}: forbidden superseded UI path ${pattern}`);
    }
  }
}
```

Additional guards must verify:

- reference games are absent from demo registries;
- fixture render modules do not bundle SDK or React code;
- every interactive component has an owner and Storybook coverage, and
  runtime-aware components used by Hearts have Workbench coverage;
- browser drivers contain no text/label/role/DOM-order fallback;
- packed consumer lockfiles contain no workspace links;
- internal parity consumes the candidate digest supplied by the SDK job.

## 08F. Generate agent-facing documentation

Generate, do not hand-copy:

```text
docs/ui-agent-iteration.md
docs/reference-games.md
packages/sdk/REFERENCE.md
```

The UI agent guide must include:

1. how to map a changed component to scenarios;
2. how to open a focused Workbench route;
3. how to capture a baseline;
4. how to run desktop and mobile gestures;
5. how to interpret semantic, projection, draft, and submission digests;
6. how to run packed verification;
7. when real-host parity is required;
8. how to attach the evidence receipt to a handoff.

Example generated decision table:

| Change                       | Minimum command                                                   |
| ---------------------------- | ----------------------------------------------------------------- |
| Pure color or spacing token  | `pnpm ui:test:changed --base origin/main`                         |
| `HandView` behavior          | `pnpm ui:test --component HandView`                               |
| Pointer/drag adapter         | `pnpm ui:test --capability pointer-drag`                          |
| Runtime draft                | `pnpm ui:test --capability runtime-draft && pnpm ui:test:packed`  |
| Runtime submit               | `pnpm ui:test --capability runtime-submit && pnpm ui:test:packed` |
| Browser-interaction protocol | Full `pnpm ui:check`, Hearts packed proof, and Hearts parity      |

## 08G. Produce a release-proof receipt

Example:

```json
{
  "schemaVersion": 1,
  "kind": "dreamboard-sdk-ui-release-proof",
  "sdkVersion": "0.4.0-alpha.0",
  "sdkCommit": "f2e8c12",
  "tarballSha256": "sha256:...",
  "fixtureBundleSha256": "sha256:...",
  "referenceBundleSha256": "sha256:...",
  "browserInteractionProtocol": "3.0.0",
  "gates": {
    "componentCoverage": "passed",
    "storybookInteractions": "passed",
    "storybookVisuals": "passed",
    "workbenchMatrix": "passed",
    "packedReferenceConsumers": "passed",
    "realHostParity": "passed",
    "realDeviceCanary": "not-required"
  },
  "evidence": [
    {
      "path": "artifacts/ui/receipt.json",
      "sha256": "sha256:..."
    },
    {
      "path": "artifacts/ui-parity/receipt.json",
      "sha256": "sha256:..."
    }
  ]
}
```

The release script verifies every referenced digest and nested evidence file.
It refuses to produce a passing receipt from stale, mixed, skipped, or
metadata-only candidates.

## 08H. Close the plan

Write:

```text
docs/exec-plans/ui-agent-iteration-workbench/artifacts/plan-closeout.md
```

The closeout must include:

- final architecture and ownership;
- phase-by-phase acceptance results;
- before/after reference-game ergonomics metrics;
- CI duration and flake metrics;
- deleted APIs and paths;
- retained exceptions with owners;
- exact release-proof receipt;
- follow-up work for the separate real-designer demo pipeline.

## Expected files

SDK repository:

```text
.github/workflows/ui-check.yml
package.json
scripts/ui/create-ui-release-proof.mjs
scripts/ui/check-ui-hard-cut.mjs
scripts/ui/run-story-tests.mjs
scripts/ui/run-visual-tests.mjs
scripts/ui/run-packed-ui-scenarios.mjs
docs/ui-agent-iteration.md
docs/reference-games.md
packages/sdk/REFERENCE.md
examples/reference-games/*/package.json
examples/reference-games/*/pnpm-lock.yaml
docs/exec-plans/ui-agent-iteration-workbench/artifacts/phase-08-closeout.md
docs/exec-plans/ui-agent-iteration-workbench/artifacts/plan-closeout.md
```

Internal repository:

```text
.github/workflows/ui-parity.yml
package.json
tools/product-harness/src/ui-parity/**
examples/reference-bundle.lock.json
```

The old editable `examples/published/*` reference directories and their demo
registration files are expected deletions, not retained outputs.

## Verification

SDK:

```bash
pnpm install
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm ui:check
pnpm reference-games:test:packed
pnpm pack:dry-run
pnpm ui:release-proof
```

Internal:

```bash
pnpm check:browser-demo-compiled-replay-hard-cut
pnpm verify:ui-parity
pnpm verify:browser
```

Also run repository searches proving deleted paths and identifiers are absent.

## Acceptance criteria

- The pull request, main, and release CI tiers are required and documented.
- Root `pnpm check` includes the stable SDK-owned UI gate.
- Exact packed artifact and fixture digests flow through consumer and parity
  proof.
- Release proof records the real-device canary as `not-required` unless policy
  explicitly enables `--require-device-canary`.
- Superseded authoring APIs, local wrappers, old example source, and old demo
  registrations are deleted.
- Deletion guards prevent those paths from returning.
- Agent documentation is generated from the live component and scenario
  indexes.
- The release workflow can mint a complete Hearts release-proof receipt without
  pre-populated repository-variable file paths.
- The implementation team can hand a UI component task to an agent with a
  deterministic flow and reviewable evidence.

## Risks and controls

| Risk                                               | Control                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| Full UI gate slows ordinary development            | Changed-test fast gate, sharding, and explicit budgets             |
| Retry masks flaky gestures                         | Record first-attempt status and reject retry-only release evidence |
| Old examples are deleted before parity is credible | Require all Phase 07 golden receipts and artifact availability     |
| Generated docs drift from commands                 | Generate from package scripts and scenario indexes                 |
| Release receipt combines different candidates      | Verify SHA-256 at every artifact boundary                          |
