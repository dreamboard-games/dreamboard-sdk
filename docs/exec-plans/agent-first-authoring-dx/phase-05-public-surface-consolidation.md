# Phase 5: Public Surface Consolidation

Status: closed on 2026-06-14. Closeout receipt:
[`artifacts/phase-05-closeout-20260614.md`](artifacts/phase-05-closeout-20260614.md).

## Objective

Shrink the documented authoring vocabulary. The `/reducer` facade currently
exports ~340 names; roughly 200 are type-extraction utilities in four parallel
taxonomies (`XOfManifest`, `XOfTable`, `XOfState`, `XOfDefinition`, plus
`Resolved*Location` and `Runtime*` structural types). Workspaces rarely need
any of them — the generated `manifest-contract.ts` already exports the clean
names (`CardId`, `EdgeId`, `PlayerId`, …), and after phases 1–2 the bound
authoring object removes the remaining reasons to reach for extraction types.

Move the extraction taxonomy to a new `./reducer/advanced` subpath consumed
by **generated code and the SDK itself**, leaving a budgeted core on
`/reducer` that is the entire surface agents are taught.

This is a 0.4.0 hard cut (no compat re-exports), aligned with phase 4 in one
release, following the 0.3.0 hard-cut precedent and its release-notes format.

## Background

Why surface size is a first-order cost for the stated audience: an agent
choosing between `CardIdOfManifest`, `CardIdOfTable`, `CardIdOfState`,
`CardIdOfDeck`, and `CardIdOfHand` must understand the manifest→table→state
layering — pure internal-model leakage. An agent that _guesses_ a
plausible-but-absent name (`CardIdOf<Game>`) burns a full edit-typecheck
iteration. Every name on the facade is also a line in the generated reference
(phase 8) competing for context-window budget.

Evidence of who actually uses what (verified during the review):

- frontier-trails `app/` imports from `/reducer`: the `define*` factories,
  `boardInput`, `sparseCounts`, `createReducerEdit`,
  `TableQueriesOfState`, `GameStateOf`, `ReducerGameDefinition` — and nothing
  from the extraction taxonomy.
- The generated `ui-contract.ts` imports `*OfDefinition` types
  (`ClientParamsOfInteractionOfDefinition`,
  `InteractionIdOfDefinitionPhase`, …) — generated code is the real consumer.
- The SDK's own `runtime/` and `testing/` import broadly — internal use.

## Proposed Fix

### 5A. Derive The Keep-List By Audit, Not By Guess

Mechanical audit, run and committed as
`docs/exec-plans/agent-first-authoring-dx/artifacts/reducer-import-audit.md`:

```bash
# in the private monorepo: every named import of /reducer across all examples
grep -rhoE 'import (type )?\{[^}]*\} from "@dreamboard-games/sdk/reducer"' \
  examples/ --include='*.ts' --include='*.tsx' \
  | tr ',' '\n' | sed 's/import.*{//; s/}.*//; s/type //; s/ //g' \
  | sort | uniq -c | sort -rn
```

Partition rule:

- **Stays on `/reducer`**: every name observed in _authored_ example files,
  plus the authoring factories, input builders, transaction/query values,
  `PerPlayer` helpers, schema helpers, result types
  (`ReducerResult`, `ReducerAccept`, `ReducerReject`), `GameStateOf`,
  `TableQueriesOfState`, `ErrorCodeOfContract` (phase 2), and
  `createContractAuthoring` (phase 1).
- **Moves to `/reducer/advanced`**: every name observed only in _generated_
  files or SDK-internal code — the `XOf*` extraction families,
  `Resolved*Location`, `Runtime*` structural types,
  manifest-schema plumbing (`assumeManifestSchema`,
  `createManifestRuntimeSchema`, `markManifestScopedSchema`, …),
  `applySetupBootstrap` and the setup-bootstrap helpers (codegen-emitted
  callers only).
- Names observed nowhere: move to `/reducer/advanced` and flag in the PR for
  potential deletion in a later release.

### 5B. New Subpath

`packages/sdk/package.json` exports map and tsup entry:

```jsonc
"./reducer/advanced": {
  "types": "./dist/reducer/advanced.d.ts",
  "import": "./dist/reducer/advanced.js",
  "default": "./dist/reducer/advanced.js"
}
```

