# Phase 3: Topology Data Extraction From Generated TypeScript

Status: closed on 2026-06-13. Closeout receipt:
[`artifacts/phase-03-closeout-20260613.md`](artifacts/phase-03-closeout-20260613.md).

## Objective

Stop emitting board topology **data** as TypeScript **code**. The
frontier-trails `shared/manifest-runtime.ts` is 14,569 lines, of which the
`staticBoards` literal is 10,645 lines of coordinates and adjacency. Move that
data to a generated JSON artifact with thin generated types, cutting generated
TS per workspace by ~60–70% while preserving every literal-id type guarantee.

Wins for agents working in a workspace: less grep noise, smaller files to
accidentally open into context, faster parse, and a clearer authored/generated
boundary. Wins for the platform: smaller sync payloads and less literal-type
checking work.

## Background

What the generated runtime actually contains (frontier-trails):

| Section                                                           | Lines   | Type-bearing?                                                                                                |
| ----------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `literals` re-export, `ids`, id-type aliases                      | ~250    | yes — keep as TS                                                                                             |
| zones/records/idGuards/setup tables                               | ~400    | yes — keep as TS                                                                                             |
| Card/piece/die field schemas + `CardStateById`                    | ~2,300  | yes — keep as TS                                                                                             |
| `staticBoards` literal (spaces/edges/vertices, coords, adjacency) | ~10,645 | **no** — keys are typed by id unions that already exist in `manifest-literals.ts`; the values are plain data |
| `createInitialTable`, helpers, runtime schema                     | ~900    | yes — keep as TS                                                                                             |

The id unions (`EdgeId`, `VertexId`, `SpaceId`, …) come from
`manifest-literals.ts`, _not_ from inference over the `staticBoards` literal.
Nothing in the type system requires the coordinate data to be a checked
literal.

## Proposed Fix

### 3A. Emit `shared/manifest-static.json`

`packages/workspace-codegen/src/manifest-contract.ts` splits its board
resolution output (already computed — hex/square edge+vertex derivation lives
in `hex-geometry.ts` and the board sections of the generator):

```text
shared/manifest-literals.ts    (unchanged)
shared/manifest-types.ts       (unchanged)
shared/manifest-static.json    (NEW — staticBoards data, stable key order)
shared/manifest-runtime.ts     (shrinks: imports the JSON, types it)
shared/manifest-contract.ts    (unchanged facade)
```

JSON emission requirements:

- Deterministic: stable key ordering and number formatting so regeneration is
  diff-stable (same rule the TS emitter follows today).
- A top-level envelope for forward-compat:

```json
{
  "formatVersion": 1,
  "generatedBy": "@dreamboard-games/workspace-codegen",
  "boards": {
    "frontier": {
      "layout": "hex",
      "spaces": { "space:frontier:0,-2": { "q": 0, "r": -2, "fields": {} } },
      "edges": [
        {
          "id": "edge:frontier:...",
          "spaceIds": ["..."],
          "fields": { "relaySlot": null }
        }
      ],
      "vertices": [
        { "id": "vertex:frontier:...", "spaceIds": ["..."], "fields": {} }
      ]
    }
  }
}
```

### 3B. Typed Import In `manifest-runtime.ts`

The generated runtime types the parsed JSON against the existing id unions —
structural value types, literal key/id types:

```ts
// generated manifest-runtime.ts (replacing the 10.6k-line literal)
import staticBoardsData from "./manifest-static.json";
import type {
  StaticBoards, // existing SDK type, from ./reducer model
} from "@dreamboard-games/sdk/reducer";
import type { EdgeId, SpaceId, VertexId } from "./manifest-literals";

export type FrontierStaticBoard = TiledStaticBoard<
  SpaceId,
  EdgeId,
  VertexId,
  FrontierSpaceFields,
  FrontierEdgeFields,
  FrontierVertexFields
>;

export const staticBoards: { readonly frontier: FrontierStaticBoard } = (
  staticBoardsData as StaticBoardsJsonEnvelope
).boards as {
  readonly frontier: FrontierStaticBoard;
};
```

The cast is generated code asserting a fact the generator guarantees by
construction; the codegen integration test makes that guarantee checkable
(3D). Authors keep the exact same `staticBoards` import surface —
`boardHelpers`, `createInitialTable`, and downstream consumers are untouched.

