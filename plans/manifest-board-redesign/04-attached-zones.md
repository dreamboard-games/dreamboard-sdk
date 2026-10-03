# 04 — Attached zones replace containers and slots

Branch: `sdk/attached-zones` (on `sdk/zone-locations`). Size: M.
Read first: [03 — one zone location](03-zone-locations.md),
[contracts.ts](../../packages/sdk/src/shared/domain/contracts.ts) (`ZoneSpec`,
`BoardContainerSpec`, `ComponentSlotSpec`, home specs).

## Goal

Board containers, space containers and piece/die slots become zones attached
to a host. They gain visibility and card-set rules, hex boards gain them, and
the `InContainer` and `InSlot` locations disappear.

## Current state

- Containers are declared per board (`containers` on generic and square boards
  only; hex boards always materialize `containers: {}`,
  [materialize.ts:1853](../../packages/sdk/src/reducer/manifest/materialize.ts#L1853)).
  They have no visibility and a `zoneId` nothing reads
  ([materialize.ts:1868](../../packages/sdk/src/reducer/manifest/materialize.ts#L1868)).
- Slots are declared per piece or die type (`slots`) with no visibility or
  card-set rules, addressed by `InSlot { host: { kind, id }, slotId }` and
  queried through `q.slot.*` ([queries.ts:347](../../packages/sdk/src/reducer/model/queries.ts#L347)).
- No reference game, template or registry item uses containers or slots; only
  SDK tests do.

## Design

### Manifest

```ts
export type ZoneSpec = {
  id: string;
  name: string;
  visibility?: "public" | "ownerOnly" | "hidden";
  allowedCardSetIds?: string[];
} & (
  | { scope: "shared" | "perPlayer" }
  | {
      /** One instance per host instance. */
      attachedTo:
        | { board: string } // per board instance (per player for per-player boards)
        | { board: string; space: string } // per board instance, at one space
        | { pieceType: string } // per piece of that type
        | { dieType: string }; // per die of that type
    }
);
```

```ts
zones: [
  { id: "discard", name: "Discard", scope: "shared", visibility: "public" },
  { id: "market-row", name: "Market", attachedTo: { board: "market-board" }, visibility: "public" },
  { id: "harbor-stock", name: "Harbor", attachedTo: { board: "frontier", space: "north-harbor" } },
  { id: "cargo", name: "Cargo", attachedTo: { pieceType: "ship" }, visibility: "ownerOnly" },
],
```

Attachment is declared on the zone, so every board layout supports it. Validate
that the referenced board, space, piece type or die type exists.

### Hosts

One codec in `shared/domain/zone-hosts.ts`; nothing else builds host strings.

| Attachment                      | `hostId`                                              |
| ------------------------------- | ----------------------------------------------------- |
| `scope: "shared"`               | `"table"`                                             |
| `scope: "perPlayer"`            | player ID                                             |
| `{ board }`                     | runtime board ID (`frontier`, or `frontier:player-1`) |
| `{ board, space }`              | `` `${runtimeBoardId}#${spaceId}` ``                  |
| `{ pieceType }` / `{ dieType }` | component ID                                          |

```ts
export const zoneHost = {
  table: "table" as const,
  player: (playerId: PlayerId) => playerId,
  board: (boardId: RuntimeBoardId) => boardId,
  space: (boardId: RuntimeBoardId, spaceId: string) => `${boardId}#${spaceId}`,
  component: (componentId: ComponentId) => componentId,
};
```

Reserve `#` in authored IDs (board, space, zone, piece, die, card) and reject
it in manifest validation.

Type-level host IDs follow the attachment:

```ts
type HostIdOfZone<M, Z> =
  ZoneSpecOf<M, Z> extends { scope: "shared" }
    ? "table"
    : ZoneSpecOf<M, Z> extends { scope: "perPlayer" }
      ? PlayerId
      : ZoneSpecOf<M, Z> extends {
            attachedTo: { board: infer B; space: infer S };
          }
        ? `${RuntimeBoardIdOf<M, B>}#${S & string}`
        : ZoneSpecOf<M, Z> extends { attachedTo: { board: infer B } }
          ? RuntimeBoardIdOf<M, B>
          : ZoneSpecOf<M, Z> extends { attachedTo: { pieceType: infer T } }
            ? PieceIdOfType<M, T>
            : ZoneSpecOf<M, Z> extends { attachedTo: { dieType: infer T } }
              ? DieIdOfType<M, T>
              : never;
```

### Visibility

- `public` and `hidden` mean what they mean for table zones.
- `ownerOnly`: the owner is the player of a per-player board instance, or the
  component's owner. Reject `ownerOnly` on zones attached to shared boards or
  spaces of shared boards (there is no owner).

### Homes

```ts
export type ZoneHomeSpec = {
  type: "zone";
  zoneId: string;
  /** Required only for zones attached to a piece or die type: which component. */
  component?: string;
};
```

Per-player instances resolve from the component's owner, as per-player zones
do today. Board-attached zones on shared boards have one instance, so no host
is needed.

### Queries and transactions

```ts
q.zone("market-row", "market-board");
q.zone("cargo", "ship-1");
tx.moveComponentToZone({
  componentId: "crate-3",
  to: { zoneId: "cargo", hostId: "ship-1" },
});
```

## Delete

- `BoardContainerSpec`, `BoardContainerHostSpec`, `BoardHostSpec`,
  `SpaceHostSpec`, `containers`, `containerFieldsSchema` on board specs.
- `ComponentSlotSpec`, `slots` on piece and die types, `SlotHomeSpec`,
  `SlotHostRef` and friends, `ContainerHomeSpec`.
- `InContainer`, `InSlot`, `RuntimeBoardContainerState`, board `containers`
  state, `RuntimeBoardSpaceState.zoneId`, `q.slot.*`, `container` and
  `containerOccupants` board queries, `moveComponentToContainer`,
  `boardContainerId` ID family,
  [slots.ts](../../packages/sdk/src/shared/domain/slots.ts) (`ViewSlotOccupant`).
- `TypedPieceSlotHomeSpec`, `TypedDieSlotHomeSpec`, container home typing in
  `authoring.ts`.

## Migrate

- SDK tests and fixtures that declare containers or slots
  ([table-test-fixtures.ts](../../packages/sdk/src/reducer/table/table-test-fixtures.ts)
  uses `market-row`, `restricted-row` and `cell-storage` containers).
- Docs: zones guide gains "Attached zones"; board guide drops containers.

## Tests and proofs

- Instances: a zone attached to a per-player board exists once per player; a
  zone attached to a piece type exists once per piece of that type; a zone
  attached to a hex board works.
- Visibility: `ownerOnly` on a per-player board or owned piece shows only to
  the owner; `ownerOnly` on a shared board is a validation error.
- Homes: a piece homed into `cargo` with `component` lands in that ship's zone;
  a missing `component` for a component-attached zone is an error.
- `#` in an authored ID is a validation error.
- Type proofs: `hostId` for each attachment kind accepts the right IDs and
  rejects others (another board, a piece of another type).

## Verify

```sh
pnpm check
pnpm ui test
```

## Done when

- The only "inside something" location is `InZone`.
- Every board layout supports attached zones.
