# 005 Preserve Card-Location Invariants

- Status: Proposed
- Priority: P0
- Risk: High
- Effort: Medium
- Primary owner: Reducer
- Depends on: 001
- Planned at: `d84c620`

## Summary

Make card collection membership and `componentLocations` one atomic invariant.
Every card mutation must prove its source before changing state, reject
duplicate placement, and leave the card in one well-defined location.

## Current State

`packages/sdk/src/reducer/table/card-mutations.ts` currently has several
independent mutation paths:

- `appendToDeckInPlace` appends without proving the card is detached or absent;
- `removeFromDeckInPlace` silently tolerates an absent card and does not update
  `componentLocations`;
- player-to-shared and shared-to-shared moves remove before all source
  invariants are established;
- the standalone shared-zone removal path leaves stale location metadata;
- some move paths validate collection membership but not the exact
  `componentLocations` discriminator and IDs.

This permits duplicated cards, stale location metadata, and partial mutation
when a later check throws.

## Invariant

For every materialized card ID:

1. the card appears in at most one zone collection;
2. `componentLocations[cardId]` exactly names that collection, or is
   `{ type: "Detached" }`;
3. source and destination validation completes before the first write;
4. card order indexes are contiguous after a mutation;
5. owner and visibility fields change only when the operation contract says
   they should.

## Scope

### In scope

- shared-zone, player-zone, and detached card transitions;
- standalone add/remove helpers;
- move and deal operations;
- duplicate-destination rejection;
- no-partial-mutation regression tests.

### Out of scope

- changing card ownership or visibility semantics;
- changing deck shuffle algorithms;
- introducing a normalized table-state model.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-005-card-location-invariants
```

Commit:

```text
Preserve card location invariants
```

## Implementation Steps

### 1. Centralize source assertions

Add private helpers near the existing card collection helpers:

```ts
function assertCardInSharedZone(
  table: RuntimeTableState,
  zoneId: string,
  cardId: string,
): void {
  const zone = requireSharedCardZone(table, zoneId);
  if (!zone.cardIds.includes(cardId)) {
    throw new Error(`Card '${cardId}' is not in shared zone '${zoneId}'.`);
  }

  const location = table.componentLocations[cardId];
  if (location?.type !== "SharedCardZone" || location.zoneId !== zoneId) {
    throw new Error(
      `Card '${cardId}' has a location that disagrees with shared zone '${zoneId}'.`,
    );
  }
}

function assertCardDetached(table: RuntimeTableState, cardId: string): void {
  const location = table.componentLocations[cardId];
  if (location?.type !== "Detached") {
    throw new Error(`Card '${cardId}' must be detached before placement.`);
  }
}
```

Add the equivalent `assertCardInPlayerZone` helper and compare all relevant
fields, including `zoneId` and `playerId`. Do not rely only on
`Array.prototype.includes`.

### 2. Validate the entire transition before mutation

Each public operation should follow the same order:

```ts
assertCardInSharedZone(table, sourceZoneId, cardId);
assertDestinationAcceptsCard(table, destinationZoneId, cardId);
assertCardAbsentFromDestination(table, destinationZoneId, cardId);

removeCardFromSharedZoneCollectionInPlace(table, sourceZoneId, cardId);
appendCardToPlayerZoneCollectionInPlace(
  table,
  destinationZoneId,
  playerId,
  cardId,
);
table.componentLocations[cardId] = {
  type: "PlayerCardZone",
  zoneId: destinationZoneId,
  playerId,
};
```

Do not remove from the source and then discover an invalid destination.
Validation helpers must be read-only.

### 3. Separate collection primitives from complete public transitions

Rename low-level helpers so their limited responsibility is explicit:

```ts
function removeCardFromSharedZoneCollectionInPlace(/* ... */): void;
function appendCardToSharedZoneCollectionInPlace(/* ... */): void;
```

Keep these private. Public reducer operations must also update
`componentLocations`.

### 4. Make standalone removal detach the card

`removeCardFromSharedZoneInPlace` must be a complete transition:

```ts
assertCardInSharedZone(table, zoneId, cardId);
removeCardFromSharedZoneCollectionInPlace(table, zoneId, cardId);
table.componentLocations[cardId] = { type: "Detached" };
```

Preserve owner and visibility metadata unless the existing public operation
explicitly resets them.

### 5. Reject duplicate placement

Adding a card to a zone is valid only from `Detached`:

```ts
assertCardDetached(table, cardId);
assertCardAbsentFromDestination(table, zoneId, cardId);
assertDestinationAcceptsCard(table, zoneId, cardId);
```

Treat a second append as an invariant error, not an idempotent operation.
Silent idempotency would conceal a caller bug and can leave ordering metadata
ambiguous.

### 6. Reindex once after each successful collection mutation

Use one helper to rebuild order fields after removal or insertion:

```ts
function reindexCards(
  table: RuntimeTableState,
  cardIds: readonly string[],
): void {
  cardIds.forEach((cardId, index) => {
    table.cards[cardId].index = index;
  });
}
```

If the current model stores order elsewhere, keep the same principle but use
the actual canonical field. Never leave a temporary duplicate index visible
after the public operation returns.

### 7. Apply the invariant to every move and deal path

Cover:

- detached -> shared;
- detached -> player;
- shared -> detached;
- player -> detached, if exposed;
- shared -> shared;
- shared -> player;
- player -> shared;
- player -> player;
- deck/shared-zone deal loops;
- player-zone deal loops.

For a multi-card deal, validate the count and destination compatibility before
the first iteration. If per-card validation can still fail, preselect and
validate the full card list before mutating.

## Test Plan

Add table reducer tests for:

- wrong source zone with a valid card ID;
- membership present but mismatched `componentLocations`;
- location present but collection membership absent;
- duplicate append to the same or another zone;
- standalone removal produces `Detached`;
- every supported move direction updates both collections and location;
- order indexes remain contiguous after first, middle, and last removal;
- a failed move leaves a deep-equal copy of the original table unchanged;
- a multi-card deal failure performs no partial move.

Example assertion:

```ts
const before = structuredClone(table);

expect(() =>
  moveCardFromSharedZoneToPlayerZoneInPlace(table, {
    sourceZoneId: "draw",
    destinationZoneId: "hand",
    playerId: "p1",
    cardId: "card-1",
  }),
).toThrow("location that disagrees");

expect(table).toEqual(before);
```

Commands:

```sh
pnpm --filter @dreamboard-games/sdk test -- card-mutations
pnpm --filter @dreamboard-games/sdk typecheck
pnpm check
```

## Done Criteria

- Every card operation proves its source before mutation.
- Collection membership and `componentLocations` always agree.
- Standalone removal produces a detached card.
- Duplicate placement is rejected.
- Failed transitions leave table state unchanged.
- All move and deal directions have invariant-focused tests.

## STOP Conditions

- Stop if a current caller intentionally moves a card whose recorded source is
  stale. Repair that caller; do not weaken the invariant.
- Stop if a multi-card operation cannot validate atomically with the current
  API. Introduce a read-only planning step before applying mutations.
- Stop if owner or visibility semantics differ by path and are undocumented.
  Record those contracts before consolidating helpers.

## Maintenance

New card mutation APIs must use the same source assertions and complete
location transition helpers. Low-level collection primitives remain private.
