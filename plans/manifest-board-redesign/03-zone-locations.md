# 03 — One zone location

Location, ownership and visibility remain independent. The later attached-zone layer derives access from current host state. Event delivery is part of the private-tile boundary.

See [private tiles and authority](private-tiles.md).

Branch: `sdk/zone-locations` (on `sdk/hex-lattice`). Size: L.
Read first: [table.ts](../../packages/sdk/src/reducer/model/table.ts),
[transaction-mutations.ts](../../packages/sdk/src/reducer/transaction-mutations.ts),
[zone-queries.ts](../../packages/sdk/src/reducer/table/zone-queries.ts),
[card-mutations.ts](../../packages/sdk/src/reducer/table/card-mutations.ts),
[projection-builder.ts](../../packages/sdk/src/reducer/bundle/trusted/projection-builder.ts).

## Goal

Runtime-only refactor, no manifest change. Shared and per-player zones become
one location kind addressed by `{ zoneId, hostId }`, stored once. Card
movement collapses to a handful of zone operations. Containers and slots stay
as they are until [layer 04](04-attached-zones.md).

## Current state

- Three location kinds mean "in a zone": `InDeck` (cards in shared zones),
  `InHand` (per-player zones) and `InZone` (pieces and dice in shared zones)
  ([table.ts:184](../../packages/sdk/src/reducer/model/table.ts#L184);
  [materialize.ts:1416](../../packages/sdk/src/reducer/manifest/materialize.ts#L1416),
  [1614](../../packages/sdk/src/reducer/manifest/materialize.ts#L1614),
  [1627](../../packages/sdk/src/reducer/manifest/materialize.ts#L1627)).
- Contents are stored in `zones.shared`, `zones.perPlayer`, **and** copies in
  `decks` and `hands` ([materialize.ts:2054](../../packages/sdk/src/reducer/manifest/materialize.ts#L2054));
  readers fall back between them (`table.zones.shared[zoneId] ?? table.decks[zoneId]`
  in `card-mutations.ts` and `zone-queries.ts`). Order is stored twice: in the
  arrays and in each location's `position`.
- Static zone data lives in session state: `zones.visibility`,
  `handVisibility`, `zones.cardSetIdsByZoneId`.
- The transaction API has nine card-movement methods split by shared versus
  per-player: `addCardToSharedZone`, `removeCardFromSharedZone`,
  `moveCardBetweenSharedZones`, `dealCardsBetweenPlayerZones`,
  `moveCardBetweenPlayerZones`, `moveCardFromPlayerZoneToSharedZone`,
  `moveCardFromSharedZoneToPlayerZone`, `deal`, `rotatePlayerZone`.
- Queries split the same way: `q.zone.sharedCards`, `sharedCardCollection`,
  `allSharedCards`, `playerCards`, `playerCardCollection`, `allPlayerCards`
  ([queries.ts:303](../../packages/sdk/src/reducer/model/queries.ts#L303)).

## Design

### Model

```ts
/** Which instance of a zone: "table" for shared zones, a player ID for per-player zones. */
export type ZoneHostId = string;

export type ZoneRef<
  ZoneId extends string = string,
  HostId extends string = string,
> = {
  readonly zoneId: ZoneId;
  readonly hostId: HostId;
};

export type RuntimeComponentLocation =
  | { type: "Detached" }
  | { type: "InZone"; zoneId: string; hostId: string; playedBy?: string | null }
  | {
      type: "OnSpace";
      boardId: string;
      spaceId: string;
      position?: number | null;
    }
  | {
      type: "InContainer";
      boardId: string;
      containerId: string;
      position?: number | null;
    } // until 04
  | {
      type: "OnEdge";
      boardId: string;
      edgeId: string;
      position?: number | null;
    }
  | {
      type: "OnVertex";
      boardId: string;
      vertexId: string;
      position?: number | null;
    }
  | {
      type: "InSlot";
      host: RuntimeSlotHostRef;
      slotId: string;
      position?: number | null;
    }; // until 04

export type RuntimeTableRecord = {
  playerOrder: string[];
  /** zones[zoneId][hostId]: ordered contents. The only store of zone membership order. */
  zones: Record<string, Record<string, string[]>>;
  componentLocations: Record<string, RuntimeComponentLocation>;
  cards: Record<string, RuntimeCardData>;
  pieces: Record<string, RuntimePieceData>;
  dice: Record<string, RuntimeDieData>;
  ownerOfCard: RuntimeOwnerMap;
  visibility: RuntimeVisibilityMap;
  resources: RuntimeResourceMap;
  boards: RuntimeBoardCollections;
};
```

- `InZone` has no `position`: order is the array in `zones[zoneId][hostId]`.
  Board locations keep `position` for stacking because they have no array.
- `playedBy` stays; Hearts uses it for the current trick.
- Host IDs: `"table"` for shared zones, the player ID for per-player zones.
  Layer 04 adds board and component hosts through the same field.
- Every declared zone has an entry for every host at table creation (shared:
  `{ table: [] }`; per-player: one entry per player in `playerOrder`).

### Static zone data comes from the compiled manifest

```ts
export type ZoneDefinition = {
  readonly scope: "shared" | "perPlayer";
  readonly visibility: "public" | "ownerOnly" | "hidden";
  readonly allowedCardSetIds: readonly string[] | null;
};

// compiled manifest
zoneDefinitions: Readonly<Record<ZoneId, ZoneDefinition>>;
```

This replaces `table.zones.visibility`, `table.handVisibility`,
`table.zones.cardSetIdsByZoneId`, and the compiled `cardSetIdsBySharedZoneId`
/ `cardSetIdsByPlayerZoneId`. The `deckId`, `handId`, `sharedZoneId` and
`playerZoneId` ID families in `ManifestIdsOf` collapse to `zoneId`; keep
`SharedZoneIdOf<M>` and `PlayerZoneIdOf<M>` as type helpers only.

### Transaction API

| Old                                                                                                                                                           | New                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `addCardToSharedZone`, `moveCardBetweenSharedZones`, `moveCardBetweenPlayerZones`, `moveCardFromPlayerZoneToSharedZone`, `moveCardFromSharedZoneToPlayerZone` | `tx.moveComponentToZone({ componentId, to, position?, playedBy? })` |
| `removeCardFromSharedZone`                                                                                                                                    | `tx.moveComponentToDetached({ componentId })` (exists)              |
| `deal`, `dealCardsBetweenPlayerZones`                                                                                                                         | `tx.deal({ from, to, count })`                                      |
| `rotatePlayerZone`                                                                                                                                            | `tx.rotateZone({ zoneId, direction })` (per-player zones only)      |
| `tx.shuffle({ zoneId, playerId? })`                                                                                                                           | `tx.shuffle({ zone })`                                              |

```ts
type ZoneArg<Table, Z extends ZoneIdOfTable<Table>> =
  Z extends SharedZoneIdOfTable<Table>
    ? { readonly zoneId: Z; readonly hostId?: "table" }
    : { readonly zoneId: Z; readonly hostId: PlayerIdOfTable<Table> };

moveComponentToZone<Z extends ZoneIdOfTable<Table>>(args: {
  componentId: ComponentIdAllowedIn<Table, Z>;
  to: ZoneArg<Table, Z>;
  position?: "top" | "bottom" | number; // default "bottom"
  playedBy?: PlayerIdOfTable<Table> | null;
}): State;

deal<From extends ZoneIdOfTable<Table>, To extends ZoneIdOfTable<Table>>(args: {
  from: ZoneArg<Table, From>;
  to: ZoneArg<Table, To>;
  count: number; // stops at the end of the source, as today
}): State;
```

The source is always read from `componentLocations`, so callers never name it.
Keep today's rules: card-set compatibility (now from `zoneDefinitions`),
ownership changes when a card enters a per-player zone, and visibility
recomputed from the destination.

Example (Hearts setup and play):

```ts
tx.shuffle({ zone: { zoneId: "draw-pile" } });
for (const playerId of q.player.order()) {
  tx.deal({
    from: { zoneId: "draw-pile" },
    to: { zoneId: "hand", hostId: playerId },
    count: 13,
  });
}
tx.moveComponentToZone({
  componentId: cardId,
  to: { zoneId: "current-trick" },
  playedBy: playerId,
});
```

### Queries

| Old                                                                   | New                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------------- |
| `q.zone.sharedCards(z)`, `q.zone.playerCards(p, z)`                   | `q.zone(z, hostId?)` → ordered component IDs             |
| `q.zone.sharedCardCollection(z)`, `q.zone.playerCardCollection(p, z)` | `q.zone.cards(z, hostId?)` → card data in order          |
| `q.zone.allSharedCards()`, `q.zone.allPlayerCards(z)`                 | `q.zones(z)` → `Readonly<Record<hostId, readonly Id[]>>` |

`hostId` is omitted for shared zones and required for per-player zones, typed
like `ZoneArg` above.

### Projection

Seat zone handles become `zones[zoneId][hostId]` instead of `zones[zoneId]`.
Keep today's inclusion rule unchanged (per-player zones of the viewing seat plus
zones referenced by the phase's card interactions), but read visibility from
`zoneDefinitions`:

- `public`: include.
- `ownerOnly`: include only when `hostId` is the viewer.
- `hidden`: omit.

Update [projection-builder.ts:111–175](../../packages/sdk/src/reducer/bundle/trusted/projection-builder.ts#L111),
the wire schema for seat zones, `hydrateZones` in
[projection.ts](../../packages/sdk/src/shared/protocol/projection.ts), the
headless hand feature, and registry `hand`/`pile` items.

## Delete

- `InDeck`, `InHand`; `table.decks`, `table.hands`, `table.handVisibility`,
  `zones.shared`, `zones.perPlayer`, `zones.visibility`, `zones.cardSetIdsByZoneId`.
- The nine card-movement methods listed above and their implementations and
  fallbacks in `card-mutations.ts`, `internal.ts`, `zone-queries.ts`,
  `component-locations.ts`.
- `deckId`/`handId`/`sharedZoneId`/`playerZoneId` ID families and schemas.
- Codec schemas for the deleted fields in
  [session-codec.ts](../../packages/sdk/src/reducer/ingress/session-codec.ts).

## Migrate

- Hearts: setup, dealing, passing (`rotatePlayerZone` → `rotateZone`), trick play,
  views and UI.
- Hex: any zone reads (it has no zones today; confirm).
- Registry items, stories and `templates/game`.
- Docs: [ui/zones.md](../../docs/guides/ui/zones.md),
  [manifest-and-boards.md](../../docs/guides/reducer/manifest-and-boards.md).

## Tests and proofs

- Port behavioural tests from `card-mutations.test.ts`,
  `component-mutations.test.ts` and `zone-queries.test.ts` to the new API;
  keep every behaviour they assert (ordering, top/bottom, ownership,
  visibility, card-set rejection, deal stopping at empty).
- Invariant test: after any sequence of moves, `zones` and
  `componentLocations` agree (each `InZone` component appears exactly once, in
  its zone and host).
- Type proofs: `hostId` required for per-player zones and rejected for shared
  zones; card-set compatibility rejects incompatible cards.
- Hearts `projection-privacy` scenario still passes unchanged.

## Verify

```sh
pnpm check
pnpm reference
pnpm ui test
```

## Done when

- Zone membership order is stored exactly once.
- No session state contains static zone definitions.
- One move, one deal, one rotate and one shuffle operation cover all zones.
