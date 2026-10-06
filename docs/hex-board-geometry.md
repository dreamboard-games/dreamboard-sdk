# Hex board geometry

Hex manifests use JSON shapes and `honeycomb-grid` 4.1.5 for coordinates,
traversal, corners, distance, and hit testing. Hex templates and hand-built
cube-coordinate IDs are removed. Square and generic boards also use inline manifest data; all template merging is removed.

```ts
import {
  hexagon,
  compileManifest,
  createTableQueries,
} from "@dreamboard-games/sdk/reducer";

const contract = compileManifest({
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  zones: [],
  boards: [
    {
      id: "island",
      name: "Island",
      layout: "hex",
      scope: "shared",
      orientation: "pointy",
      shape: hexagon({ radius: 2 }),
      exclude: [{ q: 2, r: 0 }],
      spaces: { "0,0": { id: "capital", typeId: "city" } },
    },
  ],
} as const);
const table = contract.createInitialTable({ playerIds: [] });
const board = createTableQueries(table, contract).board("island");
const neighbors = board.neighbors("capital");
const edge = board.edge("capital", neighbors[0]!);
const layout = board.getLayout({ hexSize: 40 });
```

Shapes are `hexagon({ radius, center? })`, `spiral({ radius, center? })`,
`ring({ radius, center? })`, `rectangle({ width, height, start? })`, and
`fromCoordinates([{ q, r }, ...])`. Hexagon and spiral cover the center through
the outer ring. Orientation is `pointy` or `flat`. Rectangles use the library's
offset rectangle traversal. Overrides apply after exclusions; an override outside
the resulting shape is an error. Default space IDs are axial `q,r` strings.

Explicit coordinate lists retain exact space-ID types, including overrides.
Dynamic shapes retain named override literals plus the axial string format;
the compiler does not enumerate their coordinates in TypeScript. All geometry
queries validate actual space membership. Edge and vertex IDs are branded by
board identity; obtain them through queries instead of constructing strings.
Per-player instances reuse their base board's topology identities.

`spaceEdges(space)` and `spaceVertices(space)` use axial direction order on both
orientations: `(1,0)`, `(0,1)`, `(-1,1)`, `(-1,0)`, `(0,-1)`, `(1,-1)`.
Side N faces direction N; corner N lies between directions N and (N+1)%6.
Side N connects corners (N+5)%6 and N. Relative to the former honeycomb order,
pointy corner indices move back one; flat corner indices move back two and flat
side indices move forward one.
Shared elements have one ID regardless of which incident space is queried. Authored metadata can use
`ref: { spaces: [a, b] }` / `ref: { spaces: [a, b, c] }`, or boundary refs
`{ space, side }` / `{ space, corner }`.

`neighbors`, `ring`, and `line` use geometry. Ring and line ignore holes;
ring and line return only present cells. `spacesAt(vertex)`, `spacesAlong(edge)`,
`edgesOf(vertex)`, and `verticesOf(edge)` return exact incidence,
including boundary cells and holes.

`getLayout({ hexSize, origin? })` returns a viewBox object, space centers and corners,
edge endpoint lines, vertex centers, and `pointToSpace({ x, y })`. Points use
layout coordinates before any SVG/DOM transform. Hit testing outside the board
or inside an excluded cell returns `undefined`. These values contain no React or
interaction eligibility; renderers compose their own visuals and target props.

Hex `distance(a, b)` returns the shortest route through present adjacent spaces,
or `Infinity` when disconnected. `gridDistance(a, b)` measures the axial lattice
ignoring missing cells. Edges and vertices use board-prefixed lattice coordinate
identities, so adding or removing neighbours does not rename existing elements.

Topology caching stores geometry only and compares current board coordinates on
each lookup. Component state, authored metadata and interaction decoration remain
owned by the current frame or table. Layout caching retains only the latest size
and origin; board mutation therefore cannot reuse stale geometry.

Axial coordinates must be safe integers within
`±Math.floor(Number.MAX_SAFE_INTEGER / 4)`. This conservative bound keeps
neighbour offsets, cube-coordinate sums and pairwise differences exact;
unsupported extreme coordinates are rejected before building topology.
