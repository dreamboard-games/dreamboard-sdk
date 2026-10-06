import { z } from "zod";
import {
  compileManifest,
  createTableQueries,
  tileSpaceId,
} from "../src/reducer";
import type { GameTopologyManifest, SquareBoardSpec } from "../src/reducer";
// @ts-expect-error Reusable board template contracts are removed.
import type { BoardTemplateSpec } from "../src/reducer";

const square = {
  id: "map",
  name: "Map",
  layout: "square",
  scope: "shared",
  boardFieldsSchema: z.object({ round: z.number().int().default(0) }),
} as const;
const manifest = compileManifest({
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  zones: [],
  tileTypes: [
    {
      id: "terrain",
      name: "Terrain",
      layout: "square",
      cellFieldsSchema: z.object({ terrain: z.string() }),
      cells: [
        { id: "home", at: { row: 0, col: 0 }, fields: { terrain: "grass" } },
      ],
    },
  ],
  tileSeeds: [
    {
      id: "terrain",
      typeId: "terrain",
      home: {
        type: "board",
        boardId: "map",
        layout: "square",
        row: 0,
        col: 0,
        rotation: 0,
      },
    },
  ],
  boards: [
    square,
    {
      id: "track",
      name: "Track",
      layout: "generic",
      scope: "shared",
      spaces: [{ id: "start" }, { id: "finish" }],
      relations: [
        {
          id: "route",
          typeId: "next",
          fromSpaceId: "start",
          toSpaceId: "finish",
        },
      ],
    },
  ],
} as const);
const table = manifest.createInitialTable({ playerIds: [] });
const q = createTableQueries(table, manifest);
const round: number = q.board("map").state.fields.round;
const terrain: string = q.board("map").space(tileSpaceId("terrain", "home"))
  .fields.terrain;
q.board("map");
q.board("track");
// @ts-expect-error Declared local cell identity is retained.
q.board("map").space(tileSpaceId("terrain", "missing"));
// @ts-expect-error Runtime board instances contain no geometry mirror.
table.boards.map.spaces;
// @ts-expect-error Board fields are immutable definition metadata.
q.board("map").state.fields.round = 1;
// @ts-expect-error Cell fields are immutable definition metadata.
q.board("map").space(tileSpaceId("terrain", "home")).fields.terrain = "water";
// @ts-expect-error Board identities remain literal.
q.board("unknown");
const removedBoard: SquareBoardSpec = {
  id: "removed",
  name: "Removed",
  layout: "square",
  scope: "shared",
  // @ts-expect-error Reusable board templates are removed.
  templateId: "old-map",
};
const removedManifest: GameTopologyManifest = {
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  boards: [],
  // @ts-expect-error Manifest template tables are removed.
  boardTemplates: [],
};
void [round, terrain, removedBoard, removedManifest];
