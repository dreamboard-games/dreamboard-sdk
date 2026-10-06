# Manifest and boards

```ts
import { compileManifest } from "@dreamboard-games/sdk/reducer";
import manifest from "../../../examples/reference-games/hex-network-trading/manifest";
export const contract = compileManifest(manifest);
```

The manifest owns identities, component definitions, zones and board definitions.
Hex and square boards derive their topology from placed tile instances. Generic
boards declare static spaces. The SDK projects current topology into each seat's
flat `boards` collection. The frame materializer exposes that collection as
`frame.view.boards`; authored views cannot overwrite it.

Runtime `table.boards[boardId]` contains its authored `baseId`, current `visibility` and session
`relations`. Immutable board metadata and tile geometry live in compiled
definitions. A tile's canonical component location owns its placement. Spaces,
edges, vertices and adjacency are derived; checkpoints do not store geometry
copies. `q.board(boardId).state` returns this derived topology, not the stored
board instance. There is no separate static-board projection.

Inferred tables preserve each card, piece, die and tile's runtime ID, authored type,
and property schema. Component IDs are the union of those inventories, so
component queries and movement commands reject unknown IDs at compile time.
Board scope and space IDs stay literal. Per-player board, card, piece, die and tile IDs
carry exact family and expanded seed-base types. The shared identity codec owns
encoding and parsing; active roster and inventory membership are checked separately.

A card or piece/die/tile seed with `scope: "perPlayer"` creates one copy per actual
session seat. It starts with that seat as owner; shared components start unowned.
Manifests do not contain `ownerId` or `visibility.visibleTo`. Replication is not a
privacy policy, and changing ownership later never changes an instance's ID.
A per-player seed's home resolves on its replication-origin seat, including a
per-player zone or board. A shared seed cannot choose a player's home implicitly;
place it during reducer setup.

`contract.createInitialTable({ playerIds })` requires an explicit roster. Pass
`[]` explicitly for static geometry tooling; session initialization supplies the
real roster. `maxPlayers` constrains session size and never invents runtime IDs.
Use the actual table inventories for runtime enumeration. A compiled board
definition is a declaration, not evidence that a runtime board exists.

Instance record factories also require the roster, for example
`contract.records.pieceIds(0, { playerIds })`. Declaration record factories,
such as `records.pieceTypeIds(0)`, do not. Player IDs must be nonempty and unique;
`__proto__` is reserved because record parsers do not preserve that key.
Names such as `constructor`, `toString` and `table` remain valid player IDs.

Card `frontImage` and `backImage` are repository paths under `assets/`, such as
`assets/cards/queen-of-fire.webp`. Hosts publish those files with the game and
deliver them with the session; card views then carry loadable URLs in the same
fields, so UI code renders `card.frontImage` directly.

Zones have one ordered membership array per host: `table.zones[zoneId][hostId]`.
Shared zones use the `"table"` host; per-player zones use an active player ID.
Compiled manifest definitions own scope, visibility and allowed card sets. Those
rules are not duplicated in mutable table state. Cards, pieces, dice and tiles use the
same `InZone { zoneId, hostId, playedBy }` location; their IDs are unique across
component families. Array order is authoritative, with no location position copy.

```ts
const hand = q.zone("hand", playerId);
const cards = q.zone.cards("hand", playerId);
const first = hand[0];
if (first !== undefined) {
  tx.moveComponentToZone({
    componentId: first,
    to: { zoneId: "discard" },
    playedBy: playerId,
  });
}
tx.deal({
  from: { zoneId: "draw" },
  to: { zoneId: "hand", hostId: playerId },
  count: 3,
});
tx.shuffle({ zone: { zoneId: "draw" } });
```

Moves, deals and rotations preserve component ownership. Use
`tx.setComponentOwner({ componentId, ownerId })` to change it explicitly.
`scope: "perPlayer"` determines zone instances, not privacy. Zone visibility
defaults to `"public"`; declare hands `"ownerOnly"` explicitly. A player host owns
access to its owner-only zone even when a contained component has another owner.

A `"hidden"` zone shows card backs instead of faces. A face-down card also has
no face unless the seat has explicit access. Moving a card applies the destination
zone's visibility; `tx.flipCard({ cardId, faceUp })` changes its face state within
that boundary. Public per-player zones are visible across seats; another player's
owner-only zone is omitted from the seat's zone collection and target domain.
Concealed cards in an accessible zone use opaque positional seat IDs with a
separate back image. Pass those IDs through card inputs without parsing them.
The authority rejects raw hidden card IDs from seats; testing helpers translate
trusted table IDs. Target rules based on hidden properties can disclose them
through eligibility, so authors must choose those rules deliberately.