`resolveJsonModule: true` is added to the codegen-owned tsconfig templates
(`tsconfig.framework.json` files are generator-owned per the ownership
rules; bump ownership version).

### 3C. Pipeline Admission For JSON Modules

Cross-repo verification (private monorepo + public CLI):

- **CLI sync**: confirm `shared/*.json` is included in the authored/generated
  upload set (the `.dreamboard/generated/manifest.json` flow already syncs
  JSON; verify the `shared/` path globbing).
- **Compiler service**: the esbuild-based bundling must resolve the JSON
  import inside `app/` bundles (esbuild supports JSON loader natively —
  verify the loader config and the admission scanner's allowed-extension
  list in `packages/compiler-core/src/services/typescript-compiler-service.ts`).
- **Fallback if any pipeline stage rejects JSON** (decision pre-made to avoid
  mid-phase churn): emit `shared/manifest-static-data.ts` instead —

  ```ts
  // fallback form: still TS, but explicitly widened — no literal-type checking
  import type { StaticBoardsJsonEnvelope } from "@dreamboard-games/sdk/reducer";
  export const staticBoardsData: StaticBoardsJsonEnvelope = {
    /* data */
  };
  ```

  This keeps the LOC in the workspace but removes the type-checking weight
  and keeps this phase shippable; the JSON form remains the target and the
  emitter supports both behind a codegen option
  (`staticDataFormat: "json" | "ts"`).

### 3D. Equivalence And Regression Gates

In `packages/workspace-codegen` integration tests (existing temp-project
pattern that symlinks the built SDK):

1. **Deep-equality gate**: generate a fixture workspace with the old emitter
   (pinned snapshot of the previous output checked into
   `fixtures/`) and the new emitter; `assert.deepStrictEqual` of the runtime
   `staticBoards` value old-vs-new.
2. **Typecheck-cost receipt**: run `tsc --extendedDiagnostics` on the temp
   project before/after and write the numbers into the test output
   (lines-of-TS, check time, memory). Budget: generated `manifest-runtime.ts`
   ≤ 4,000 lines for the frontier-trails-class fixture; check time not worse
   than baseline +10%.
3. **Initial-table identity**: `createInitialTable()` output deep-equal
   old-vs-new (it reads `staticBoards`).

## Files Touched

- `packages/workspace-codegen/src/manifest-contract.ts` (emitter split; this
  file is 6,632 lines — extract the board-static emission into a new
  `src/manifest-static.ts` module while in there, with no behavior change to
  the other sections)
- `packages/workspace-codegen/src/ownership.ts` (own `shared/manifest-static.json`)
- `packages/workspace-codegen/src/seeds.ts` (tsconfig templates:
  `resolveJsonModule`)
- `packages/sdk/src/reducer/model/` (export `StaticBoardsJsonEnvelope` type)
- Integration tests + fixtures in `workspace-codegen`

## Verification

- `pnpm --filter @dreamboard-games/workspace-codegen test` (equivalence +
  receipt gates above)
- Private monorepo: `pnpm regen:examples`, frontier-trails
  `typecheck` / `typecheck:test` / `dreamboard test run`, then
  `pnpm verify:package` (proves the installed-CLI + compile pipeline accepts
  the JSON module) and `pnpm verify:browser` (proves the runtime path).
- Manual: `wc -l shared/*.ts shared/*.json` in the regenerated example,
  recorded in the PR description against the baseline table in the README.

## Acceptance Criteria

- `shared/manifest-runtime.ts` ≤ ~4k lines for frontier-trails;
  total generated TS per workspace ≤ ~6k lines.
- `staticBoards` runtime value deep-equal before/after; `createInitialTable`
  identity holds.
- Full compile→play pipeline green via `verify:package` + `verify:browser`.
- No authored-file changes required in migrated workspaces (regeneration
  only).

## Risks

- **Pipeline JSON support** is the main unknown — hence the pre-made TS-data
  fallback in 3C; the phase cannot stall on a compiler-service change.
- **Import attributes / module settings**: plain `resolveJsonModule` imports
  are the compatible choice across tsc + esbuild; do not use
  `with { type: "json" }` (Node-ESM import attributes) in generated output —
  tsup/esbuild and the workspace tsconfigs disagree on support.
- The deep-equality fixture pins the _previous_ emitter output; keep the
  fixture small (a 7-hex board, not the full 19-hex layout) to avoid checking
  in another 10k-line artifact.
