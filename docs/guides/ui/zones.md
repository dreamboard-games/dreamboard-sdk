# Zones and cards

```ts
import type { GameInstance } from "@dreamboard-games/sdk";
export function visibleCards(game: GameInstance<unknown>, zoneId: string) {
  return (
    game.zones
      .get(zoneId)
      ?.getCards()
      .filter((card) => !card.hidden) ?? []
  );
}
```

Zones list every card in the seat's zones, in order. A card hidden from the seat, in a hidden zone or face down, has a null view, a positional id such as `hidden:deck:0`, and its `backImage` URL when it has one; select it like any other card to target it by position. Cards expose canonical routing, selection and native props. Multiple valid routes require an explicit interaction instead of choosing the first. handFeature adds hand helpers; optional sorting stays application-owned.
