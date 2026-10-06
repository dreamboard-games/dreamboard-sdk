import { compileManifest } from "../reducer/manifest/compiler.js";
import { z } from "zod";
import { createGame } from "../reducer.js";
import type { CoreInstance, FeatureContext } from "./model.js";
import { boardFeature } from "./features/board.js";

const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    boards: [{ id: "map", name: "Map", layout: "square", scope: "shared" }],
    tileTypes: [
      {
        id: "cell",
        name: "Cell",
        layout: "square",
        cells: [{ id: "cell", at: { col: 0, row: 0 } }],
        propertiesSchema: z.object({ charges: z.number() }),
        edgeFieldsSchema: z.object({ cost: z.number() }),
        vertexFieldsSchema: z.object({ blocked: z.boolean() }),
        edges: [{ cellId: "cell", side: 0, fields: { cost: 2 } }],
        vertices: [{ cellId: "cell", corner: 0, fields: { blocked: false } }],
      },
    ],
    tileSeeds: [
      {
        id: "tile",
        typeId: "cell",
        properties: { charges: 2 },
        home: {
          type: "board",
          boardId: "map",
          layout: "square",
          col: 0,
          row: 0,
          rotation: 0,
        },
      },
    ],
  }),
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const play = model.phase("play");
const game = model.assemble({
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {},
    }),
  },
  view: model.view(() => ({})),
});
declare const core: CoreInstance<typeof game>;
declare const context: FeatureContext<typeof game>;
const feature = boardFeature(core, context);
type Layout = ReturnType<typeof feature.board.getLayout>;
declare const edge: NonNullable<ReturnType<Layout["getEdges"]>[number]["data"]>;
declare const vertex: NonNullable<
  ReturnType<Layout["getVertices"]>[number]["data"]
>;
const edgeIsAny: 0 extends 1 & typeof edge ? true : false = false;
const vertexIsAny: 0 extends 1 & typeof vertex ? true : false = false;
const cost: number | undefined = edge.fields.cost;
const blocked: boolean | undefined = vertex.fields.blocked;
// @ts-expect-error Edge annotation fields preserve exact declared names.
edge.fields.unknown;
// @ts-expect-error Vertex annotation fields preserve exact declared names.
vertex.fields.unknown;
// @ts-expect-error Edge annotation values preserve declared scalar types.
const wrongCost: string | undefined = edge.fields.cost;
// @ts-expect-error Projected annotation fields are immutable.
vertex.fields.blocked = true;
void [edgeIsAny, vertexIsAny, cost, blocked, wrongCost];

import type {
  SeatSpaceRef,
  SeatTileRef,
} from "../shared/domain/seat-reference.js";
import type { TileSpaceId } from "../shared/domain/tile-space.js";
import type { BoardDataOf } from "./model.js";
declare const projectedCell: BoardDataOf<
  typeof game,
  "map"
>["spaces"][SeatSpaceRef];
const projectedId: SeatSpaceRef = projectedCell.id;
const projectedTile: SeatTileRef = projectedCell.tileRef;
// @ts-expect-error Clients never receive the authoritative tile instance identity.
projectedCell.tileId;
// @ts-expect-error Seat cell references cannot be used as authoritative runtime space IDs.
const authoritativeId: TileSpaceId = projectedCell.id;
void [projectedId, projectedTile, authoritativeId];

import type { BoardTarget } from "./targets.js";
declare const rawCellId: TileSpaceId;
const clientTarget: BoardTarget<typeof game> = {
  kind: "space",
  valueKind: "board-id",
  boardId: "map",
  value: projectedId,
};
const invalidClientTarget: BoardTarget<typeof game> = {
  kind: "space",
  valueKind: "board-id",
  boardId: "map",
  // @ts-expect-error Client board targets require seat references, never authoritative cell IDs.
  value: rawCellId,
};
void [clientTarget, invalidClientTarget];

declare const layoutTile: ReturnType<Layout["getTiles"]>[number];
const tileReference: SeatTileRef = layoutTile.ref;
const tileIsAny: 0 extends 1 & typeof layoutTile ? true : false = false;
if (layoutTile.data.disclosure === "visible") {
  const charges: number = layoutTile.data.properties.charges;
  // @ts-expect-error Visible tile properties retain exact authored names.
  layoutTile.data.properties.unknown;
  // @ts-expect-error Visible tile properties are immutable.
  layoutTile.data.properties.charges = 3;
  void charges;
} else {
  const footprint = layoutTile.data.appearance.cells;
  // @ts-expect-error Concealed presentation does not expose authoritative properties.
  layoutTile.data.properties;
  void footprint;
}
// @ts-expect-error Layout tiles do not disclose authoritative inventory IDs.
layoutTile.id;
// @ts-expect-error Tile rendering geometry is separate from spatial target handles.
layoutTile.getTargetProps;
void [tileReference, tileIsAny];
