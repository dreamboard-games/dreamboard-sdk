# 06 — Tile catalog and placement state

This is execution PR 7. The catalog/placement code below is historical design material: replace it with game-owned tile types/instances and canonical component locations from private-tiles.md. Do not persist a second placement store or globally disclose placements.

See [private tiles and authority](private-tiles.md).

Branch: `sdk/tile-catalog` (on `sdk/per-player-inventory`). Size: L.
Read first: [02 — hex lattice](02-hex-lattice.md),
[materialize.ts board section](../../packages/sdk/src/reducer/manifest/materialize.ts#L1769),
[static-projection.ts](../../packages/sdk/src/reducer/bundle/trusted/static-projection.ts),
[projection.ts](../../packages/sdk/src/shared/protocol/projection.ts),
[headless board feature](../../packages/sdk/src/headless/features/board.ts).

## Goal

- Boards declare a **catalog** of tiles. A tile is one or more cells (spaces)
  in its own frame. A fixed board is its default placements.
- Session state holds only **placements** and **relations**. Everything else is
  static catalog data or derived.
- Topology (world spaces, edges, vertices, adjacency) is computed from catalog +
  placements by one shared function in the reducer and the client.
- Every layout supports relations.

No placement mutations yet; [layer 07](07-place-tiles.md) adds them. This layer
must leave both reference games behaving identically.

## Current state

- `table.boards` holds a full topology copy per session (`byId`, `hex`,
  `square`, plus empty `network`/`track` buckets), serialized with every state
  version ([session-codec.ts:166](../../packages/sdk/src/reducer/ingress/session-codec.ts#L166))
  and never mutated.
- Clients render `manifest.staticBoards` instead, sent once as `boardStatic`
  ([static-projection.ts:56](../../packages/sdk/src/reducer/bundle/trusted/static-projection.ts#L56),
  [compiler.ts:209](../../packages/sdk/src/reducer/manifest/compiler.ts#L209)) and
  joined into `view.boards` ([projection.ts:75](../../packages/sdk/src/shared/protocol/projection.ts#L75)).
- Hex boards are declared by `shape` + `exclude` + coordinate-keyed `spaces`
  overrides ([board.ts](../../examples/reference-games/hex-network-trading/manifest/board.ts)),
  have no relations ([materialize.ts:1835](../../packages/sdk/src/reducer/manifest/materialize.ts#L1835)),
  and attach edge/vertex metadata by board-level refs.
- The Hex reference game keeps terrain, numbers and resources in
  `HEX_RULES` ([model.ts:23](../../examples/reference-games/hex-network-trading/app/model.ts#L23))
  and sends them in every seat view ([player-view.ts:17](../../examples/reference-games/hex-network-trading/app/player-view.ts#L17)).

## Design

### Manifest

```ts
type Rotation6 = 0 | 1 | 2 | 3 | 4 | 5;

export type HexBoardSpec = {
  id: string;
  name: string;
  layout: "hex";
  typeId?: string;
  scope: "shared" | "perPlayer";
  orientation?: "pointy" | "flat";
  boardFieldsSchema?: FieldSchemaJson;
  spaceFieldsSchema?: FieldSchemaJson;
  relationFieldsSchema?: FieldSchemaJson;
  edgeFieldsSchema?: FieldSchemaJson;
  vertexFieldsSchema?: FieldSchemaJson;
  fields?: { [key: string]: JsonValue };
  tiles: { [tileId: string]: HexTileSpec };
  relations?: BoardRelationSpec[]; // initial playable connections
};

export type HexTileSpec = {
  name?: string;
  /** Default placement. Omit for tiles placed by the reducer. */
  at?: { q: number; r: number; rotation?: Rotation6 };
  /** Single-cell tile: the one space's type and fields. Its space ID is the tile ID. */
  typeId?: string;
  fields?: { [key: string]: JsonValue };
  /** Multi-cell tile: cells in the tile's own frame. Space IDs are the keys. */
  cells?: {
    [spaceId: string]: {
      at: { q: number; r: number };
      name?: string;
      typeId?: string;
      fields?: { [key: string]: JsonValue };
    };
  };
  /** Tile-local edge and vertex data; rotates with the tile. `cell` required for multi-cell tiles. */
  edges?: {
    cell?: string;
    side: Rotation6;
    typeId?: string;
    label?: string;
    fields?: { [key: string]: JsonValue };
  }[];
  vertices?: {
    cell?: string;
    corner: Rotation6;
    typeId?: string;
    label?: string;
    fields?: { [key: string]: JsonValue };
  }[];
};
```

A tile has either `typeId`/`fields` (single cell) or `cells`, never both.
Square boards use the same shape with `at: { col, row, rotation?: 0 | 1 | 2 | 3 }`,
cells at `{ col, row }` and sides/corners `0–3`. Generic boards keep
`spaces: { [spaceId]: { name?, typeId?, fields? } }` and `relations`; they have
no placements.

Shapes stay as a helper, not a second board format. `tilesFromShape` expands a
honeycomb shape into single-cell tiles with `at`, with optional overrides by
coordinate:

```ts
import { hexagon, tilesFromShape } from "@dreamboard-games/sdk/reducer";

tiles: tilesFromShape(hexagon({ radius: 1 }), {
  "0,-1": { id: "northForest", typeId: "pineForest", fields: { number: 5, resourceId: "timber" } },
  "0,0": { id: "centralBarrens", typeId: "barrens", fields: { number: null, resourceId: null } },
  // ...
}),
```

`tilesFromShape` returns plain JSON. Its return type keeps literal override IDs
and uses `` `${number},${number}` `` for generated IDs, as `HexSpaceId` does
today. Delete `shape`, `exclude` and coordinate-keyed `spaces` from the board
spec, and board-level `edges`/`vertices` metadata (it becomes tile-local).

### Session state

```ts
export type RuntimeTilePlacement =
  | { q: number; r: number; rotation: number } // hex, rotation 0–5
  | { col: number; row: number; rotation: number }; // square, rotation 0–3

export type RuntimeBoardState = {
  /** tileId -> placement. A tile with no entry is not on the board. Empty for generic boards. */
  placements: Record<string, RuntimeTilePlacement>;
  /** Playable connections: authored ones at table creation, plus any the reducer adds (layer 07). */
  relations: RuntimeBoardRelationState[];
};

export type RuntimeTableRecord = {
  // ...
  boards: Record<string /* runtime board ID */, RuntimeBoardState>;
};
```

Table creation fills `placements` from each tile's `at` and `relations` from the
authored list (field defaults applied through `fieldValidator`). Board and
space fields are static and stay in the catalog.

### Compiled catalog

`staticBoards` becomes `boardCatalog`, keyed by base board ID:

```ts
export type HexBoardCatalog = {
  id: string;
  layout: "hex";
  scope: "shared" | "perPlayer";
  orientation: "pointy" | "flat";
  typeId: string | null;
  fields: RuntimeRecord; // defaults applied
  tiles: Record<
    string,
    {
      name: string | null;
      cells: readonly {
        spaceId: string;
        local: { q: number; r: number };
        name: string | null;
        typeId: string | null;
        fields: RuntimeRecord;
      }[];
      edges: readonly {
        cell: string;
        side: number;
        typeId: string | null;
        label: string | null;
        fields: RuntimeRecord;
      }[];
      vertices: readonly {
        cell: string;
        corner: number;
        typeId: string | null;
        label: string | null;
        fields: RuntimeRecord;
      }[];
    }
  >;
};
```

### Derived topology

One function in `shared/board-topology.ts`, used by reducer queries, the seat
projection and the headless board feature:

```ts
export function boardTopology(
  catalog: BoardCatalog,
  state: RuntimeBoardState,
): BoardTopology {
  // Hex: for each placed tile, place each cell with
  //   world = add(rotate(cell.local, placement.rotation), placement)
  // then build createHexTopology (layer 02) over the placed cells.
  // Tile-local edge/vertex data maps to world IDs with
  //   edgeKey(worldCell, (side + rotation) % 6) and vertexKey(worldCell, (corner + rotation) % 6).
  // Square: the same with 90° rotation. Generic: catalog spaces, adjacency from relations.
}

export type BoardTopologySpace = {
  id: string;
  tileId: string;
  q: number;
  r: number; // or col/row
  name: string | null;
  typeId: string | null;
  fields: RuntimeRecord;
};
```

Cache with the layer 02 approach: `WeakMap` on `state.placements`, then a
per-board single entry keyed by `JSON.stringify(placements)` (small: a few
numbers per tile). Reject overlapping cells with a clear error naming both
tiles.

### Queries

`q.board(id)` keeps its surface and reads the derived topology, with two
additions:

```ts
q.board("frontier").tile("forest"); // always succeeds: catalog data + placement | null
q.board("frontier").space("forest"); // placed spaces only; throws "Tile 'forest' is not placed"
q.board("frontier").spaces(); // placed spaces
```

Known identities keep required lookups (`tile`) whether placed or not; geometric
membership is checked at runtime.

### Projection

- `boardStatic` carries `{ boards: manifest.boardCatalog }`.
- The seat projection bundle gains
  `boards: Record<RuntimeBoardId, RuntimeBoardState>`, shared by all seats
  (placements and relations are public).
- `PluginGameplayFrame` gains `boards: { catalog, state }`. `view.boards` is
  removed; `view` is the author's seat view only.
- The headless board feature derives topology with `boardTopology(catalog,
state)`. `BoardBase.data` becomes the derived board (spaces with `tileId`,
  edges, vertices, relations, catalog fields).

### Reference game

Move `HEX_RULES` into the manifest and read it from board data:

```ts
spaceFieldsSchema: z.object({
  number: z.int().min(2).max(12).nullable(),
  resourceId: ref.resourceId().nullable(),
}),
tiles: tilesFromShape(hexagon({ radius: 1 }), {
  "0,-1": { id: "northForest", typeId: "pineForest", fields: { number: 5, resourceId: "timber" } },
  // ...
}),
```

- Delete `HEX_RULES` and the `hexes` entry in the public view.
- Rules read `q.board("frontier").space(id).fields.number`.
- The UI reads `space.data.typeId` and `space.data.fields.number` in
  `renderSpace` instead of joining `view.hexes`.

## Delete

- `RuntimeBoardCollections`, the table board state types with spaces, edges
  and vertices, `network`/`track`, `staticBoards`, `resolveHexSpaces`,
  `HexSpaceOverride`, `shape`/`exclude`/coordinate `spaces` on hex boards,
  board-level `HexEdgeSpec`/`HexVertexSpec`/`SquareEdgeSpec`/`SquareVertexSpec`
  refs, the hard-coded `relations: []` for hex boards, the `view.boards` merge
  and its authored-`boards` rejection, and board cloning.
- Hearts' `staticBoards` export in `app/manifest.ts`.

## Tests and proofs

- Reference games behave identically: all Hex and Hearts scenarios pass.
- Topology: rotated multi-cell tiles place cells correctly; tile-local edge and
  vertex metadata lands on the right world IDs for every rotation; overlap is
  rejected.
- Serialized session state for Hex is smaller than before (record both sizes in
  the PR); no topology appears in it.
- Frame: `boardStatic` contains only the catalog; the dynamic bundle carries
  placements; the headless feature derives the same spaces, edges and vertices
  as the reducer.
- Type proofs: `tile(id)` accepts every catalog tile ID; `tilesFromShape`
  keeps literal override IDs; a multi-cell tile with both `typeId` and `cells`
  is rejected.

## Verify

```sh
pnpm check
pnpm reference
pnpm ui test
```

## Done when

- Session state contains placements and relations only.
- Reducer and client derive topology with the same function.
- The Hex reference game reads all board data from the manifest.
