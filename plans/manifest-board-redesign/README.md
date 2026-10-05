# Manifest and board redesign

Status: implementing. Original evidence baseline: `274468b`; implementation
baseline: `463ba58` (after #102). GPT-6.1 Sol agents implement bounded layers;
the root reviewer independently reads source and verifies every accepted layer.

This plan replaces overlapping manifest concepts with fewer ones, moves board
placement into session state, and fixes the board geometry integration. It is
a hard cut: one supported authoring path, no aliases or compatibility readers.
Old running games and checkpoints need not remain compatible. Rebuild artifacts
and start fresh sessions; no migrations, dual readers or legacy wire support.

Read this file, then the [field-schema experiment](00-field-schema-experiment.md),
then [private tiles and authority](private-tiles.md), then the layer you own.
That contract supersedes the old board-owned catalog/global projection sketches.

## Problems

Evidence is at the baseline commit.

1. **One manifest concept is interpreted in five places.** The custom property
   schema language (`PropertySchema` in
   [contracts.ts](../../packages/sdk/src/shared/domain/contracts.ts)) is read by
   authoring types ([authoring.ts:273](../../packages/sdk/src/reducer/manifest/authoring.ts#L273)),
   output types ([types.ts:117](../../packages/sdk/src/reducer/manifest/types.ts#L117)),
   the runtime Zod builder ([schema.ts:16](../../packages/sdk/src/reducer/manifest/schema.ts#L16)),
   default materialization ([materialize.ts:1176](../../packages/sdk/src/reducer/manifest/materialize.ts#L1176))
   and key validation ([manifest-validation.ts:89](../../packages/sdk/src/reducer/manifest/manifest-validation.ts#L89)).
2. **Places that hold components overlap.** A location can be `InDeck`,
   `InHand`, `InZone`, `InContainer` or `InSlot`
   ([table.ts:184](../../packages/sdk/src/reducer/model/table.ts#L184)). Zone
   contents are stored twice (`decks` copies `zones.shared`, `hands` copies
   `zones.perPlayer`, [materialize.ts:2054](../../packages/sdk/src/reducer/manifest/materialize.ts#L2054)).
   A card homed in a shared zone becomes `InDeck` while a piece becomes `InZone`
   ([materialize.ts:1416](../../packages/sdk/src/reducer/manifest/materialize.ts#L1416),
   [1627](../../packages/sdk/src/reducer/manifest/materialize.ts#L1627)). Only
   zones have visibility. Board containers get a `zoneId` nothing reads
   ([materialize.ts:1868](../../packages/sdk/src/reducer/manifest/materialize.ts#L1868)).
3. **Layout decides capabilities.** Hex boards always get `relations: []` and
   `containers: {}` ([materialize.ts:1835](../../packages/sdk/src/reducer/manifest/materialize.ts#L1835),
   [1853](../../packages/sdk/src/reducer/manifest/materialize.ts#L1853)).
4. **Boards are static and stored twice.** Every session copies the full board
   topology into `table.boards`, serializes it with each state version
   ([session-codec.ts:166](../../packages/sdk/src/reducer/ingress/session-codec.ts#L166))
   and `structuredClone`s it on every transaction
   ([clone.ts:16](../../packages/sdk/src/reducer/table/clone.ts#L16)). Nothing
   mutates it. Clients render the manifest copy, sent once per session as
   `boardStatic` ([static-projection.ts:56](../../packages/sdk/src/reducer/bundle/trusted/static-projection.ts#L56)).
   Random setup, player-built maps and changing connections cannot be expressed.
5. **Hex edge and vertex IDs depend on neighbours.** IDs are built from the
   spaces sharing the element ([hex-board.ts:177](../../packages/sdk/src/shared/hex-board.ts#L177)):
   `frontier:edge:a:0` becomes `frontier:edge:a|b` once tile `b` exists, which
   would orphan pieces and targets under dynamic placement. Side numbers follow
   honeycomb's pixel corner order, so side 0 faces `1,0` on pointy boards but
   `1,-1` on flat boards.
6. **Geometry is rebuilt constantly.** The reducer cache keys on the board
   object ([board-queries.ts:32](../../packages/sdk/src/reducer/table/board-queries.ts#L32)),
   which `clone.ts` replaces every transaction. The client re-parses the static
   projection into new objects on every frame
   ([projection.ts:28](../../packages/sdk/src/shared/protocol/projection.ts#L28)),
   so the headless cache ([board.ts:138](../../packages/sdk/src/headless/features/board.ts#L138))
   never hits, and `BoardTargets` calls `getLayout` on every render
   ([board-targets.tsx:112](../../registry/items/board-targets.tsx#L112)).
   Construction is quadratic (every vertex scans every edge,
   [hex-board.ts:194](../../packages/sdk/src/shared/hex-board.ts#L194)).
   Measured on Node 24: 1.8 ms at 37 hexes, 21.8 ms at 331, 83.8 ms at 721.
7. **Per-player replication is inconsistent.** Zones and boards support
   `perPlayer`, but inventory needs hand-built player IDs
   ([pieces.ts:1](../../examples/reference-games/hex-network-trading/manifest/pieces.ts#L1)),
   typed through tuple arithmetic ([authoring.ts:363–383](../../packages/sdk/src/reducer/manifest/authoring.ts#L363)).
   Per-player boards have two identities: the runtime string
   `frontier:player-1` and the structured `PlayerBoardSpaceTarget`
   ([board-target.ts:4](../../packages/sdk/src/shared/board-target.ts#L4)), which
   the UI re-encodes by hand ([board-targets.tsx:318](../../registry/items/board-targets.tsx#L318)).
8. **The reference game bypasses board data.** Hex terrain, numbers and
   resources live in a TypeScript constant
   ([model.ts:23](../../examples/reference-games/hex-network-trading/app/model.ts#L23))
   and are sent in every seat view
   ([player-view.ts:17](../../examples/reference-games/hex-network-trading/app/player-view.ts#L17)).
9. **"Distance" means two things.** Hex boards use straight-line grid distance
   that ignores holes; square and generic boards count steps
   ([board-queries.ts:384](../../packages/sdk/src/reducer/table/board-queries.ts#L384)).

## Agreed design

| Area          | Decision                                                                                                                                                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collections   | Keep `cardSets`, `zones`, `boards`, `pieceTypes`/`pieceSeeds`, `dieTypes`/`dieSeeds`, `resources`. No wrappers such as `cards.sets.cards`.                                                                                                                             |
| Field schemas | Authors write Zod object schemas imported from `@dreamboard-games/sdk/reducer`. ID references use marker schemas (`ref.pieceId()`). The manifest module exports JSON Schema. See [the experiment](00-field-schema-experiment.md).                                      |
| Holding areas | Every place that holds components is a zone. A zone has a `scope` (`shared`, `perPlayer`) or is `attachedTo` a board, board space, piece type or die type. One `InZone { zoneId, hostId }` location. Occupying a space, edge or vertex stays a separate location kind. |
| Geometry      | Keep `hex`, `square`, `generic`. Every layout gets relations and attached zones.                                                                                                                                                                                       |
| Topology      | The manifest declares tile types and seeds. Component locations own placement; session state owns relations. Topology is derived. A fixed board starts with placed tile instances. No `fixed`/`assembled` discriminator.                                               |
| Identity      | Hex edges and vertices are named by grid coordinates, independent of neighbours. Per-player instances use one runtime string codec.                                                                                                                                    |
| Inventory     | Piece and die seeds accept `scope: "perPlayer"`; IDs come from the roster. Replication initializes ownership; later containment and ownership are independent. Manifests never name players.                                                                           |
| Honeycomb     | Honeycomb owns shape traversal, pixels, grid distance, rings, lines and hit testing. The SDK owns rotation, edge/vertex identity, neighbours, placement and tile outlines.                                                                                             |
| Backend       | The backend types only `manifest.players` and stores the rest as SDK-owned JSON. The compiler uses the SDK as the manifest validator.                                                                                                                                  |

## Execution order

Ten SDK architecture PRs and two internal PRs. The planning PR and the small
touch-activation prerequisite are separate. Internal A can proceed in parallel. Original numbered
filenames remain source material; this table owns execution order and
[private tiles](private-tiles.md) owns the revised modelling boundary.

| PR  | Branch                          | Scope                                                       | Source                            |
| --- | ------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| 1   | `codex/manifest-field-schemas`  | Portable Zod subset, staged refs and exact public inference | [01](01-field-schemas.md)         |
| 2   | `codex/hex-lattice`             | Stable identities, indexed geometry, distance and caching   | [02](02-hex-lattice.md)           |
| 3   | `codex/zone-locations`          | One zone model, ordering owner and movement API             | [03](03-zone-locations.md)        |
| 4   | `codex/per-player-inventory`    | Roster inventory and runtime identity/target codec          | [05](05-per-player-inventory.md)  |
| 5   | `codex/attached-zones`          | Host lifecycle, containment invariants and access           | [04](04-attached-zones.md)        |
| 6   | `codex/tile-inventory`          | Definitions, instances, seeds and canonical locations       | [Private tiles](private-tiles.md) |
| 7   | `codex/board-topology`          | Derived topology, default placement and game migration      | [06](06-tile-catalog.md)          |
| 8   | `codex/private-tile-projection` | Seat boards, event disclosure, refs and ingress             | [Private tiles](private-tiles.md) |
| 9   | `codex/tile-transactions`       | Placement, draw/reveal, dependency rejection and seeded RNG | [07](07-place-tiles.md)           |
| 10  | `codex/tile-layout`             | Headless/registry rendering and private-flow browser proof  | [08](08-tile-layout.md)           |

Internal A owns opaque manifest storage/validation and can proceed independently.
Internal B repins the published SDK and adopts protocols, host consumers and
actual seat delivery. See [09](09-internal-adoption.md).

Private configurations fail explicitly until PR 8 supplies the complete boundary;
no intermediate layer may accept them and expose their contents. Intermediate
layers are review boundaries; publication requires the complete candidate.

## Current review state

The following are drafts, not landed changes:

- [SDK #107](https://github.com/dreamboard-games/dreamboard-sdk/pull/107):
  touch activation prerequisite; physical interaction proofs and hosted checks pass.
- [SDK #104](https://github.com/dreamboard-games/dreamboard-sdk/pull/104):
  portable field schemas, independently reviewed; local and hosted checks pass.
- [SDK #105](https://github.com/dreamboard-games/dreamboard-sdk/pull/105):
  geometry foundation; edge hit areas corrected. Full local UI and hosted checks
  pass with the touch activation prerequisite below it in the stack.
- [SDK #109](https://github.com/dreamboard-games/dreamboard-sdk/pull/109):
  canonical zone membership and explicit hosts. Independent `pnpm check` and full
  `pnpm ui test` and all required hosted checks pass.
- [SDK #110](https://github.com/dreamboard-games/dreamboard-sdk/pull/110):
  actual-roster inventory, canonical board targets and SDK-owned current board
  projection. Independent `pnpm check` passes (835 SDK tests and packed consumers);
  full `pnpm ui test` and all required hosted checks pass. Attached zones are in
  progress.
- [Internal #668](https://github.com/dreamboard-games/dreamboard-internal/pull/668):
  opaque manifest ownership, generated transport and compiler boundary.
- [Internal #669](https://github.com/dreamboard-games/dreamboard-internal/pull/669):
  controller-based hosted seat delivery. Published SDK repin, new projection
  adoption and the final real-browser proof remain outstanding.

PR descriptions own current verification receipts. No SDK has been published
for this redesign; downstream adoption is not complete.

## Independent review

Agents work in isolated worktrees, except explicitly coordinated disjoint files.
Their reports are evidence to inspect, not approval. The root reviews modelling,
source, authoring inference, state mutation, projection, ingress and UI flow before
acceptance. Reject duplicated state owners, unnecessary generic abstractions,
unjustified casts and weakened public typing. Tests and migrations belong in the
owning layer, not a trailing verification PR.

## Rules for every layer

- **Hard cut.** Migrate every caller in the same PR: SDK, both reference games,
  `templates/game`, registry items and stories, docs. Delete what is replaced.
  No aliases, deprecations or dual readers.
- **Gates.** `pnpm check` must pass and leave tracked files unchanged. Run
  `pnpm ui test` for layers that touch the registry or headless UI (02, 03, 04,
  06, 08). Run `pnpm reference` when reference games change.
- **Type proofs.** Public type changes ship compile-only positive and negative
  proofs next to the existing `*.type-test.ts` files. Delete proofs for removed
  APIs instead of adapting them.
- **Type boundaries.** The repository lint rejects unchecked casts. When a cast
  is genuinely required, keep the existing `eslint-disable-next-line
no-restricted-syntax -- reason` convention and state the invariant.
- **Docs.** Update the guides the layer changes:
  [manifest-and-boards](../../docs/guides/reducer/manifest-and-boards.md),
  [hex-board-geometry](../../docs/hex-board-geometry.md),
  [ui/boards](../../docs/guides/ui/boards.md), [ui/zones](../../docs/guides/ui/zones.md).
- **Scenarios.** Keep typed scenarios as the behavioural authority. Scenarios
  obtain edge and vertex IDs through queries; never hard-code them.
- **Stack mechanics.** Use `gh stack` non-interactively: named branches,
  `gh stack submit --auto`, `gh stack view --json`. Fix review feedback in the
  owning layer and `gh stack rebase --upstack`.
- **Receipts.** Each PR description lists the commands run and their results.
  Append a short receipt section to the layer file when the layer lands.

## Publication

Publish one SDK alpha after execution layer 10 (tile layout) through the reviewed release workflow
([alpha-publish.md](../../docs/alpha-publish.md)). Publish the complete stack as
one candidate; intermediate layers do not define separately supported releases.
Internal adoption pins the exact published version.

## Settled decisions

Tiles are components: definitions are reusable and runtime instances have one
location. Bags/hands are zones; board placement derives topology. Public game
definitions are distinct from private session assignments and state.

Removal with dependencies is rejected. Same-board movement preserves tile-space
identity; cross-board relocation with dependencies is rejected. One identity
codec must enforce collision rules for authored and roster IDs; parsing never
establishes ownership. Running games/checkpoints may be invalidated by adoption.
