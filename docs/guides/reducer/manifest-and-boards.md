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
