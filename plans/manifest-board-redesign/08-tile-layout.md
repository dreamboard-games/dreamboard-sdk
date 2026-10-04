# 08 — Tile layouts and board rendering

This is execution PR 10. Render projected seat topology only, including deliberately public concealed footprints; never read authoritative catalog/placements in client layout.

See [private tiles and authority](private-tiles.md).

Branch: `sdk/tile-layout` (on `sdk/place-tiles`). Size: M.
Read first: [headless board feature](../../packages/sdk/src/headless/features/board.ts),
[board-targets.tsx](../../registry/items/board-targets.tsx),
[hex-grid.tsx](../../registry/items/hex-grid.tsx), [ui/boards.md](../../docs/guides/ui/boards.md).
Follow the Tailwind and shadcn registry conventions from #80–#81.

## Goal

UIs can draw tiles, not just spaces: each tile's outline, centre and rotation
come from the layout, so multi-hex tiles, gaps between tiles and rotated tile
art render correctly. Remove the second, disconnected hex renderer.

## Current state

- Layouts expose spaces, edges and vertices only; nothing groups spaces into
  tiles.
- The registry ships two hex renderers: `BoardTargets`, bound to real
  geometry, and `HexGrid` ([hex-grid.tsx:16](../../registry/items/hex-grid.tsx#L16)),
  which takes hand-written polygon point strings and is used only by a story
  ([components.stories.tsx](../../registry/stories/components.stories.tsx)).
- `BoardTargets` computes each selectable target's nearest neighbour on every
  render ([board-targets.tsx:118](../../registry/items/board-targets.tsx#L118)),
  which is quadratic in the number of targets.

## Design

### Layout tiles

```ts
export interface BoardLayoutTile<G> {
  readonly id: TileIdOf<G>;
  readonly spaceIds: readonly SpaceIdOf<G>[];
  /** Outer boundary of the tile's cells, in layout coordinates. */
  readonly outline: readonly Point[];
  /** Centroid of the tile's cell centres. */
  readonly center: Point;
  /** Rotation to apply to tile art: placement rotation × 60° (hex) or × 90° (square). */
  readonly rotationDegrees: number;
  /** Centre of the tile's local origin cell; rotate art around this point. */
  readonly anchor: Point;
}

layout.getTiles(): readonly BoardLayoutTile<G>[];
```

Outline algorithm (no new dependency; honeycomb cannot merge polygons):

1. Boundary edges are the tile's cell edges whose other side is not a cell of
   the same tile (absent, or another tile).
2. Each boundary vertex has exactly two boundary edges; walk them into one
   closed loop using the vertex positions from layer 02.
3. Validate at table creation that each tile's cells are edge-connected with no
   holes, so the boundary is always a single loop.

Compute tiles inside the memoized geometric layout (layer 02), not per render.

### `BoardTargets`

```tsx
<BoardTargets
  boardId="map"
  renderTile={(tile) => (
    <g
      transform={`rotate(${tile.rotationDegrees} ${tile.anchor.x} ${tile.anchor.y})`}
    >
      <image href={tileArt[tile.id]} /* positioned around tile.anchor */ />
    </g>
  )}
  tileProps={(tile) => ({ className: "fill-none stroke-2 stroke-foreground" })}
/>
```

- `renderTile` and `tileProps` render beneath spaces. With neither provided,
  output is unchanged from today, so single-cell boards need no edits.
- Compute the edge/vertex hit size once per layout and selectable set instead
  of per target per render.

## Delete

- `registry/items/hex-grid.tsx`, its `registry.json` entry,
  [docs/registry/hex-grid.md](../../docs/registry/hex-grid.md), its entry in
  [docs/registry/index.md](../../docs/registry/index.md), the registry README
  mention, and the `HexBoard` story in `components.stories.tsx`.

## Add

- `registry/stories/tri-hex-game.ts`: the layer 07 rulebook board as a story
  game, with a `BoardTargets` story that uses `renderTile` for outlines and
  per-cell terrain fills.

## Tests and proofs

- Unit: outlines for a single hex (6 points), a three-hex triangle in every
  rotation (12 points), and a two-hex bar; outline points coincide with
  honeycomb corners.
- Browser (story test): the tri-hex board renders 13 tile outlines and 37
  spaces; clicking a cell selects that space; the tile art `transform` matches
  `rotationDegrees`; Axe passes; desktop and touch widths.
- Both reference-game browser suites pass unchanged.

## Verify

```sh
pnpm check
pnpm ui test
```

## Done when

- One hex renderer remains, bound to real geometry.
- Multi-hex tiles render as tiles, with correct rotation.

After this layer, publish the SDK alpha (see the [README](README.md#publication)).