`packages/sdk/src/reducer/advanced.ts` re-exports from the same internal
modules `/reducer` does today — **no file moves**, only facade membership
changes. The module carries a doc header stating its contract:

```ts
/**
 * Advanced type-extraction and infrastructure surface.
 *
 * Everything here is consumed by generated workspace files and SDK-internal
 * code. Authored game code should not need these names — prefer the
 * workspace's generated `manifest-contract` types and the bound authoring
 * object from `createContractAuthoring`. This subpath has weaker stability
 * guarantees than `/reducer`: names may move or change between minor
 * releases alongside codegen updates, because its consumers regenerate.
 */
```

### 5C. Codegen Emits The New Specifiers

`workspace-codegen` updates every emitted import of a moved name
(`ui-contract.ts` template, `testing-contract` template, tsconfig seeds
untouched). Ownership/seed version bump; regenerated workspaces are the
migration — authored files need changes only if they imported moved names
(the audit says examples did not; external workspaces get a clear
`TS2305: has no exported member` pointing at the release-notes table).

### 5D. Export Budget Gate

Extend `export-surface.test.ts` with a hard budget so the facade cannot
silently regrow:

```ts
test("reducer facade stays within the agent-surface budget", async () => {
  const names = Object.keys(await import("./reducer.js"));
  // Value exports only — type-only exports are checked via the d.ts snapshot.
  expect(names.length).toBeLessThanOrEqual(80);
});
```

Type-only exports do not appear at runtime; gate them with a `.d.ts`-level
snapshot: a small script (`scripts/list-dts-exports.mjs`, ts-morph or the TS
compiler API — the same machinery phase 8 builds) emits the sorted export
list of `dist/reducer.d.ts`, snapshot-tested with a count assertion
(≤ 140 total names on `/reducer`).

### 5E. Release Notes (0.4.0, With Phase 4)

Reuse the 0.3.0 format — a complete old→new table:

```markdown
| Moved name                                                    | Old subpath | New subpath          |
| ------------------------------------------------------------- | ----------- | -------------------- |
| `CardIdOfTable` (and the OfTable family)                      | `./reducer` | `./reducer/advanced` |
| `ClientParamsOfInteractionOfDefinition` (OfDefinition family) | `./reducer` | `./reducer/advanced` |
| ... every moved name, no "etc." ...                           |             |                      |
```

Plus the action-required block for the CLI team: regenerate workspaces with
the codegen that emits `/reducer/advanced` specifiers; generated files from
older codegen fail typecheck against 0.4.0 by design.

## Files Touched

- `packages/sdk/src/reducer.ts` (shrinks), `packages/sdk/src/reducer/advanced.ts` (new)
- `packages/sdk/package.json`, `tsup.config.ts`
- `packages/sdk/src/export-surface.test.ts` + snapshots,
  `scripts/list-dts-exports.mjs` (new)
- `packages/workspace-codegen/src/seeds.ts` + templates (emitted import blocks)
- `docs/release-notes-0.4.0-alpha.*.md`
- `artifacts/reducer-import-audit.md` (committed audit output)

## Verification

- Export-surface snapshots updated deliberately; budget tests green.
- `workspace-codegen` temp-project integration tests compile against the
  built 0.4.0 SDK (this is the proof that generated code found every moved
  name at its new home).
- Private monorepo: `pnpm regen:examples`, full example typechecks,
  `pnpm verify:dev` and `verify:package`.
- Negative test: a fixture file importing a moved name from `/reducer` fails
  `tsc` with `TS2305` (guards against accidental re-export leakage through
  `export *` chains).

## Acceptance Criteria

- `/reducer` ≤ 80 value exports and ≤ 140 total names; `/reducer/advanced`
  carries the remainder.
- No scaffold, example, or doc page imports from `/reducer/advanced`.
- Regenerated workspaces compile with zero authored-file changes.

## Risks

- **Unknown external consumers** of moved names in authored code. Accepted
  under the alpha-train hard-cut policy; the release-notes table is the
  contract. The audit artifact gives support a lookup when someone reports a
  break.
- **`export *` leakage**: internal modules re-exported wholesale could
  reintroduce moved names on `/reducer`. The negative test plus the budget
  gate catch this.
- Budget numbers (80/140) are estimates from the audit; finalize them in 5A
  and encode the final values — the gate must be exact, not aspirational.
