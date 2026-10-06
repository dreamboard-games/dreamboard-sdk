# Manifest and boards

```ts
import { compileManifest } from "@dreamboard-games/sdk/reducer";
import manifest from "../../../examples/reference-games/hex-network-trading/manifest";
export const contract = compileManifest(manifest);
```

The manifest owns identities, card metadata, zones and static board geometry. Hex topology uses canonical space/edge/vertex identities and shared layout math; generic and square boards use inline data, with no template identity or merging. Static boards enter frame.view.boards through the canonical materializer. See the real Hex manifest and geometry guide for authored shapes.

Inferred tables preserve each card, piece, and die's runtime ID, authored type,
and property schema. Component IDs are the union of those inventories, so
component queries and movement commands reject unknown IDs at compile time.
Board scope and space IDs stay literal; per-player runtime board IDs remain
patterns whose actual player membership is checked at runtime.

Card `frontImage` and `backImage` are repository paths under `assets/`, such as
`assets/cards/queen-of-fire.webp`. Hosts publish those files with the game and
deliver them with the session; card views then carry loadable URLs in the same
fields, so UI code renders `card.frontImage` directly.

Zone `visibility` decides who sees cards: `"hidden"` zones, such as a deck, show
no faces to anyone. `tx.flipCard({ cardId, faceUp: false })` turns a card in a
shared zone face down; moving it to another zone turns it face up. Each seat's
frame lists the cards hidden from it only by position, `hidden:<zone>:<index>`,
with their back image, and a seat may target them by that id in a card input;
other inputs, such as a form choice, never name cards. Their table ids are
rejected from seats but accepted from tests, which know the table. Target
rules that test a hidden card's properties reveal them through eligibility.

Resources default to `visibility: "public"`. Declare `visibility: "owner"` for a
balance only its holder may see: each seat projection's `resources` lists every
player's public balances plus that seat's own owner-only balances. Reveal hidden
totals at the end through the game outcome.

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
`vertexId`, `pieceId`, `dieId` and `resourceId`. The markers preserve ID families
inside nested fields, arrays and records. Board-owned schemas resolve spaces,
edges and vertices within that board. Manifest validation checks static inventory
and topology; player IDs and instantiated board IDs require the session roster.
Table validation resolves those against the active session. Future roster-derived
inventory and changing topology must supply a fresh session reference context,
rather than caching manifest-time ID enums as permanent membership.
