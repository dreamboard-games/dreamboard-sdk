# Manifest and boards

```ts
import { compileManifest } from "@dreamboard-games/sdk/reducer";
import manifest from "../../../examples/reference-games/hex-network-trading/manifest";
export const contract = compileManifest(manifest);
```

The manifest owns identities, card metadata, zones and static board geometry. Hex topology uses canonical space/edge/vertex identities and shared layout math; generic and square boards use inline data, with no template identity or merging. Static boards enter frame.view.boards through the canonical materializer. See the real Hex manifest and geometry guide for authored shapes.

Card `frontImage` and `backImage` are repository paths under `assets/`, such as
`assets/cards/queen-of-fire.webp`. Hosts publish those files with the game and
deliver them with the session; card views then carry loadable URLs in the same
fields, so UI code renders `card.frontImage` directly.

Resources default to `visibility: "public"`. Declare `visibility: "owner"` for a
balance only its holder may see: each seat projection's `resources` lists every
player's public balances plus that seat's own owner-only balances. Reveal hidden
totals at the end through the game outcome.
