# Manifest and board redesign

Status: planned. Baseline: SDK `origin/main` at `274468b` (after #81).
Owner: root orchestrator; layers are delegated one branch at a time.

This plan replaces overlapping manifest concepts with fewer ones, moves board
placement into session state, and fixes the board geometry integration. It is
a hard cut: one supported authoring path, no aliases or compatibility readers.
Sessions keep running on the bundle they started with, so persisted state does
not need migration.

Read this file, then the [field-schema experiment](00-field-schema-experiment.md),
then the layer you own.

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
| Topology      | The manifest declares a tile catalog. Session state holds only placements and relations. Topology is computed from both. A fixed board is its default placements. No `fixed`/`assembled` discriminator.                                                                |
| Identity      | Hex edges and vertices are named by grid coordinates, independent of neighbours. Per-player instances use one runtime string codec.                                                                                                                                    |
| Inventory     | Piece and die seeds accept `scope: "perPlayer"`; IDs come from the roster. Ownership follows scope. Manifests never name players.                                                                                                                                      |
| Honeycomb     | Honeycomb owns shape traversal, pixels, grid distance, rings, lines and hit testing. The SDK owns rotation, edge/vertex identity, neighbours, placement and tile outlines.                                                                                             |
| Backend       | The backend types only `manifest.players` and stores the rest as SDK-owned JSON. The compiler uses the SDK as the manifest validator.                                                                                                                                  |

## Execution order

One SDK stack rooted on `main`, then one internal stack after an SDK alpha.

| Layer                               | Branch                     | Scope                                                                                            | Size |
| ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ | ---- |
| [00](00-field-schema-experiment.md) | —                          | Experiment receipt (no code lands)                                                               | —    |
| [01](01-field-schemas.md)           | `sdk/field-schemas`        | Zod field schemas and `ref.*` markers replace the property-schema language                       | L    |
| [02](02-hex-lattice.md)             | `sdk/hex-lattice`          | Coordinate-based hex IDs, axial sides, indexed and cached geometry, `distance` vs `gridDistance` | M    |
| [03](03-zone-locations.md)          | `sdk/zone-locations`       | One `InZone` location for table and player zones; delete duplicate stores                        | L    |
| [04](04-attached-zones.md)          | `sdk/attached-zones`       | Zones attached to boards, spaces and components replace containers and slots                     | M    |
| [05](05-per-player-inventory.md)    | `sdk/per-player-inventory` | Roster-derived inventory, no player literals, one per-player identity                            | M    |
| [06](06-tile-catalog.md)            | `sdk/tile-catalog`         | Tile catalog, placements and relations in state, `table.boards` deleted                          | L    |
| [07](07-place-tiles.md)             | `sdk/place-tiles`          | `tx.placeTile`, relations, `tx.random`, multi-hex tiles and rotation                             | M    |
| [08](08-tile-layout.md)             | `sdk/tile-layout`          | Tile outlines and rotation in layouts; `BoardTargets` tiles; delete `HexGrid`                    | M    |
| [09](09-internal-adoption.md)       | internal repo, 2 PRs       | Backend and compiler stop modelling the manifest; repin and adopt                                | M    |

Why this order:

- Field schemas come first because layers 04–06 add schema-bearing data (zone
  and tile fields). With Zod in place they are written once.
- Coordinate IDs (02) land before placements can change (06–07).
- Zones split into a runtime refactor (03) and the authoring change (04).
- Tiles split into state model (06), runtime placement (07) and rendering (08).
- Layers 01–05 are a coherent stopping point if dynamic boards are deferred.

Internal PR A in [09](09-internal-adoption.md) does not depend on the SDK and may
land at any time before PR B.

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

Publish one SDK alpha after layer 08 through the reviewed release workflow
([alpha-publish.md](../../docs/alpha-publish.md)). If dynamic boards are
deferred, publish after layer 05 instead. Internal adoption pins the exact
published version.

## Open questions

- **Tiles drawn from a stack.** Layer 06 models tiles as board catalog entries,
  which fits games that place every tile during setup. Games that draw tiles
  one at a time (Carcassonne) may be better served by tiles that are components
  with an "on board at q, r, rotation" location. Decide before a game needs it;
  layer 07's `placeTile` is the extension point.
- **Reserved characters.** Layer 04 reserves `#` in authored IDs for the zone
  host codec. Confirm no published game uses it.
