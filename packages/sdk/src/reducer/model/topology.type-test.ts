import * as z from "zod";
import { compileManifest } from "../manifest/compiler.js";
import { createTableQueries } from "../table-queries.js";
import { tileSpaceId } from "../../shared/domain/tile-space.js";

const manifest = compileManifest({
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  zones: [],
  boards: [
    {
      id: "map",
      name: "Map",
      scope: "shared",
      layout: "hex",
      boardFieldsSchema: z.object({
        title: z.string(),
        style: z.object({ color: z.string() }),
      }),
      fields: { title: "Island", style: { color: "red" } },
    },
    {
      id: "track",
      name: "Track",
      scope: "shared",
      layout: "generic",
      spaceFieldsSchema: z.object({ rank: z.number() }),
      spaces: [{ id: "start", fields: { rank: 1 } }],
    },
  ],
  tileTypes: [
    {
      id: "land",
      name: "Land",
      layout: "hex",
      cellFieldsSchema: z.object({ resource: z.enum(["wood", "ore"]) }),
      edgeFieldsSchema: z.object({ cost: z.number() }),
      vertexFieldsSchema: z.object({ limit: z.number() }),
      cells: [
        {
          id: "center",
          typeId: "forest",
          at: { q: 0, r: 0 },
          fields: { resource: "wood" },
        },
      ],
      edges: [{ cellId: "center", side: 0, fields: { cost: 1 } }],
      vertices: [{ cellId: "center", corner: 0, fields: { limit: 2 } }],
    },
  ],
  tileSeeds: [
    {
      id: "terrain",
      typeId: "land",
      home: {
        type: "board",
        boardId: "map",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
  ],
} as const);
const table = manifest.createInitialTable({ playerIds: ["alice"] });
const q = createTableQueries(table, manifest),
  board = q.board("map"),
  cell = board.space(tileSpaceId("terrain", "center"));
const layout: "hex" = board.state.layout;
const scope: "shared" = board.state.scope;
const title: string = board.state.fields.title;
const color: string = board.state.fields.style.color;
const resource: "wood" | "ore" = cell.fields.resource;
const type: "forest" = cell.typeId;
const cost: number | undefined = board.state.edges[0].fields.cost;
const limit: number | undefined = board.state.vertices[0].fields.limit;
const rank: number = q.board("track").space("start").fields.rank;
board.relatedSpaces(cell.id, "new-runtime-tag");
// @ts-expect-error Finite board definitions preserve exact board IDs.
q.board("missing");
// @ts-expect-error Generic space keys remain exact.
q.board("track").space("missing");
// @ts-expect-error Stable tile space identity must name an admitted inventory base and declared cell.
board.space(tileSpaceId("missing", "center"));
// @ts-expect-error Board fields have no broad record index signature.
board.state.fields.missing;
// @ts-expect-error Cell fields have no broad record index signature.
cell.fields.missing;
// @ts-expect-error Edge metadata has no broad record index signature.
board.state.edges[0].fields.missing;
// @ts-expect-error Vertex metadata has no broad record index signature.
board.state.vertices[0].fields.missing;
// @ts-expect-error Definition-owned board metadata is recursively read-only.
board.state.fields.style.color = "blue";
// @ts-expect-error Definition-owned cell metadata is read-only.
cell.fields.resource = "ore";
void [layout, scope, title, color, resource, type, cost, limit, rank];
