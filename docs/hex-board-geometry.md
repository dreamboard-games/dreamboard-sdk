# Hex board geometry

Hex manifests use JSON shapes and `honeycomb-grid` 4.1.5 for coordinates,
traversal, corners, distance, and hit testing. Hex templates and hand-built
cube-coordinate IDs are removed. Square and generic templates remain supported.

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
const board = createTableQueries(contract.createInitialTable()).board("island");
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

`spaceEdges(space)` and `spaceVertices(space)` follow honeycomb's clockwise corner
order. `edgeAt(space, side)` and `vertexAt(space, corner)` address a boundary
location using indices 0 through 5. Side N connects corner N to corner (N+1)%6.
Pointy corner 0 is upper-right; flat corner 0 is upper-right. Shared elements have
one ID regardless of which incident space is queried. Authored metadata can use
`ref: { spaces: [a, b] }` / `ref: { spaces: [a, b, c] }`, or boundary refs
`{ space, side }` / `{ space, corner }`.

`neighbors`, `distance`, `ring`, and `line` use geometry. Distance ignores holes;
ring and line return only present cells. `spacesAt(vertex)`, `spacesAlong(edge)`,
`edgesOf(vertex)`, and `verticesOf(edge)` return exact incidence,
including boundary cells and holes.

`getLayout({ hexSize, origin? })` returns a viewBox object, space centers and corners,
edge endpoint lines, vertex centers, and `pointToSpace({ x, y })`. Points use
layout coordinates before any SVG/DOM transform. Hit testing outside the board
or inside an excluded cell returns `undefined`. These values contain no React or
interaction eligibility; renderers compose their own visuals and target props.
