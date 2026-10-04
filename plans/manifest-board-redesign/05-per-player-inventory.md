# 05 — Per-player inventory and one per-player identity

This is execution PR 4, before attached zones. The illustrated lastIndexOf codec is insufficient without an enforced collision-free grammar or known instance metadata. Validate roster membership separately.

See [private tiles and authority](private-tiles.md).

Branch: `sdk/per-player-inventory` (on `sdk/attached-zones`). Size: M.
Read first: [pieces.ts](../../examples/reference-games/hex-network-trading/manifest/pieces.ts),
[board-target.ts](../../packages/sdk/src/shared/board-target.ts),
[boardTarget.ts](../../packages/sdk/src/reducer/inputs/boardTarget.ts).

## Goal

- Piece seeds, die seeds and cards accept `scope: "perPlayer"`: one set per
  seated player, created from the real roster.
- Ownership follows scope. Manifests never name players.
- Per-player instances (boards, zones, inventory) use one identity: the runtime
  string built by one codec.

## Current state

- Zones and boards support `scope: "perPlayer"`; inventory does not. The Hex
  example builds player IDs by hand and must match `maxPlayers` manually
  ([pieces.ts:1–32](../../examples/reference-games/hex-network-trading/manifest/pieces.ts#L1)),
  and finds unplaced pieces by scanning every piece for `Detached` + owner
  ([reducer-support.ts:82–110](../../examples/reference-games/hex-network-trading/app/reducer-support.ts#L82)).
- Authoring types those literals with tuple arithmetic (`BuildTuple`,
  `EnumerateInternal`, `AddOne`, `OneTo`,
  [authoring.ts:363–383](../../packages/sdk/src/reducer/manifest/authoring.ts#L363)),
  while the runtime `PlayerId` is a branded string
  ([per-player.ts:18](../../packages/sdk/src/reducer/per-player.ts#L18)).
- `visibility.visibleTo` in authored component visibility also lists literal
  player IDs.
- Per-player boards are identified two ways: the runtime string
  `frontier:player-1` (tables, queries, `ids.boardId` as
  `z.templateLiteral([id, ":", z.string().min(1)])` in
  [compiler.ts:132](../../packages/sdk/src/reducer/manifest/compiler.ts#L132))
  and `PlayerBoardSpaceTarget { boardId: base, playerId, spaceId }` for
  input values. `BoardTargets` re-encodes the string by hand
  ([board-targets.tsx:318](../../registry/items/board-targets.tsx#L318)).

## Design

### Manifest

```ts
export type PieceSeedSpec = {
  id?: string;
  name?: string;
  typeId: string;
  count?: number;
  /** "perPlayer": one set per seated player. Default "shared". */
  scope?: "shared" | "perPlayer";
  home?: ComponentHomeSpec;
  visibility?: { faceUp?: boolean };
  fields?: { [key: string]: JsonValue };
};
// DieSeedSpec gains the same `scope`; BoardCard gains `scope` for per-player starting decks.
// `ownerId` and `visibility.visibleTo` are removed everywhere in the manifest.
```

Hex example after:

```ts
zones: [{ id: "supply", name: "Supply", scope: "perPlayer", visibility: "public" }],

pieceSeeds: [
  { id: "bandits", typeId: "bandits" },
  { id: "trail", typeId: "trail", count: 10, scope: "perPlayer", home: { type: "zone", zoneId: "supply" } },
  { id: "camp", typeId: "camp", count: 4, scope: "perPlayer", home: { type: "zone", zoneId: "supply" } },
],
```

```ts
// reducer-support.ts: the Detached/owner scan becomes a zone read.
const trailId = q
  .zone("supply", playerId)
  .find((id) => state.table.pieces[id].pieceTypeId === "trail");
```

### Runtime IDs and ownership

- Runtime ID: `` `${seedRuntimeId}:${playerId}` `` where `seedRuntimeId` is the
  existing count expansion (`trail-3`). Example: `trail-3:player-1`. This is
  the per-player board pattern (`frontier:player-1`).
- Type: `` `${RuntimeIds<Id, Count>}:${string}` ``. Roster membership is checked
  at runtime, as for per-player boards.
- ID schemas: `z.templateLiteral([seedRuntimeId, ":", z.string().min(1)])` per
  per-player seed, unioned with the shared literals.
- `ownerId` is the player for per-player components and `null` for shared
  ones; reducers still reassign it with existing mutations.

### Home resolution

| Seed scope  | Home target                                       | Result                                                              |
| ----------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| `perPlayer` | per-player zone                                   | owner's zone instance                                               |
| `perPlayer` | zone attached to a per-player board, or its space | owner's board instance                                              |
| `perPlayer` | space on a per-player board                       | owner's board instance                                              |
| `perPlayer` | shared zone, shared board, detached               | allowed; owner still set                                            |
| `shared`    | any per-player target                             | validation error: "place it during reducer setup" (today's message) |

### One per-player identity

Add `shared/domain/instance-ids.ts`, the only place that builds or parses
per-player instance strings:

```ts
export const instanceId = {
  of: <Base extends string>(base: Base, playerId: PlayerId) =>
    `${base}:${playerId}` as const,
  parse: (id: string): { base: string; playerId: PlayerId | null } => {
    const at = id.lastIndexOf(":");
    return at < 0
      ? { base: id, playerId: null }
      : { base: id.slice(0, at), playerId: id.slice(at + 1) as PlayerId };
  },
};
```

Board target values stop carrying a base board plus player:

| Old                                                                             | New                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `valueKind: "player-board-space"`, value `{ boardId: base, playerId, spaceId }` | `valueKind: "board-space"`, value `{ boardId: RuntimeBoardId, spaceId }` |
| `valueKind: "board-id"`, value `spaceId` (board fixed by the domain)            | unchanged                                                                |

`BoardTargets.matchesTarget` compares `target.value.boardId === boardId`
directly. Delete `PlayerBoardSpaceTarget`, `PlayerBoardSpaceTargetSchema`,
`isPlayerBoardSpaceTarget` and `samePlayerBoardSpaceTarget`; replace with a
`BoardSpaceTarget` pair and one equality helper.

## Delete

- `BuildTuple`, `EnumerateInternal`, `AddOne`, `OneTo` and the authoring
  `PlayerId` in `authoring.ts`; `TypedSeedLocationSpec` owner typing.
- `ownerId` and `visibleTo` in manifest specs and their validation.
- `PlayerBoardSpaceTarget` and the `player-board-space` value kind across the
  SDK, wire schemas, headless board feature and registry.
- The Hex example's `PLAYER_NUMBERS`, `ownerId()` helper and detached scan.

## Tests and proofs

- A 3-player session creates 30 trails and 12 camps with correct owners and
  zone instances; a 4-player session of the same manifest creates 40 and 16.
- Home resolution table above, one test per row.
- Type proofs: per-player piece IDs accept `trail-3:${string}` and reject
  `trail-11:player-1` and `trial-3:player-1`; manifests with `ownerId` or
  `visibleTo` fail to compile.
- Board targets: a per-player board space target round-trips through the wire
  schema and `BoardTargets` matches it without string rebuilding.
- Hex scenarios pass unchanged; `player-board-targets.test.ts` moves to the new
  value kind.

## Verify

```sh
pnpm check
pnpm reference
pnpm ui test
```

## Done when

- No manifest or example names a player.
- Per-player instance strings are built and parsed only in `instance-ids.ts`.

This layer completes the scope that can ship without dynamic boards. If boards
are deferred, publish an alpha here (see the [README](README.md#publication)).
