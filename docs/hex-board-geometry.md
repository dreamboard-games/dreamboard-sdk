# Hex board geometry

Hex boards derive geometry from tile instances whose canonical location is
`OnBoard`. Immutable tile definitions describe local cells and annotations;
board definitions describe layout and orientation. Generic boards retain static
spaces. Runtime boards store only their definition base ID and explicit relations.

```ts
import {
  compileManifest,
  createTableQueries,
  tileSpaceId,
} from "@dreamboard-games/sdk/reducer";

const contract = compileManifest({
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  boards: [
    {
      id: "island",
      name: "Island",
      layout: "hex",
      scope: "shared",
      orientation: "pointy",
    },
  ],
  tileTypes: [
    {
      id: "district",
      name: "District",
      layout: "hex",
      cells: [
        { id: "capital", at: { q: 0, r: 0 } },
        { id: "forest", at: { q: 1, r: 0 } },
      ],
    },
  ],
  tileSeeds: [
    {
      id: "district",
      typeId: "district",
      home: {
        type: "board",
        boardId: "island",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
  ],
} as const);
const table = contract.createInitialTable({ playerIds: ["player-1"] });
const board = createTableQueries(table, contract).board("island");
const capital = tileSpaceId("district", "capital");
const neighbors = board.neighbors(capital);
const edge = board.edge(capital, neighbors[0]!);
const layout = board.getLayout({ hexSize: 40 });
```

For regular fixed boards, `hexagon`, `spiral`, `ring`, `rectangle`, and
`fromCoordinates` return ordinary `tileTypes` and `tileSeeds` collections to
spread into a manifest. Pass `boardId`, `tileTypeId`, and `tileId` explicitly.
For example, `hexagon({ boardId: "island", tileTypeId: "terrain", tileId:
"island-terrain", radius: 2 })` creates one multi-cell tile placed at the origin.
These helpers do not introduce a separate runtime board model.

Cell identity combines the tile instance and its local cell ID. It is independent
of placement, so relocation preserves cell and attached-zone identity. Tile
queries address the complete game inventory; board queries include only current
placements on that exact board. Obtain world edge and vertex IDs from queries.
They combine the runtime board instance and lattice coordinates, so per-player
boards never share world-element identities.

Hex rotation follows axial direction order: `(1,0)`, `(0,1)`, `(-1,1)`,
`(-1,0)`, `(0,-1)`, `(1,-1)`. Rotation 1 maps `(q,r)` to `(-r,q+r)`;
translation follows rotation. Rotations must be integers from 0 through 5.
Overlapping cells are rejected, including overlaps within one tile definition.

`spaceEdges(space)` and `spaceVertices(space)` use that same direction order for
both orientations. Side N faces direction N; corner N lies between directions N
and (N+1)%6. Side N connects corners (N+5)%6 and N. Tile annotations identify a
local `cellId` and `side` or `corner`; rotation transforms their world address.
Adjacent cells share one world element. Conflicting fields, types or labels on
that element are rejected rather than resolved by declaration order.

`neighbors`, `ring`, and `line` use geometry. Ring and line ignore holes and
return only present cells. `spacesAt(vertex)`, `spacesAlong(edge)`,
`edgesOf(vertex)`, and `verticesOf(edge)` return exact incidence, including
boundary cells and holes. Explicit session relations remain distinct from this
adjacency and must refer to current spaces.

`getLayout({ hexSize, origin? })` returns a viewBox object, space centers and
corners, edge endpoint lines, vertex centers, and `pointToSpace({ x, y })`.
Points use layout coordinates before any SVG/DOM transform. Hit testing outside
the board or inside a hole returns `undefined`. These values contain no React
or interaction eligibility; renderers compose visuals and target props.

Hex `distance(a, b)` returns the shortest route through present adjacent spaces,
or `Infinity` when disconnected. `gridDistance(a, b)` measures the axial lattice
ignoring missing cells. Adding or removing neighbours does not rename existing
world edges or vertices.

The shared topology derivation serves reducer queries and seat projection.
Clients consume only the projected topology. Checkpoints do not store spaces,
edges, vertices or a second placement map. Cached topology must reflect current
placements and relations, including after clone and restore.

Axial coordinates must be safe integers within
`±Math.floor(Number.MAX_SAFE_INTEGER / 4)`. Rotated and translated coordinates
must also satisfy this bound. It keeps neighbour offsets, cube-coordinate sums
and pairwise differences exact; unsupported extremes reject before topology is
constructed.
