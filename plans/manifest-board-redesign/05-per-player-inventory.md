# 05 — Per-player inventory and one per-player identity

This is execution PR 4, after canonical zone locations and before attached zones.
The codec identifies replication origins; session admission checks live membership.

See [private tiles and authority](private-tiles.md).

Branch: `codex/per-player-inventory` (on `codex/zone-locations`). Size: M.
Read first: [pieces.ts](../../examples/reference-games/hex-network-trading/manifest/pieces.ts),
[board-target.ts](../../packages/sdk/src/shared/board-target.ts),
[boardTarget.ts](../../packages/sdk/src/reducer/inputs/boardTarget.ts).

## Goal

- Piece seeds, die seeds and cards accept `scope: "perPlayer"`: one set per
  seated player, created from the real roster.
- Replication initializes ownership. Ownership may subsequently change without
  changing identity. Manifests never name players.
- Per-player boards, cards, pieces and dice use one runtime identity codec.
  Shared identities remain authored literal IDs. Zones retain native zone IDs
  and an explicit table or player host; they are not encoded inventory.

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
- Per-player boards currently duplicate identity between delimiter-joined runtime
  IDs and `PlayerBoardSpaceTarget { boardId: base, playerId, spaceId }` inputs.
  The compiler accepts string-template syntax and `BoardTargets` rebuilds IDs
  manually. This layer replaces both paths with the canonical runtime board ID.

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

- Shared components and boards keep their authored IDs unchanged.
- Generated per-player IDs begin with reserved `@db/`, followed by the canonical
  JSON tuple `[family, expandedBaseId, replicationOriginSeat]`. For example,
  `@db/["piece","trail-3","player-1"]`. Families are `board`, `card`, `piece`
  and `die`; tile instances join the same owner when introduced in their layer.
- The base is already expanded by the existing seed count rules. Do not encode
  a second ordinal, type or set identity. Card, piece and die bases remain
  globally unique because `componentLocations` has one component namespace.
- Manifest identity admission rejects authored IDs beginning with `@db/`,
  including expanded bases. This reserves generated identities without
  restricting separators or Unicode in ordinary IDs or roster seat values.
- The encoder validates nonempty base and seat strings and uses JSON escaping.
  The decoder validates the exact tuple shape and family, then requires exact
  equality with its canonical re-encoding. Alternate whitespace, escaping,
  extra tuple elements and unknown tags are rejected.
- `PerPlayerInstanceId<Family, ExpandedBaseId>` preserves exact family and base
  inference. ID schemas validate the codec and declared base; string templates
  and delimiter parsing cannot provide this witness.
- Successful decoding proves syntax only. A canonical forged ID or a seat not
  in the current roster is still rejected by session/table membership checks.
  Authored static reference validation and live roster validation remain separate
  stages; `maxPlayers` does not define a roster.
- `ownerId` initially equals the replication-origin seat for per-player
  components and is `null` for shared components. Reducers may reassign ownership
  independently. Decoding an ID must never be used to infer the current owner.

### Home resolution

| Seed scope  | Home target                                       | Result                                                              |
| ----------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| `perPlayer` | per-player zone                                   | replication-origin seat's zone host                                 |
| `perPlayer` | zone attached to a per-player board, or its space | replication-origin seat's board instance                            |
| `perPlayer` | space on a per-player board                       | replication-origin seat's board instance                            |
| `perPlayer` | shared zone, shared board, detached               | allowed; owner still set                                            |
| `shared`    | any per-player target                             | validation error: "place it during reducer setup" (today's message) |

### One per-player identity

Use `shared/domain/per-player-instance.ts` as the single encoder/decoder owner
for per-player board IDs, `BoardCard` expansion and piece/die seed expansion.
The shared owner accepts plain seat strings and does not import reducer `PlayerId`.
Reducer callers supply validated roster seats.

```ts
const pieceId = perPlayerInstanceId("piece", "trail-3", playerId);
const boardId = perPlayerInstanceId("board", "frontier", playerId);
// Decoder returns family, expanded base and replication-origin seat, or null.
const instance = parsePerPlayerInstanceId(pieceId);
// A decoded instance still requires membership in the active table.
```

Zones use `zoneId` plus explicit `hostId` in queries, mutations and locations.
A per-player zone's host is the actual roster seat; no generated zone-instance
ID is created. Replication home resolution supplies that seat explicitly.

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
- Codec proofs cover separators, quotes, slashes, Unicode, arbitrary roster IDs,
  empty values, malformed/noncanonical strings and canonical forged strings.
  Canonical syntax alone never grants roster or component membership.
- Type proofs preserve exact family and expanded base, reject a wrong family,
  undeclared seed or out-of-range expanded ordinal, and keep shared literal IDs
  exact. Manifests with `ownerId` or `visibleTo` fail to compile.
- Manifest admission rejects reserved authored prefixes. Session admission
  rejects unknown seats and absent generated IDs, including valid codec strings.
- Reassigning ownership preserves the instance ID and replication origin.
  Per-player zones continue to require explicit valid hosts without encoded IDs.
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
- Per-player instance strings are built and parsed only in
  `shared/domain/per-player-instance.ts`; no delimiter-based reconstruction remains.
- Shared IDs stay literal, zone hosts stay explicit, and ownership is independent
  of replication-origin identity.

This layer remains an internal stack step. Publish one complete SDK candidate
after all execution layers, as specified in the [README](README.md#publication).
