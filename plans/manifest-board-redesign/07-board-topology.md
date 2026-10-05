# Derived board topology (execution PR 7)

Branch: `codex/board-topology`, after tile inventory. This replaces the historical
board-owned catalog and placement-map examples in `06-tile-catalog.md`.
The [private-tile boundary](private-tiles.md) remains authoritative.

## One state owner

A tile's canonical component location gains an `OnBoard` variant, discriminated
by `layout`. Hex uses `q`, `r` and rotation 0–5; square uses `col`, `row` and
rotation 0–3. Both name the exact runtime board ID. Tile seed board homes use the
same layout evidence and resolve per-player boards from replication origin.
Validate layout compatibility, coordinate arithmetic, overlap and rotation.

Runtime board state owns session relations and instance identity. Authored board
metadata and generic static spaces remain in compiled definitions. Tile geometry
remains in tile definitions. Remove persisted spaces/edges/vertices and the
duplicate `byId`/`hex`/`square`/`network`/`track` topology stores. No independent
placement map, last-board field or derived-geometry checkpoint cache is allowed.

One shared derivation combines definitions, admitted instances and canonical
locations. It computes placed spaces, board-scoped world edges/vertices and
geometric adjacency. Explicit session relations remain distinct from geometry.
Derive client geometry only from permitted seat data; private configurations
remain rejected until PR 8 supplies that data boundary.

## Stable spaces and attached zones

A tiled space ID is the canonical encoded tuple of tile instance ID and local
cell ID. It does not encode the current board or coordinates. Generic static
space IDs remain board-local.

`attachedTo: { board, space }` selects a generic static space. Tiled-space zones
use `attachedTo: { tileType, cell }`, giving one host for each known tile instance
of that type. The host ID is its stable tiled-space ID. This is a cell attachment,
not a new arbitrary tile cargo API.

Enumerate tiled-space hosts even when the tile is detached or in a zone. Such
hosts may exist empty, but adding contents requires a live `OnBoard` placement.
Initialization and restore reject nonempty unplaced-space hosts. Host ownership
comes from the tile's current owner; later private board policy also constrains
disclosure. Same-board movement retains space/host identity and contents.

All queries and admission use the shared codec/resolver. Do not infer placement
from an ID or silently recreate missing membership. Per-player identity still
uses the original replication seat, independently of current ownership.

## Queries and typing

`q.tile(id)` addresses game-owned inventory, including detached tiles. Board
queries enumerate only tiles currently placed on that exact runtime board;
there is no board-owned catalog lookup for detached inventory.

Thread real compiled definitions through `TableQueries<Table, Definitions>` and
bound board queries. Derive topology field and identity types from that owner,
while runtime state types describe only actual state. Do not retain pretend
spaces/edges fields solely to preserve old type extraction. Headless code has
the game contract and consumes projected topology, never authoritative state.

Cache geometry by the relevant admitted placements and immutable definitions.
Keep connectivity separate or include relation state in the key. Use bounded
value caching for cloned/restored states, preserving the existing geometry
performance guarantees.

## Reference games and hard cut

Hex terrain, numbers and resources move from `HEX_RULES` into immutable tile/cell
fields. Reducer rules and UI read derived board data. Preserve game rules,
scenario results, keyboard/touch actions and existing physical browser proofs.

Fixed tiled boards are ordinary seeded tile placements. Shape convenience
helpers emit ordinary `tileTypes` and `tileSeeds`; there is one authored runtime
model. Remove old board shape/exclude/coordinate override and board-level
edge/vertex metadata paths when consumers migrate. Generic boards keep static
spaces and explicit relations.

## Admission and handoff

Restore checks canonical inventory, layout-compatible placement, exact current
membership and relation endpoints, then derives topology. It cannot accept
independently edited coordinates with stale world edges: those copies no longer
exist. Conflicting metadata on one world edge/vertex is a deterministic error,
including conflicts contributed by adjacent tiles.

Until PR 9 supplies dependency-aware placement/removal, existing generic
component moves must reject removing a placed tile rather than bypassing those
rules. PR 9 then supports explicit cleanup followed by movement/removal in the
same transaction. Private tile/board policies stay rejected until PR 8.

Acceptance includes every rotation for both layouts, multi-cell overlap and
metadata conflicts, stable space hosts, detached empty/nonempty admission,
relation versus adjacency semantics, equivalent reducer/client public topology,
smaller checkpoints without geometry copies, exact public inference, and both
reference games against the packed SDK.
