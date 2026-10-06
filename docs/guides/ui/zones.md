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
player ID for a per-player zone. Attached zones use their runtime board,
board-space or component host ID. Host IDs are never inferred from ownership or
from the keys present in the projection.
`get` requires the zone to exist in the seat's frame; `find` returns `undefined`
when it is absent. `getAll` lists only projected zone instances.

This UI facade presents cards: its count and empty-state helpers describe the
projected cards. Reducer `q.zone(zoneId, hostId)` returns the complete ordered
component inventory, including pieces and dice. A zone containing only pieces
can therefore have an empty card presentation.

Public per-player zones are visible across seats. Another player's owner-only
zone is omitted. Within an accessible zone, cards remain in authoritative order.
An owner-only attached zone follows its host's current owner; transferring the
host changes access without changing the ownership of contained cards. An unowned
component exposes no owner-only zone. Hidden zones attached to shared boards
expose backs and counts to all seats; those attached to per-player boards or
components are accessible only to the host's seat or current owner.
A concealed card has a null view, an opaque positional seat ID and its back-image
URL when available. Treat the ID as opaque and pass it through card selection;
do not reconstruct a table ID or infer ownership from the host or ID.

Cards expose canonical routing, selection and native props. Multiple valid
routes require an explicit interaction instead of choosing the first.
`handFeature` adds hand helpers; optional sorting stays application-owned.
