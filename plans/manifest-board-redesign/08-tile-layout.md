# 08 — Tile layouts and board rendering

This is execution PR 10. Render projected seat topology only, including deliberately public concealed footprints; never read authoritative catalog/placements in client layout.

See [private tiles and authority](private-tiles.md).

Branch: `codex/tile-layout` (on `codex/tile-placement`). Size: M.
Read first: [headless board feature](../../packages/sdk/src/headless/features/board.ts),
[board-targets.tsx](../../registry/items/board-targets.tsx),
[ui/boards.md](../../docs/guides/ui/boards.md).
Follow the Tailwind and shadcn registry conventions from #80–#81.

## Goal

UIs can draw tiles, not just spaces: each tile's outline, centre and rotation
come from the layout, so multi-hex tiles, gaps between tiles and rotated tile
art render correctly. Remove the second, disconnected hex renderer.

## Current state

- Layouts expose spaces, edges and vertices only; nothing groups spaces into
  tiles.
- The registry ships two hex renderers: `BoardTargets`, bound to real
  geometry, and `HexGrid` (the former `registry/items/hex-grid.tsx`),
  which takes hand-written polygon point strings and is used only by a story
  ([components.stories.tsx](../../registry/stories/components.stories.tsx)).
- `BoardTargets` computes each selectable target's nearest neighbour on every
  render ([board-targets.tsx:118](../../registry/items/board-targets.tsx#L118)),
  which is quadratic in the number of targets.

## Design

### Layout tiles

`layout.getTiles()` returns rendering geometry over the current seat projection:
opaque `SeatTileRef`, discriminated visible/concealed `data`, visible `spaceIds`,
plural `outlines`, `center`, `anchor`, and `rotationDegrees`. It never carries an
authoritative inventory identity or spatial target methods.

Visible footprints come from projected cells. Concealed footprints come only from
the independently authored public appearance transformed by placement. Shared
admission validates transformed coordinate bounds. Concealed footprints affect
bounds but cannot create cells, edges, vertices or hit-test targets.

Cancel internal sides by exact lattice identity and walk oriented boundary loops.
Reject non-finite derived coordinates and bounds, including viewport transforms.
Support holes, disconnected islands and corner-touching footprints; render filled
paths using `fillRule="evenodd"`. Cache admitted geometry with its projected
owner, presentation, placement, size and origin. Preserve immutable captures.

Zone tile controls are a separate headless facade: `getTiles`, `getTile`,
`findTile`, selection and target props. Tile targets route through
`{ kind: "tile", value: SeatTileRef }` and the tile input. Captured handlers expire
when their frame, authority, seat or source changes.

### `BoardTargets`

```tsx
<BoardTargets
  boardId="map"
  renderTile={(tile) => (
    <g
      transform={`rotate(${tile.rotationDegrees} ${tile.anchor.x} ${tile.anchor.y})`}
    >
      <image
        href={
          tile.data.disclosure === "visible"
            ? tile.data.frontImage
            : tile.data.appearance.backImage
        } /* positioned around tile.anchor */
      />
    </g>
  )}
  tileProps={(tile) => ({ className: "fill-none stroke-2 stroke-foreground" })}
/>
```

- `renderTile` and `tileProps` render beneath spaces. With neither provided,
  tile artwork is omitted, so single-cell boards need no edits.
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
- Both reference-game browser suites use the currently emitted seat references
  and pass with physically exercised desktop and touch actions.

## Verify

```sh
pnpm check
pnpm ui test
```

## Done when

- One hex renderer remains, bound to real geometry.
- Multi-hex tiles render as tiles, with correct rotation.

After this layer and explicit publication authorization, publish the SDK alpha (see the [README](README.md#publication)).
