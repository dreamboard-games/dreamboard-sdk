# 07 — Placing tiles at runtime

Branch: `sdk/place-tiles` (on `sdk/tile-catalog`). Size: M.
Read first: [06 — tile catalog](06-tile-catalog.md),
[transaction.ts](../../packages/sdk/src/reducer/transaction.ts),
[rng.ts](../../packages/sdk/src/reducer/rng.ts).

## Goal

Reducers can build and change boards: place, move and remove tiles, add and
remove relations, and make seeded random choices for setup. Multi-hex tiles
and rotation work end to end, proven by a real rulebook layout.

## Design

### Transactions

```ts
/** Place a tile, or move it if already placed. */
tx.placeTile({ boardId, tileId, at: { q, r, rotation } }); // square: { col, row, rotation }
tx.removeTile({ boardId, tileId });

tx.addRelation({ boardId, relation: { id, typeId, fromSpaceId, toSpaceId, directed?, fields? } });
tx.removeRelation({ boardId, relationId });
```

Rules, each with a specific error message:

- The tile exists in the board's catalog; the board is hex or square.
- `rotation` is an integer in `0–5` (hex) or `0–3` (square).
- No placed cell overlaps another tile's cell. Name both tiles in the error.
- Moving a tile carries components on its spaces with it (their location is a
  space ID, which moves with the tile). Removing a tile is rejected while any
  component is on one of its spaces.
- Moving or removing a tile is rejected while any component is on an edge or
  vertex the tile touches; the reducer moves those first. Edge and vertex IDs
  are world coordinates, so they cannot follow the tile.
- Relations: both spaces are placed (hex, square) or exist (generic); `id` is
  unique on the board and required so relations can be removed; `fields` are
  validated with the board's `relationFieldsSchema` and defaults applied.

Placements are copy-on-write: a transaction that places a tile replaces
`boards[id].placements` with a new object; untouched boards keep their
objects, so layer 02 caches keep hitting.

### Seeded randomness

Reducers can shuffle zones (`tx.shuffle`) and roll dice (`tx.roll`), but have no
general seeded choice, which random board setup needs. Expose the existing
engine RNG ([rng.ts](../../packages/sdk/src/reducer/rng.ts); `TransactionRandom`
in transaction.ts):

```ts
tx.random.int(maxExclusive: number): number;
tx.random.pick<T>(values: readonly T[]): T;
tx.random.shuffle<T>(values: readonly T[]): T[];
```

They advance the same serialized `(seed, cursor)` state as `roll` and
`shuffle`, so replays and restores stay deterministic. They emit no events.

### Multi-hex tiles and rotation

Rotating a multi-hex tile by `rotation` steps maps each local cell `c` to
`add(rotate(c, rotation), at)` and each local side or corner `k` to
`(k + rotation) % 6` (layer 02 functions). A three-hex triangle flips between
▽ and △ every 60°, so only three of the six rotations fit a given slot.

## Proof: the rulebook three-hex-tile board

A board of 37 hexes (radius 3): twelve three-hex tiles placed randomly and
rotated, around a fixed centre hex. Slot coordinates were read from the
rulebook image (pointy orientation) and verified by script: the slots plus the
centre cover the board exactly once, and every slot accepts exactly its three
matching rotations.

```ts
// Manifest
tiles: {
  centre: { typeId: "base", at: { q: 0, r: 0 } },
  "tri-01": {
    cells: {
      "tri-01-a": { at: { q: 0, r: 0 }, typeId: "forest" },
      "tri-01-b": { at: { q: 1, r: 0 }, typeId: "hills" },
      "tri-01-c": { at: { q: 0, r: 1 }, typeId: "lake" },
    },
  },
  // ...tri-02 to tri-12, each a ▽ triangle in its own frame
},
```

```ts
// Setup
const DIR = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
] as const;
const add = (a: Axial, b: Axial) => ({ q: a.q + b.q, r: a.r + b.r });

// ▽ slots have two hexes on top; △ slots have one. Coordinates are each slot's base hex.
const DOWN = [{ q: 1, r: -3 }, { q: -1, r: -1 }, { q: 1, r: -1 }, { q: -3, r: 1 }, { q: -1, r: 1 }, { q: 1, r: 1 }];
const UP = [{ q: 0, r: -3 }, { q: 3, r: -3 }, { q: -2, r: -1 }, { q: 3, r: -1 }, { q: -2, r: 2 }, { q: 0, r: 2 }];

// Each slot's cells, in the order the tile's anchor cell (a) visits them as it turns.
const SLOTS = [
  ...DOWN.map((b) => ({ turn: 0, cells: [b, add(b, DIR[0]), add(b, DIR[1])] })),
  ...UP.map((b) => ({ turn: 1, cells: [b, add(b, DIR[1]), add(b, DIR[2])] })),
];

reduce({ tx }) {
  const order = tx.random.shuffle(TRI_TILE_IDS);
  SLOTS.forEach((slot, i) => {
    const k = tx.random.int(3); // one of the three orientations that fit
    tx.placeTile({
      boardId: "map",
      tileId: order[i],
      at: { ...slot.cells[k], rotation: slot.turn + 2 * k },
    });
  });
}
```

With `rotation = turn + 2k`, the tile's cell `a` lands on `slot.cells[k]`.

Add this as an SDK test fixture (not a reference game): place all twelve tiles
for several seeds and assert 37 distinct placed spaces, a radius-3 hexagon, no
overlap, and that each tile's three cells stay mutually adjacent.

## Tests and proofs

- Each rule above has a rejection test with its message.
- Moving a tile carries components on its spaces; components on its edges and
  vertices block the move.
- `tx.random` is deterministic for a seed, advances the shared cursor, and
  interleaves correctly with `roll` and `shuffle` across restore.
- A placement in one transaction is visible to queries in the same transaction
  and in the next frame's derived topology.
- Type proofs: `tileId` accepts catalog IDs only; `at` requires `q/r` on hex
  boards and `col/row` on square boards.

## Verify

```sh
pnpm check
pnpm reference
```

## Done when

- A board can be assembled entirely by the reducer from its catalog.
- The rulebook fixture passes for many seeds.
- Docs: [manifest-and-boards.md](../../docs/guides/reducer/manifest-and-boards.md)
  gains "Building boards during setup".
