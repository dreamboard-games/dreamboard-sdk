import {
  compileManifest,
  createGame,
  createTableQueries,
  tileSpaceId,
  z,
} from "../reducer";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

const manifest = {
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [
    {
      id: "map",
      name: "Map",
      layout: "hex",
      scope: "shared",
      boardFieldsSchema: z.object({ season: z.enum(["summer", "winter"]) }),
      fields: { season: "summer" },
    },
    {
      id: "track",
      name: "Track",
      layout: "generic",
      scope: "shared",
      spaceFieldsSchema: z.object({ score: z.number() }),
      spaces: [{ id: "finish", fields: { score: 10 } }],
    },
  ],
  tileTypes: [
    {
      id: "terrain",
      name: "Terrain",
      layout: "hex",
      cellFieldsSchema: z.object({
        land: z.enum(["forest", "plain"]),
        labels: z.array(
          z.object({ text: z.string(), priority: z.number().optional() }),
        ),
      }),
      cells: [
        {
          id: "center",
          at: { q: 0, r: 0 },
          fields: { land: "forest", labels: [{ text: "Home" }] },
        },
      ],
      edgeFieldsSchema: z.object({ cost: z.number() }),
      edges: [{ cellId: "center", side: 0, fields: { cost: 2 } }],
    },
  ],
  tileSeeds: [
    {
      id: "tile",
      typeId: "terrain",
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
} as const;
const compiled = compileManifest(manifest);
const table = compiled.createInitialTable({ playerIds: ["north"] });
const q = createTableQueries(table, compiled);
const map = q.board("map");
const cell = map.space(tileSpaceId("tile", "center"));
const exactSeason: Equal<typeof map.state.fields.season, "summer" | "winter"> =
  true;
const exactLand: Equal<typeof cell.fields.land, "forest" | "plain"> = true;
const optionalPriority: number | undefined = cell.fields.labels[0].priority;
const score: number = q.board("track").space("finish").fields.score;
const edgeCost: number | undefined = map.state.edges[0].fields.cost;
// @ts-expect-error Authored board fields do not gain a broad JSON index signature.
map.state.fields.unknown;
// @ts-expect-error Authored cell fields remain exact.
cell.fields.unknown;
// @ts-expect-error Derived metadata is deeply readonly.
cell.fields.labels[0].text = "Changed";
// @ts-expect-error Generic space names belong to their board.
q.board("track").space("center");
// @ts-expect-error Generic boards have no geometric edges.
q.board("track").state.edges;
// @ts-expect-error Runtime tables do not own copied board metadata.
table.boards.map.fields;

const game = createGame({
  manifest: compileManifest(manifest),
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
});
game.phase("play").inputs.board.space({
  boardId: "map",
  where: {
    id: "summer",
    errorCode: "BOARD_TARGET_NOT_ELIGIBLE",
    test: ({ q: queries }) => {
      const season: "summer" | "winter" =
        queries.board("map").state.fields.season;
      // @ts-expect-error Bound input predicates preserve exact board fields too.
      queries.board("map").state.fields.unknown;
      return season === "summer";
    },
  },
});
void [exactSeason, exactLand, optionalPriority, score, edgeCost];
