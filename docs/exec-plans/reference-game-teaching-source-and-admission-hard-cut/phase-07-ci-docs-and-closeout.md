# Phase 07: CI, Documentation, And Closeout

Status: proposed

Depends on: Phases 05 and 06

Planned at SDK commit: `7b6dcb5e310b8930aa44300bb71358cf5510a34a`

Primary repositories: `dreamboard-sdk`, `internal`

## Objective

Make the new boundary permanent through generated documentation, static
deletion guards, exact cross-repo proof, and retained closeout receipts.

## SDK Documentation Cutover

Update:

```text
AGENTS.md
examples/reference-games/README.md
docs/reference/canonical-examples.md
docs/reference/ui-iteration-loops.md
docs/reference/ui-workbench-behavioral-proof.md
docs/architecture/ui-test-surfaces.md
docs/reference-games.md
docs/ui-agent-iteration.md
```

Generated files must be updated through their owning generators.

The docs must teach:

- open the game root, not `demo-workspace/`;
- start with README `Files To Read First`;
- behavior scenarios are reducer authority;
- UI scenarios select behavior plus browser replay;
- Workbench fixtures are generated and must not be edited;
- source bundle and admission digests are separate identities;
- demo release and agent-runner consume the same admitted source.

## Internal Documentation Cutover

Update:

```text
apps/agent-runner operational docs
docs/references/cursor-cloud-agent-game-builder.md
docs/references/aws-staging-source-release.md
docs/exec-plans/demo-release-input-admission-and-sdk-authority-hard-cut/
```

Remove active instructions for:

- runner-owned published examples;
- `DREAMBOARD_PUBLISHED_EXAMPLES_ROOT`;
- demo source branch resolution after admission;
- public source cloning in CodeBuild;
- `demo-workspace` demo packaging.

## SDK Static Guards

Add or extend `pnpm ui:hard-cut:check` and `reference-games:check` to reject:

```text
examples/reference-games/*/demo-workspace
examples/reference-games/*/src/reference-game.mjs
examples/reference-games/*/src/ui.mjs
examples/reference-games/*/scenarios/coverage.json
examples/reference-games/shared/reference-reducer.mjs
examples/reference-games/shared/reference-ui.mjs
```

Reject package scripts containing:

```text
node src/reference-game.mjs
node scenarios/verify.mjs
```

Reject fixture source metadata that lacks
`referenceGameSourceDigest`.

## Internal Static Guards

Add:

```text
pnpm check:reference-game-source-authority
```

It rejects:

- `VENDORED_EXAMPLE_SLUGS`;
- `copyVendoredExamples`;
- `DREAMBOARD_PUBLISHED_EXAMPLES_ROOT`;
- runner fallback to `examples/published`;
- demo build source-ref flags after admission;
- CodeBuild SDK source clone;
- `demo-workspace` assumptions;
- downstream receipts that omit source admission digest.

Example scanner:

```js
const forbidden = [
  "VENDORED_EXAMPLE_SLUGS",
  "copyVendoredExamples",
  "DREAMBOARD_PUBLISHED_EXAMPLES_ROOT",
  "demo-workspace/ui/index.tsx",
];

for (const match of await scanTrackedSource(forbidden)) {
  if (!isHistoricalPlanPath(match.path)) {
    errors.push(`${match.path}: reintroduces ${match.pattern}`);
  }
}
```

Historical plans may name deleted paths. Live source, active docs, tests, and
deployment config may not.

## Three-Consumer Consistency Proof

Add a cross-repo integration script that consumes one source admission and
produces:

1. required Workbench receipt;
2. Hearts demo-release input/build receipt;
3. agent-runner workspace materialization receipt.

Assert:

```ts
expect(workbench.referenceGameSource.bundleDigest).toBe(bundleDigest);
expect(demo.referenceGameSourceAdmission.bundleDigest).toBe(bundleDigest);
expect(agent.referenceGameSourceAdmission.bundleDigest).toBe(bundleDigest);

expect(demo.referenceGameSourceAdmission.admissionDigest).toBe(
  agent.referenceGameSourceAdmission.admissionDigest,
);
```

The Workbench receipt does not need the internal admission digest because it
can run in the public repository. It must record the source bundle digest.

## Retained Closeout

Create:

```text
docs/exec-plans/reference-game-teaching-source-and-admission-hard-cut/
  artifacts/
    phase-07-closeout.md
    plan-closeout.md
```

Record:

- SDK and internal full Git SHAs;
- exact public SDK version and integrity;
- source `bundleDigest`;
- source `archiveSha256`;
- source `admissionDigest`;
- Workbench receipt path and digest;
- packed consumer receipt path and digest;
- demo release input/build receipt paths and digests;
- agent-runner materialization receipt path and digest;
- deletion scan output;
- verification commands and results.

Do not retain credentials, registry tokens, raw environment dumps, or absolute
operator home paths.

## Final Verification

SDK:

```sh
mise exec node@24 -- pnpm format:check
mise exec node@24 -- pnpm lint
mise exec node@24 -- pnpm typecheck
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:coverage:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- pnpm ui:test
mise exec node@24 -- pnpm ui:test:runtime-visual
mise exec node@24 -- pnpm ui:hard-cut:check
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm check
```

Internal:

```sh
pnpm check:reference-game-source-authority
pnpm check:demo-release-input-authority
pnpm --dir packages/release-contract test
pnpm --filter @dreamboard/agent-runner test:unit
pnpm staging:demo-release:test
pnpm fin
pnpm verify:dev
```

Cross-repo:

```sh
pnpm reference-games:cross-repo-proof -- \
  --sdk-repo ../dreamboard-sdk \
  --source-ref <full-sdk-sha>
```

Expected:

- all commands exit 0;
- all three consumer receipts agree on the source digest;
- demo and agent receipts agree on the admission digest;
- deletion guards report no live violations.

## Plan Done Criteria

- [ ] All nine examples are root teaching workspaces.
- [ ] All legacy fixture-sidecar source is deleted.
- [ ] Real reducers and real UI produce Workbench fixtures.
- [ ] Packed verification proves real workspaces.
- [ ] SDK source manifest and deterministic bundle are stable.
- [ ] Internal source admission binds exact source and SDK package bytes.
- [ ] Demo release consumes the source admission.
- [ ] Agent-runner consumes the source admission.
- [ ] No hardcoded example slug or private source fallback remains.
- [ ] Docs teach only the new path.
- [ ] Static guards reject every removed path.
- [ ] Retained closeout proves one digest chain through all consumers.

## STOP Conditions

Stop and report if:

- any required gate is skipped because it is slow or operationally
  inconvenient;
- demo release and agent-runner cannot use the same source admission;
- the cross-repo proof needs a mutable branch or active-worktree file;
- a deleted path remains necessary for a live consumer;
- public docs or generated agent instructions still teach the old source
  model.
