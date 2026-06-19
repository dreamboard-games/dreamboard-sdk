# Phase 06: Agent-Runner Teaching-Bundle Hard Cut

Status: proposed

Depends on: Phase 04

Planned at SDK commit: `7b6dcb5e310b8930aa44300bb71358cf5510a34a`

Primary repository: `internal`

## Objective

Replace runner-owned published examples with materialization from the admitted
SDK reference-game source.

Agent-runner owns where examples appear in a prepared workspace. It does not
own example source, IDs, mechanics, or read-first guidance.

## Current Paths To Remove

In:

```text
apps/agent-runner/src/integrations/github-workspace.ts
```

remove:

- `VENDORED_EXAMPLE_SLUGS`;
- `copyVendoredExamples`;
- `resolvePublishedExampleSource`;
- `copyVendoredExampleDirectory`;
- fallback to `examples/published/<slug>`;
- hardcoded example bullets in `renderAgentInstructions`.

In:

```text
apps/agent-runner/src/config/app-config.ts
```

remove:

- `dreamboardPublishedExamplesRoot`;
- `DREAMBOARD_PUBLISHED_EXAMPLES_ROOT`;
- path existence validation for that setting.

## New Runner Input

Agent-runner receives one immutable source reference through its deployed
release configuration:

```ts
type AgentReferenceGameSource = {
  admissionPath: string;
  expectedAdmissionDigest: `sha256:${string}`;
};
```

For cloud runtime, the path may resolve through object storage or an artifact
package. For local runtime, it may be a local retained admission directory.
Both modes parse the same receipt and verify the same digests.

Do not accept a Git repository path as production configuration.

## Reusable Materializer

Create:

```text
apps/agent-runner/src/reference-games/
  source.ts
  materialize.ts
  render-instructions.ts
```

Target API:

```ts
export async function materializeReferenceGames(input: {
  source: VerifiedReferenceGameSource;
  workspacePath: string;
  gameIds?: readonly string[];
}): Promise<MaterializedReferenceGame[]> {
  const selected = selectGames(input.source.manifest, input.gameIds);

  for (const game of selected) {
    await extractInventorySubtree({
      archive: input.source.archive,
      inventory: input.source.manifest.payload.objects,
      sourceRoot: game.root,
      targetRoot: path.join(input.workspacePath, "examples", game.id),
    });
  }

  return selected.map(toMaterializedReferenceGame);
}
```

Rules:

- verify admission, manifest, and archive digests before extraction;
- extract only inventory-listed regular files;
- reject symlinks, traversal, absolute paths, and duplicate destinations;
- strip the source prefix so
  `examples/reference-games/<game-id>/manifest.ts` becomes
  `examples/<game-id>/manifest.ts`;
- exclude internal evidence files and generated heavy proof artifacts through
  bundle construction, not ad hoc post-copy deletion;
- preserve README, `rule.md`, `manifest.ts`, `app/`, `ui/`, `shared/`,
  `test/scenarios/`, and teaching assets.

Default to all games marked canonical by the source manifest unless workspace
size measurements justify an explicit release-config selection. Do not embed a
slug list in source code.

## Dynamic Agent Instructions

Render instruction rows from manifest metadata:

```ts
export function renderReferenceGameInstructions(
  games: readonly MaterializedReferenceGame[],
): string {
  const rows = games.map((game) => {
    const teaches = game.mechanics.join(", ");
    return `- examples/${game.id}: ${teaches}. Read ${game.readFirst.join(", ")}.`;
  });

  return [
    "Use the SDK reference examples under examples/ for concrete mechanics.",
    "Read the closest example README and its Files To Read First list.",
    "",
    ...rows,
  ].join("\n");
}
```

The generated `AGENTS.md` must not mention retired commercial or product
slugs.

## Prepared Workspace Receipt

Record:

```ts
type AgentReferenceGameMaterializationReceipt = {
  schemaVersion: 1;
  receiptType: "dreamboard.agent-reference-game-materialization";
  admissionDigest: `sha256:${string}`;
  bundleDigest: `sha256:${string}`;
  workspacePathDigest: `sha256:${string}`;
  games: Array<{
    id: string;
    target: string;
    sourceSha256: `sha256:${string}`;
  }>;
};
```

Do not record absolute workspace paths in the identity digest.

## Tests

Replace current `github-workspace.test.ts` assertions with:

- prepared workspace contains SDK canonical IDs from the fixture manifest;
- example `manifest.ts`, `app/`, `ui/`, README, and behavior scenario exist;
- `.dreamboard`, `node_modules`, and disallowed generated proof files do not
  exist;
- `AGENTS.md` is generated from mechanics and `readFirst`;
- no retired slug appears;
- digest mismatch fails before writing any files;
- traversal, symlink, duplicate path, and unknown game ID fail;
- local and cloud materializers produce identical file inventories;
- materialization receipt records the expected source admission digest.

Use a small synthetic admitted bundle fixture in unit tests. Add one integration
test against a real SDK admission artifact in the cross-repo proof lane.

## Deployment Configuration

Replace the old environment variable with immutable reference identity:

```text
DREAMBOARD_REFERENCE_GAME_ADMISSION_REF
DREAMBOARD_REFERENCE_GAME_ADMISSION_DIGEST
```

Prefer including these fields in the agent-runner release-set/candidate
manifest rather than managing independent mutable environment state.

Production startup must fail if the configured admission is missing or
invalid. Local development may require an explicit `--no-reference-games`
diagnostic mode, but production and normal agent jobs may not silently skip
teaching examples.

## Verification

```sh
pnpm --filter @dreamboard/agent-runner test:unit
pnpm --filter @dreamboard/agent-runner typecheck
pnpm --filter @dreamboard/agent-runner build
pnpm fin
pnpm verify:dev
```

Cross-repo integration:

```sh
pnpm reference-games:admit -- \
  --sdk-repo ../dreamboard-sdk \
  --source-ref <full-sdk-sha>

pnpm --filter @dreamboard/agent-runner test:integration -- \
  --reference-game-admission <admission.json>
```

Expected:

- prepared workspace contains SDK-owned canonical examples;
- generated instructions are manifest-driven;
- receipts link to the admission digest.

## Deletion Check

```sh
rg -n \
  "VENDORED_EXAMPLE_SLUGS|copyVendoredExamples|DREAMBOARD_PUBLISHED_EXAMPLES_ROOT|examples/published/(hearts|sushi-go|frontier-trails|sketchbook|artisans-guild)" \
  apps/agent-runner
```

Expected: no matches outside explicit migration-history documents.

## Exit Criteria

- Agent-runner consumes the SDK admitted artifact.
- No runner-owned example source or slug list remains.
- Agent instructions come from SDK teaching metadata.
- Prepared workspace receipts identify the exact source admission.

## STOP Conditions

Stop and report if:

- the source bundle is too large for the prepared workspace budget and no
  explicit release-config selection has been approved;
- cloud runtime cannot access an immutable admitted artifact;
- materialization would require package installation inside each copied
  example;
- the runner needs to mutate example source to make it readable.
