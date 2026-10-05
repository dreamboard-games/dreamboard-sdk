# Zones and cards

```ts
import type { GameInstance } from "@dreamboard-games/sdk";
export function visibleCards(
  game: GameInstance<unknown>,
  zoneId: string,
  hostId: string,
) {
  return (
    game.zones
      .find(zoneId, hostId)
      ?.getCards()
      .filter((card) => !card.hidden) ?? []
  );
}
```

A zone is identified by both `zone.id` and `zone.hostId`. Always pass both to
`game.zones.get(zoneId, hostId)`: use `"table"` for a shared zone or the actual
player ID for a per-player zone. Host IDs are never inferred from ownership or
from the keys present in the projection.
`get` requires the zone to exist in the seat's frame; `find` returns `undefined`
when it is absent. `getAll` lists only projected zone instances.

Public per-player zones are visible across seats. Another player's owner-only
zone is omitted. Within an accessible zone, cards remain in authoritative order.
A concealed card has a null view, an opaque positional seat ID and its back-image
URL when available. Treat the ID as opaque and pass it through card selection;
do not reconstruct a table ID or infer ownership from the host or ID.

Cards expose canonical routing, selection and native props. Multiple valid
routes require an explicit interaction instead of choosing the first.
`handFeature` adds hand helpers; optional sorting stays application-owned.
