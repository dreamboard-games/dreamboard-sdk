# 003 Make Card-Home Materialization Total

- Status: Proposed
- Priority: P0
- Risk: High
- Effort: Medium
- Primary owner: Codegen
- Depends on: 002
- Planned at: `d84c620`

## Summary

Make every accepted `BoardCard.home` variant produce a valid initial component
location, reject ambiguous player-scoped destinations, and remove implicit
placement based only on `allowedCardSetIds`.

## Current State

`BoardCard.home` accepts seven variants:

```ts
type ComponentHomeSpec =
  | { type: "detached" }
  | { type: "zone"; zoneId: string }
  | { type: "space"; boardId: string; spaceId: string }
  | { type: "container"; boardId: string; containerId: string }
  | { type: "edge"; boardId: string; ref: BoardEdgeRef }
  | { type: "vertex"; boardId: string; ref: BoardVertexRef }
  | { type: "slot"; host: SlotHostRef; slotId: string };
```

The card materializer handles only `zone` and `detached`. Cards with other
accepted homes can have no `componentLocations` entry.

An additional fallback places any still-unlocated card into the first shared
zone that lists its card set. That contradicts the authoring contract, which
says omitted homes start detached.

## Scope

### In scope

- card-home validation and materialization;
- removal of implicit first-compatible-zone placement;
- explicit shared zone, shared board, slot, and detached tests;
- release-note migration details for omitted homes.

### Out of scope

- adding `ownerId` to `BoardCard`;
- automatically distributing card inventory to per-player hands;
- changing zone compatibility semantics;
- reducer setup APIs.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-003-card-homes
```

Commit:

```text
Materialize every accepted card home
```

## Implementation Steps

### 1. Reject player-scoped card destinations

Add `validateCardHomes` beside `validatePlayerScopedSeedHomes`.

Cards do not carry an owner, so these destinations are ambiguous:

- a zone whose scope is `perPlayer`;
- a board-targeting home whose board scope is `perPlayer`.

Emit path-specific errors:

```ts
if (
  card.home?.type === "zone" &&
  zoneScopeById.get(card.home.zoneId) === "perPlayer"
) {
  issues.push(
    `${path}.zoneId: Card '${card.type}' cannot target per-player zone '${card.home.zoneId}' because card inventory has no ownerId. Place it during reducer setup instead.`,
  );
}
```

Use the same board-target predicate as seed validation. Slot homes remain valid
when their host and slot pass existing strict validation.

### 2. Materialize an explicit location for every card

Extract a card-specific helper:

```ts
function assignCardHome(
  cardId: string,
  home: BoardCard["home"] | undefined,
  context: { path: string; label: string },
): void {
  switch (home?.type ?? "detached") {
    case "detached":
      componentLocations[cardId] = {
        type: "Detached",
        position: nextLocationPosition({ type: "Detached" }),
      };
      return;
    case "zone":
      componentLocations[cardId] = {
        type: "InDeck",
        deckId: home.zoneId,
        playedBy: null,
        position: nextLocationPosition({
          type: "InDeck",
          deckId: home.zoneId,
          playedBy: null,
        }),
      };
      return;
    case "space":
      componentLocations[cardId] = {
        type: "OnSpace",
        boardId: home.boardId,
        spaceId: home.spaceId,
        position: nextLocationPosition({
          type: "OnSpace",
          boardId: home.boardId,
          spaceId: home.spaceId,
        }),
      };
      return;
    // container, edge, vertex, and slot follow the existing seed logic.
  }
}
```

Reuse the existing edge/vertex resolution helpers. Do not duplicate geometry
key logic.

### 3. Remove compatibility-driven implicit placement

Delete the loop that assigns every unlocated card to the first shared zone with
a matching `allowedCardSetIds[0]`.

The durable rule is:

```text
allowedCardSetIds = destination compatibility
home = initial placement
reducer setup = dynamic distribution and shuffle
```

Preset cards without an authored home therefore start detached. Game setup must
place and shuffle them explicitly.

### 4. Keep collection maps derived from locations

Retain the final pass that derives `decks`, `hands`, and zone arrays from
`componentLocations`. Add an assertion in tests that every card has exactly one
location before collection derivation.

### 5. Clarify authoring documentation

Update the `BoardCard.home` JSDoc:

```ts
/**
 * Optional initial home. Omitted cards start Detached.
 * Compatibility declarations such as allowedCardSetIds never imply placement.
 * Player-scoped distribution belongs in reducer setup.
 */
home?: ComponentHomeSpec;
```

## Test Plan

Add a table-driven test covering:

| Authored home    | Expected location |
| ---------------- | ----------------- |
| omitted          | `Detached`        |
| detached         | `Detached`        |
| shared zone      | `InDeck`          |
| shared space     | `OnSpace`         |
| shared container | `InContainer`     |
| shared edge      | `OnEdge`          |
| shared vertex    | `OnVertex`        |
| strict slot      | `InSlot`          |

Also test:

- per-player zone home rejected;
- per-player board home rejected;
- a compatible shared zone does not auto-place a card with omitted home;
- explicit shared-zone cards keep `decks`, `zones.shared`, positions, and
  locations aligned.

Commands:

```sh
pnpm --filter @dreamboard-games/workspace-codegen test
pnpm --filter @dreamboard-games/workspace-codegen typecheck
pnpm --filter @dreamboard-games/sdk-types typecheck
pnpm check
```

## Done Criteria

- Every validated card has one `componentLocations` entry.
- All shared home variants materialize correctly.
- Ambiguous per-player homes fail validation with actionable messages.
- Omitted homes are detached even when a zone lists the card set.
- No implicit shuffle or placement remains in materialization.

## STOP Conditions

- Stop if a shipped scaffold relies on implicit compatible-zone placement.
  Update that scaffold or its reducer setup explicitly and record the migration;
  do not keep the ambiguous fallback.
- Stop if cards need owner-specific authored homes. That requires a separate
  public contract decision, not an inferred owner.

## Maintenance

Whenever `ComponentHomeSpec` gains a variant, update both the exhaustive
validator and the card/seed materializers in the same change.
