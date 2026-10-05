# Manifest and boards

```ts
import { compileManifest } from "@dreamboard-games/sdk/reducer";
import manifest from "../../../examples/reference-games/hex-network-trading/manifest";
export const contract = compileManifest(manifest);
```

The manifest owns identities, card metadata, zones and static board geometry. Hex topology uses canonical space/edge/vertex identities and shared layout math; generic and square boards use inline data, with no template identity or merging. The SDK projects current board instances into each seat's `boards` collection. The frame materializer exposes that collection as `frame.view.boards`; authored views cannot overwrite it. See the real Hex manifest and geometry guide for authored shapes.

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
Static board data contains shared boards only. Use the actual table inventories
for runtime enumeration.

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

A zone can attach to a board, one of its spaces, or every instance of a piece
or die type. Declare `attachedTo` instead of `scope`:

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
runtime board ID; component attachments use the component ID. A board-space
attachment uses the SDK's canonical board-space host codec. Decoding a host
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

This layer supports detached tiles and public zone inventory. Private initial
homes and destinations reject before mutation. Tiles cannot occupy a component
space, edge or vertex. Board placement, private projection and tile UI follow in
the subsequent layers; the current headless zone facade continues to present
cards. Tile seed assignments and instance properties are not automatically sent
in static, seat or UI bridge projections.

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
