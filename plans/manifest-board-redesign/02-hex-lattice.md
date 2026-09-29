# 02 — Hex lattice identities and geometry performance

Branch: `sdk/hex-lattice` (on `sdk/field-schemas`). Size: M.
Read first: [hex-board.ts](../../packages/sdk/src/shared/hex-board.ts),
[board-queries.ts](../../packages/sdk/src/reducer/table/board-queries.ts),
[headless board feature](../../packages/sdk/src/headless/features/board.ts),
[hex-board-geometry.md](../../docs/hex-board-geometry.md).

## Goal

- Name hex edges and vertices by grid coordinates so IDs never depend on which
  neighbours exist. This is the prerequisite for placements that change
  ([layers 06–07](06-tile-catalog.md)).
- Number sides by axial direction, the same for pointy and flat boards.
- Build geometry once and look things up directly. Fix the three caches that
  never hit.
- Make `distance` mean the same thing on every layout.

## Current state

- Edges and corners are found by rounding honeycomb pixel corners
  ([hex-board.ts:44](../../packages/sdk/src/shared/hex-board.ts#L44)) and named
  after the spaces that share them
  ([hex-board.ts:168](../../packages/sdk/src/shared/hex-board.ts#L168),
  [177](../../packages/sdk/src/shared/hex-board.ts#L177)).
- Side numbers follow honeycomb's corner order: side 0 faces `1,0` on pointy
  boards and `1,-1` on flat boards (verified).
- Every vertex scans every edge ([hex-board.ts:194](../../packages/sdk/src/shared/hex-board.ts#L194));
  `neighbors`, `spacesAt`, `incidentEdges` and friends use linear scans.
- Caches that miss: `geometryOf` keys on the board object
  ([board-queries.ts:32](../../packages/sdk/src/reducer/table/board-queries.ts#L32)),
  which `clone.ts` `structuredClone`s every transaction
  ([clone.ts:16](../../packages/sdk/src/reducer/table/clone.ts#L16)); the
  headless feature keys on the frame's board object
  ([board.ts:138](../../packages/sdk/src/headless/features/board.ts#L138)), which
  frame materialization recreates every frame
  ([projection.ts:28](../../packages/sdk/src/shared/protocol/projection.ts#L28));
  `BoardTargets` calls `getLayout` on every render
  ([board-targets.tsx:112](../../registry/items/board-targets.tsx#L112)).

Measured at the baseline on Node 24:

| Hexes | Edges | Vertices | Build geometry | Neighbours of every hex |
| ----- | ----- | -------- | -------------- | ----------------------- |
| 37    | 132   | 96       | 1.8 ms         | 0.1 ms                  |
| 127   | 420   | 294      | 4.0 ms         | 0.7 ms                  |
| 331   | 1056  | 726      | 21.8 ms        | 3.0 ms                  |
| 721   | 2256  | 1536     | 83.8 ms        | 16.5 ms                 |

## Design

### Coordinates and identities

The code below was run over a 7×7 grid: every edge gets one key from both
adjacent hexes, every vertex one key from all three, each hex has six distinct
edge and vertex keys, and `rotate` maps `DIR[k]` to `DIR[k + 1]`.

```ts
type Axial = { q: number; r: number };

// Neighbour directions, ordered so one 60° rotation maps DIR[k] to DIR[k + 1].
// This matches today's pointy side order exactly.
const DIR: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];
const add = (a: Axial, b: Axial): Axial => ({ q: a.q + b.q, r: a.r + b.r });
const same = (a: Axial, b: Axial) => a.q === b.q && a.r === b.r;

// Side k faces DIR[k]. Each hex owns sides 0–2; sides 3–5 belong to the neighbour.
export function edgeKey(hex: Axial, side: number): string {
  return side < 3
    ? `${hex.q},${hex.r}:e${side}`
    : edgeKey(add(hex, DIR[side]), side - 3);
}

// Corner k lies between DIR[k] and DIR[k + 1]. Its three hexes form one of two
// triangle shapes; the key names the triangle by its base hex and shape.
const TRIANGLES = [
  [DIR[0], DIR[1]],
  [DIR[1], DIR[2]],
] as const;
export function vertexKey(hex: Axial, corner: number): string {
  const hexes = [hex, add(hex, DIR[corner]), add(hex, DIR[(corner + 1) % 6])];
  for (const base of hexes)
    for (const [shape, offsets] of TRIANGLES.entries())
      if (offsets.every((o) => hexes.some((h) => same(h, add(base, o)))))
        return `${base.q},${base.r}:v${shape}`;
  throw new Error("unreachable");
}

export function rotate(p: Axial, steps: number): Axial {
  let out = p;
  for (let i = 0; i < ((steps % 6) + 6) % 6; i++)
    out = { q: -out.r, r: out.q + out.r };
  return out;
}
```

Runtime IDs keep today's prefix and brand: `` `${boardId}:edge:${edgeKey}` ``
and `` `${boardId}:vertex:${vertexKey}` ``, typed as `HexEdgeId<BoardId>` and
`HexVertexId<BoardId>` in
[board-identities.ts](../../packages/sdk/src/shared/domain/board-identities.ts).
IDs stay opaque; obtain them through queries.

Worked example: `edgeKey({q:0,r:0}, 0)` and `edgeKey({q:1,r:0}, 3)` are both
`0,0:e0`; `vertexKey({q:0,r:0}, 0)` and `vertexKey({q:1,r:0}, 2)` are both
`0,0:v0`. Adding or removing the hex at `1,0` changes neither.

The element set is every edge and vertex incident to at least one present
space, including board boundaries, as today.

### Pixels

Honeycomb remains the pixel authority:

- Hex centres and polygons: `new Grid(hexClass(orientation, hexSize), spaces)`
  and `hex.corners`.
- A vertex position is the centroid of its three hex centres (true for regular
  grids); compute absent neighbours' centres from a honeycomb `Hex` built at
  that coordinate. This removes the pixel-rounding identity trick.
- Edge `k` of hex `h` runs from vertex `(h, k − 1)` to vertex `(h, k)`.
- `pointToSpace` stays `grid.pointToHex(point, { allowOutside: false })`.
- Use axial `DIR` offsets for neighbours, not honeycomb's `neighborOf`: its
  compass directions depend on orientation, and on pointy boards
  `neighborOf(N)` silently returns the north-east neighbour.

### Topology object

Rename `createHexBoardGeometry` to `createHexTopology` and build indexes once:

```ts
export function createHexTopology<
  const BoardId extends string,
  SpaceId extends string,
>(board: {
  id: BoardId;
  orientation: "pointy" | "flat";
  spaces: readonly { id: SpaceId; q: number; r: number }[];
}) {
  const byCoordinate = new Map(board.spaces.map((s) => [`${s.q},${s.r}`, s]));
  const byId = new Map(board.spaces.map((s) => [s.id, s]));
  const edges = new Map<HexEdgeId<BoardId>, HexTopologyEdge<BoardId>>();
  const vertices = new Map<HexVertexId<BoardId>, HexTopologyVertex<BoardId>>();
  // One pass over spaces × 6 sides/corners fills edges, vertices and incidence.
  return {
    neighbors: (id: SpaceId) =>
      DIR.flatMap(
        (d) => byCoordinate.get(key(add(requireSpace(id), d)))?.id ?? [],
      ),
    edgesOf,
    verticesOf,
    edgeAt,
    vertexAt,
    edge,
    vertex,
    spacesAt,
    spacesAlong,
    incidentEdges,
    incidentVertices, // Map lookups
    gridDistance,
    ring,
    line, // honeycomb
    layout, // memoized per hexSize and origin
  };
}
```

Keep the existing query names on `q.board(id)`.

### Distance

- `distance(a, b)`: fewest steps through present, adjacent spaces, on every
  layout (breadth-first search, as square and generic boards do today).
  `Infinity` when unreachable.
- `gridDistance(a, b)`: hex only, honeycomb's straight-line distance ignoring
  holes (today's hex `distance`).

### Caching

1. **Reducer.** Boards are never mutated (there is no board mutation API), so
   `cloneRuntimeTable` shares `table.boards` by reference instead of cloning.
   `geometryOf`'s `WeakMap` then hits across transactions. Add a test that two
   successive transactions return the same topology object.
2. **Client.** Frame materialization legitimately creates new objects, so the
   headless feature caches by content: a per-board single entry keyed by
   `orientation` plus the sorted `id@q,r` list, with the `WeakMap` on the board
   object as the fast path.
3. **Layouts.** The topology memoizes the geometric layout per
   `hexSize|origin.x,origin.y`. The headless `getLayout` recomputes only target
   decoration (eligibility, selection), which changes per frame. `BoardTargets`
   needs no `useMemo`.

## Migrate

- Authored boundary refs `{ space, side }` / `{ space, corner }` on **flat**
  boards shift by one index. No reference game uses flat boards; state this in
  [hex-board-geometry.md](../../docs/hex-board-geometry.md) and replace its
  "Side N connects corner N…" paragraph with the axial definition.
- Any test fixture or snapshot containing old edge/vertex ID strings.
- Scenarios obtain IDs through queries; confirm none hard-code them.

## Delete

- `pointKey`, the owner-based ID construction and the O(V·E) incidence pass in
  `hex-board.ts`.
- Hex `distance` semantics (renamed `gridDistance`).
- Board cloning in `clone.ts`.

## Tests and proofs

- Property tests over several radii and both orientations: shared elements
  have one ID from every incident space; each hex has six distinct edge and
  vertex IDs; adding or removing a neighbour never changes an existing ID;
  `rotate` maps `DIR[k]` to `DIR[k + 1]`.
- Pixel tests: computed vertex positions coincide (within 1e-9 × hexSize) with
  honeycomb corners for both orientations; edge endpoints match polygon sides.
- Pointy side numbering is unchanged from the baseline (regression test).
- `distance` returns path length around a hole; `gridDistance` ignores it.
- Cache tests: reducer topology object is reused across transactions; headless
  topology is reused across frames with equal content.
- Record the benchmark table above for the new implementation in the PR
  description. Target: build under 5 ms at 331 hexes.

## Verify

```sh
pnpm check
pnpm reference hex-network-trading
pnpm ui test
```

## Done when

- No hex ID depends on neighbour presence or pixel rounding.
- Topology is built once per board content in both reducer and client.
- Both reference games and the browser suites pass unchanged.