Resources default to `visibility: "public"`. Declare `visibility: "owner"` for a
balance only its holder may see: each seat projection's `resources` lists every
player's public balances plus that seat's own owner-only balances. Reveal hidden
totals at the end through the game outcome.

## Attached zones

A zone can attach to a board, one of its generic static spaces, a cell of every
instance of a tile type, or every instance of a piece or die type. Declare
`attachedTo` instead of `scope`:

```ts
zones: [
  { id: "market-row", name: "Market", attachedTo: { board: "market" } },
  {
    id: "cargo",
    name: "Cargo",
    attachedTo: { pieceType: "ship" },
    visibility: "ownerOnly",
  },
];
```

Each host has its own ordered membership array. Board attachments use the
runtime board ID; component attachments use the component ID. A generic board-space
attachment uses the SDK's canonical board-space host codec. A tile-cell attachment
uses its stable `TileSpaceId`, encoded from the tile instance and local cell IDs.
Decoding a host
only checks its syntax: admission also checks that the current host exists and
matches the zone's declared board, space or component type.

```ts
const cargo = q.zone("cargo", "ship-1");
tx.moveComponentToZone({
  componentId: "crate-3",
  to: { zoneId: "cargo", hostId: "ship-1" },
});
```

Owner-only access follows the host's current owner. Transferring a ship changes
who can see its cargo immediately, while preserving the cargo's own ownership.
An unowned component grants no seat owner-only access. A per-player board's
replication seat owns access to its attached zones. Shared boards have no owner,
so their attached zones cannot use `ownerOnly`.

Moving a card into a public or owner-only zone starts it face-up for that zone's
permitted audience; moving it into a hidden zone starts it face-down. No owner
ID is copied into the card's audience. An explicit later `flipCard(false)` can
conceal the face even from a seat that can access the zone.

An initial home in a component-attached zone names the expanded authored
component base with `component`, for example
`{ type: "zone", zoneId: "cargo", component: "ship-1" }`. Replicated seeds
resolve replicated hosts from their origin seat. Shared seeds cannot choose a
replicated host implicitly. Initialization resolves forward references after
constructing hosts, then checks containment. Self-containment and transitive
cycles are rejected during initialization, restore and mutation; rejected moves
leave both location and ordered zone membership unchanged.

Attached zones replace board containers and component slots. All containment
uses `InZone`; the old container/slot declarations, locations, queries and
transactions are removed.

## Tile inventory

Declare reusable `tileTypes` and game-owned `tileSeeds`. A type owns immutable
geometry, face metadata and rule fields. An instance owns its ID, type ID,
current owner and mutable properties. Locations and ordered zone memberships
remain the sole placement and containment owners.

```ts
tileTypes: [
  {
    id: "forest",
    name: "Forest",
    layout: "hex",
    cells: [{ id: "center", at: { q: 0, r: 0 } }],
    fieldsSchema: z.object({ resource: z.literal("wood") }),
    fields: { resource: "wood" },
    propertiesSchema: z.object({ exhausted: z.boolean().default(false) }),
  },
],
tileSeeds: [
  { id: "forest", typeId: "forest", count: 3 },
],
```

Every type has a nonempty array of explicitly named local cells. Hex cells use
`q`/`r`; square cells use `col`/`row`. Optional edges and vertices name a `cellId`
and a bounded `side` or `corner`. Cell, edge and vertex field schemas validate
immutable metadata separately from instance `propertiesSchema`. Duplicate local
identities, coordinates and annotation addresses are invalid.

`q.tile(tileId)` returns the instance; `q.component.location(tileId)` returns its
canonical location. Tile seed counts and per-player expansion follow the same
identity rules as other components. Omitted homes are detached. `ref.tileId()`
uses declaration-stage validation at authoring and live inventory at restore.

Tile homes can also place a tile on a board. An `OnBoard` location names the
exact runtime board ID, the matching `layout`, coordinates and rotation. Hex
rotations are 0–5; square rotations are 0–3. Admission rejects overlapping cells,
incompatible layouts, invalid rotations and unsafe coordinate arithmetic.

Each placed cell has a stable `TileSpaceId` encoded from the instance ID and its
local cell ID. Moving a tile does not rename its cells. World edge and vertex
IDs are scoped to the exact runtime board instance and lattice coordinates.
Adjacent cells share world elements; conflicting immutable metadata on a shared
element is rejected.

