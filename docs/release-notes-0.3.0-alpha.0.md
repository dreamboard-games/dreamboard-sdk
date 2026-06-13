# @dreamboard-games/sdk 0.3.0-alpha.0 — hard-cut restructure

This release is a **breaking restructure** of the SDK's public subpath surface
and internal layout. Authoring API _names_ are unchanged (`defineGame`,
`definePhase`, `boardInput`, `createReducerBundle`, `PluginRuntime`,
`createWorkspaceUIContract`, all `Workspace*` types, the primitives
namespace, …) — only _import paths_ moved.

Game projects generated against `< 0.3.0` keep working on their pinned SDK
version. They break the moment they upgrade, until their workspace files are
**regenerated** with a CLI that emits the new paths.

## Action required (CLI team)

- Pin generated projects to `@dreamboard-games/sdk@>=0.3.0-alpha.0`.
- Regenerate workspace scaffolding: the codegen seeds now emit the new
  specifiers (see table below).
- The `DreamboardUIRegister` module augmentation target moved:
  `declare module "@dreamboard-games/sdk/generated/runtime"` →
  `declare module "@dreamboard-games/sdk/runtime"`. Previously generated
  workspaces fail to type-check against 0.3.0 until regenerated — this is
  the intended hard cut.

## Subpath map: old → new

| Old subpath                                                          | New subpath                                                                                                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `.`                                                                  | unchanged                                                                                                                                      |
| `./package-set`                                                      | unchanged                                                                                                                                      |
| `./types`                                                            | unchanged (now fronts `@dreamboard-games/sdk-types`, inlined at build)                                                                         |
| `./reducer`                                                          | unchanged                                                                                                                                      |
| `./ui`, `./ui/components`, `./ui/defaults`, `./ui/plugin-styles.css` | unchanged                                                                                                                                      |
| `./ui/types/player-state`                                            | `./ui/player-state`                                                                                                                            |
| `./testing`                                                          | unchanged                                                                                                                                      |
| `./browser-interaction`                                              | unchanged                                                                                                                                      |
| `./generated/runtime`                                                | merged into `./runtime` (absorbs `createWorkspaceUIContract` + workspace-contract type re-exports; `DreamboardUIRegister` augmentation target) |
| `./generated/runtime/primitives`                                     | merged into `./runtime/primitives`                                                                                                             |
| `./generated/workspace-contract`                                     | merged into `./runtime/workspace-contract`                                                                                                     |
| `./runtime/types/runtime-api` + `./generated/runtime-api`            | union → `./runtime/runtime-api` (adds `PluginStateSnapshot`, `ZoneHandlesSnapshot`)                                                            |
| `./infrastructure/workspace-codegen`                                 | `./codegen`                                                                                                                                    |
| `./infrastructure/reducer-bundle-abi`                                | `./reducer-contract`                                                                                                                           |

17 subpaths total (16 JS + the CSS asset). Removed without replacement:
none — every old entry has a target in the table.

## Package architecture changes

- **`@dreamboard-games/sdk-types` is now the single source of truth** for the
  shared type layer. The ~3,200-line byte-copy under `packages/sdk/src/types/`
  is gone; the sdk inlines the private package at build time (`noExternal` +
  dts resolve), so the published tarball stays self-contained.
- **`@dreamboard-games/reducer-contract` single-emits**: codegen writes only
  into its own `generated/`; the mirrored copies under
  `packages/sdk/src/generated/reducer-contract/` and
  `src/infrastructure/reducer-contract/` are deleted. CI gates drift with
  `pnpm --filter @dreamboard-games/reducer-contract generate:check`.
- **New private package `@dreamboard-games/workspace-codegen`**: the 9.6k-line
  codegen engine moved out of the runtime SDK source tree. The public
  `./codegen` subpath re-exports it; only `@dreamboard-games/sdk` is
  publishable (enforced by the publication-boundary guardrails).
- Tarball hygiene: no `bun` export conditions, no `src/` in the tarball, and
  the self-containment scanner now also checks `.ts`/`.tsx` specifiers.

## Internal restructure (no public API change)

- `src/runtime-internal/` → `src/runtime/` — the directory now matches the
  `./runtime` surface it implements.
- `reducer/table-ops.ts` (2,671 lines, 81 exports) → `reducer/table/` modules;
  `model/spec.ts` → `model/spec/`; trusted-bundle collector/decision splits.
  The `./reducer` export list is unchanged (export-surface snapshot tested).
- `primitives/interaction.tsx`, `components/InteractionForm.tsx`,
  `workspace-contract.ts`, `ui/components/CardDragSurface.tsx` split into
  directories; all original export names preserved.
- ui/runtime byte-duplicate files deduplicated (runtime imports the ui
  canonicals; runtime's target-layer is now a pure type extension of the ui
  base).
- HexGrid/SquareGrid share an extracted `ui/components/board/tiled-grid/`
  core. Every historical behavioral divergence between the two grids is an
  explicit prop (`selectMode`, `spreadBrowserAttributes`, `viewBoxMode`,
  pan-zoom gating, group roles) — rendered markup is byte-identical to 0.2.x
  (characterization-snapshot gated), and nothing was silently unified.

## Known deferred follow-ups

Not in this release: splitting `primitives/zone.tsx`, `hand-surface.tsx`,
`useBoardInteractions.ts`; deliberately unifying the Hex/Square
select/browser-attribute divergences; consolidating `reducer/ops.ts` private
helpers with `reducer/table/internal.ts`.
