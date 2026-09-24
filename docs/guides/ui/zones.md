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

Zones expose authoritative visible counts and cards. Hidden cards have null view; do not reconstruct private metadata from IDs. Cards expose canonical routing, selection and native props. Multiple valid routes require an explicit interaction instead of choosing the first. handFeature adds hand helpers; optional sorting stays application-owned.
