# Instance

```ts
import { createGameInstance, iframeSource } from "@dreamboard-games/sdk";
import type definition from "../../../examples/reference-games/hearts/app/game";
export const game = createGameInstance<typeof definition>()({
  source: iframeSource(),
});
```

The curried constructor retains the game type while inferring enabled features and source capabilities. Root identity is stable; getSnapshot/inspect return immutable selected-seat models. subscribe returns cleanup. dispose ends owned source and feature lifetimes. No executable game value is needed for hosted construction.

### Required and optional lookups

ID lookups use `get` when the entity is required and `find` when presence is conditional:

```ts
const card = game.cards.get(cardId);
const interaction = game.interactions.find("play.place");
if (interaction) interaction.getInput("space").setValue(spaceId);
```

`get` returns a non-nullable entity or throws an error naming the missing ID. This
applies to players, zones, cards, boards, interactions, and inputs. `getInput`/`findInput`
and a zone's `getCard`/`findCard` follow the same rule. `players.next` requires a
player in the current seating order.

A valid manifest ID does not guarantee membership in the current snapshot: a player
may not be seated, an interaction may belong to another phase, or a card may have moved
to another zone. Use `find` for those checks and during loading. Captured stale handlers
still safely ignore input after their source or interaction changes. Optional domain
values such as an unset input, hidden card view, or an off-board hit remain nullable.