Use `attachedTo: { tileType: "forest", cell: "center" }` for a zone at each
forest tile's center. Its host exists even while the tile is detached or in a
zone, but must remain empty until the tile is placed. Admission rejects contents
in an unplaced cell host. Host ownership follows the tile's current owner.

Board queries enumerate only the tiles placed on that board; `q.tile(id)` also
addresses detached and contained inventory. Geometric adjacency and explicit
session relations are distinct. Relations must name current board members.
Their `typeId` is a game-defined string; it need not occur in initial relations.
The board's `relationFieldsSchema` validates their fields and applies defaults.
Every relation has a required board-local `id` so it can be removed explicitly.

Use `tx.placeTile({ boardId, tileId, at })` to place inventory or relocate a tile.
`at` contains board-layout coordinates and rotation; the board determines its
layout. Placement removes prior zone membership only after the candidate
geometry passes validation. Overlap and invalid metadata leave state untouched.
Queries inside the transaction immediately see the updated topology.

Same-board movement preserves stable cells, their occupants and attached zone
contents, and explicit relations. Occupied world edges or vertices prevent an
actual move because those identities represent fixed lattice positions.
`tx.removeTile({ boardId, tileId })` detaches the tile; removal and cross-board
relocation reject cell occupants, nonempty attached zones, incident relations,
and occupied incident edges or vertices. Generic moves to zones or detached
state enforce the same dependency rule.

Add current connections with `tx.addRelation({ boardId, relation })` and remove
them with `tx.removeRelation({ boardId, relationId })`. Remove dependent state
explicitly before removing its tile. Setup can draw and place tiles using the
reducer's seeded random helpers; no second placement store or client-side random
assignment is needed.

Tile location policy and instance disclosure determine what each seat receives.
Declare a seed `disclosure` with a face audience and an independently public
appearance when its face may be concealed. Private tiles remain authoritative;
client tile references never contain inventory IDs. Generic component moves
cannot move tiles onto a component space, edge or vertex. The headless zone
facade presents projected cards and tiles through their separate controls.

## Field schemas

Author field data with `z.object(...)`, importing `z` and `ref` from
`@dreamboard-games/sdk/reducer`. `defineTopologyManifest` exports plain JSON
Schema while retaining the authored input/output types for `compileManifest`.
Use `cardSchema: { byCardType: { ... } }` for different card shapes; a shared
`z.object(...)` can be extended for each card type.

Portable fields support strings, finite numbers, integers, booleans, enums,
literals, arrays, nested objects, records with an unconstrained `z.string()` key, nullable/optional fields
and defaults. Required fields need authored values or explicit defaults. String
lengths, number bounds and array lengths survive export. Refinements, transforms,
coercion, string normalization, overwrite checks, regex flags and non-JSON values
are rejected during definition. Defaults supplied as functions are evaluated once
when authoring is converted to JSON; the exported document stores their concrete
values. Default values must satisfy the same portable schema and reference checks
as authored values. Concrete defaults must already have the complete output shape;
extra stripped keys and missing nested defaults are rejected rather than transformed.
Ordinary `z.object` fields strip unknown keys, `z.strictObject` rejects them,
and `z.looseObject` preserves them. The exported object-mode metadata preserves
these output policies through JSON. Enum-keyed records and arbitrary schema
compositions are outside the portable subset.

`ref` exposes `cardId`, `zoneId`, `playerId`, `boardId`, `spaceId`, `edgeId`,
`vertexId`, `pieceId`, `dieId`, `tileId` and `resourceId`. The markers preserve ID families
inside nested fields, arrays and records. Board-owned schemas resolve spaces,
edges and vertices within that board. Manifest validation checks declared bases and static topology. Player IDs and
replicated inventory references require the actual session roster. Table validation
resolves these against current inventory membership; successful identity decoding
alone is not admission. Changing topology must supply a fresh session reference
context rather than cache manifest-time ID enums as permanent membership.

Trusted hosts supply `referenceBasis: { sessionId, version }` to bundle projection
and dispatch. The session ID identifies one authority lifetime; advance the version
after every accepted commit and restore. Keep this metadata outside reducer
checkpoints. Submitted interaction and cancellation inputs carry the issued full
frame basis, including the perspective seat and action-set version. Materialization
rejects a projection whose reference basis differs from the frame basis.

Worker contract 0.11.0 and plugin protocol 10 require rebuilt bundles and fresh
sessions. Action-set, frame and command digest domains use version 6. There are
no legacy readers. Authoritative events explicitly declare a public or seat
audience; frame events contain only the selected seat's projected display data.
Typed tile event details use authoritative IDs in reducer state and seat references
in frames. Authored arbitrary text is deliberate publication to its audience.
