import { compileManifest, createTableQueries } from "../src/reducer";
import type { GameTopologyManifest, SquareBoardSpec } from "../src/reducer";
// @ts-expect-error Reusable board template contracts are removed.
import type { BoardTemplateSpec } from "../src/reducer";

const square = {
  id: "map",
  name: "Map",
  layout: "square",
  scope: "shared",
  boardFieldsSchema: { properties: { round: { type: "integer" } } },
  spaceFieldsSchema: { properties: { terrain: { type: "string" } } },
  spaces: [{ id: "home", row: 0, col: 0, fields: { terrain: "grass" } }],
} as const;
const manifest = compileManifest({
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  zones: [],
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
const table = manifest.createInitialTable();
const round: number = table.boards.byId.map.fields.round;
const terrain: string = table.boards.byId.map.spaces.home.fields.terrain;
const q = createTableQueries(table);
q.board("map");
q.board("track");
// @ts-expect-error Inline space identity is retained.
table.boards.byId.map.spaces.missing;
// @ts-expect-error Board identities remain literal.
q.board("unknown");
const removedBoard: SquareBoardSpec = {
  ...square,
  spaces: [],
  // @ts-expect-error Boards contain topology directly.
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
