# 04 — Attached zones replace containers and slots

This is execution PR 5, after roster identity. Reject containment cycles; derive access on current ownership; topology removal rejects nonempty attached zones.

See [private tiles and authority](private-tiles.md).

Branch: `codex/attached-zones` (on `codex/per-player-inventory`). Size: M.
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

Use the shared identity codec introduced by execution PR 4. Extend it with a
tagged board-space tuple where a composite host identity is needed; nothing
else builds host strings. Decoding proves syntax, never current membership.

| Attachment                      | `hostId`                            |
| ------------------------------- | ----------------------------------- |
| `scope: "shared"`               | `"table"`                           |
| `scope: "perPlayer"`            | player ID                           |
| `{ board }`                     | canonical runtime board ID          |
| `{ board, space }`              | canonical encoded board-space tuple |
| `{ pieceType }` / `{ dieType }` | component ID                        |

```ts
export const zoneHost = {
  table: "table" as const,
  player: (playerId: PlayerId) => playerId,
  board: (boardId: RuntimeBoardId) => boardId,
  space: (boardId: RuntimeBoardId, spaceId: string) =>
    boardSpaceHostId(boardId, spaceId),
  component: (componentId: ComponentId) => componentId,
};
```

Do not reserve arbitrary separators such as `#` or `:`. Keep the shared codec
prefix reservation at authored identity admission; encoded tuple boundaries
make arbitrary permitted authored and roster strings unambiguous.

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
        ? BoardSpaceHostId<RuntimeBoardIdOf<M, B>, S & string>
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
- Resolve the host's current owner during every seat projection. A component
  with no current owner grants no seat owner-only access. Ownership transfer
  changes access immediately without changing contained component ownership;
  do not capture the host owner in card visibility when a component moves.

### Homes

```ts
export type ZoneHomeSpec = {
  type: "zone";
  zoneId: string;
  /** Required only for zones attached to a piece or die type: which component. */
  component?: string;
};
```

During initialization, a per-player seed resolves the corresponding host from
its replication seat through the canonical codec. Shared seeds cannot infer a
per-player host and must be placed by the reducer. A shared board attachment has
one host, so its authored home can resolve that host from the definition.

Materialize component and zone hosts before resolving home edges, including
forward references. Reject self-containment and transitive containment cycles
before installing contents. Mutation validates the destination host and its
component ancestry before changing either location or ordered membership;
restore checks the same graph after bidirectional membership admission.

### Queries and transactions

```ts
q.zone("market-row", "market-board");
q.zone("cargo", "ship-1");
tx.moveComponentToZone({
  componentId: "crate-3",
  to: { zoneId: "cargo", hostId: "ship-1" },
});
```

### Host membership and lifetime

Extend the existing zone resolver and consistency admission. A decoded host must
exist now and match the zone's declared board, space or component type; syntax
alone does not prove membership. Host enumeration and projection use the same
actual instance set. Headless and UI lookups continue to require explicit hosts.

For future tiles, a space host is identified by stable tile instance and local
cell, independently of world placement. Its empty zone may persist while the
known tile is detached, but adding contents requires a live placed space.
Initialization and restore reject detached tiles with nonempty space zones.
Removal rejects nonempty attached zones; same-board movement keeps host identity
and contents without creating another zone or placement owner.

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
- Composite host identities round-trip separator-containing board, space and
  roster IDs without collisions; well-formed nonexistent hosts are rejected.
- Type proofs: `hostId` for each attachment kind accepts the right IDs and
  rejects others (another board, a piece of another type).
- Mutation and restore reject self-containment, transitive cycles, absent or
  mismatched hosts, and inconsistent forward/reverse membership without partial
  updates. Forward-referenced valid initial homes resolve successfully.
- Ownership transfer immediately changes seat access; ownerless component hosts
  disclose no owner-only contents, and contained ownership remains unchanged.
- Space-host lifetime proofs cover empty detached hosts, rejected nonempty
  detached initialization/restore, rejected dependent removal, and same-board
  movement retaining host identity when tile placement becomes available.

## Verify

```sh
pnpm check
pnpm ui test
```

## Done when

- The only "inside something" location is `InZone`.
- Every board layout supports attached zones.
