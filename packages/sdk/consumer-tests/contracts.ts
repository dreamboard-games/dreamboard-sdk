import { z } from "zod";
import {
  createGame,
  compileManifest,
  createTableQueries,
  tileSpaceId,
} from "@dreamboard-games/sdk/reducer";
import {
  createGameInstance,
  boardFeature,
  type CommandSource,
  type InputBase,
} from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
import { createScenarioAuthoring } from "@dreamboard-games/sdk/testing";

const author = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
  },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
});
const definition = author.assemble({
  initialPhase: "play",
  view: author.view(() => ({})),
  phases: {
    play: author.phase("play").define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        choose: author.phase("play").interaction({
          inputs: {
            mood: author.phase("play").inputs.form.choice({
              choices: [
                { value: "ready", label: "Ready" },
                { value: "wait", label: "Wait" },
              ] as const,
              defaultValue: "ready",
            }),
          },
          reduce: () => {},
        }),
      },
    }),
  },
});
declare const source: CommandSource;
const instance = createGameInstance<typeof definition>()({ source });
const input = instance.inputs.get("play.choose", "mood");
input.setValue("ready");
// @ts-expect-error Values retain the authored literal union in the installed package.
input.setValue("invalid");
// @ts-expect-error Unknown qualified interaction names are rejected.
instance.interactions.get("play.invalid");
const hook = createGameHook<typeof definition>()({});
const mood: "ready" | "wait" | undefined = hook
  .useGame()
  .inputs.get("play.choose", "mood")
  .getValue();
void mood;
const scenarios = createScenarioAuthoring(definition);
scenarios.defineScenario({
  id: "choice",
  setup: { players: 2, seed: 0 },
  given: [],
  when: [
    { actor: { seat: 0 }, interactionId: "choose", params: { mood: "ready" } },
  ],
  then: () => {},
});
// @ts-expect-error Ordinary assignment must not widen a literal setter.
const erased: Pick<InputBase<unknown, string, string>, "setValue"> = input;
void erased;
const control = input.getControl();
if (control.type === "boundedNumber" && control.mode === "many") {
  control.setValue([1]);
  // @ts-expect-error A many numeric control never accepts a scalar.
  control.setValue(1);
}

// @ts-expect-error Board layout types are inferred from instances, not exported as aliases.
type PrivateBoardLayout = import("@dreamboard-games/sdk").BoardLayout;

// The installed declaration bundle must preserve topology metadata through queries
// and layout callbacks, including recursive fields and discriminated local cells.
const topology = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [
    {
      id: "map",
      name: "Map",
      scope: "shared",
      layout: "hex",
      relationFieldsSchema: z.object({
        toll: z.number(),
        note: z.string().optional(),
      }),
    },
  ],
  tileTypes: [
    {
      id: "land",
      name: "Land",
      layout: "hex",
      cellFieldsSchema: z.object({
        terrain: z.enum(["forest", "plain"]),
        notes: z.array(
          z.object({ text: z.string(), priority: z.number().optional() }),
        ),
      }),
      edgeFieldsSchema: z.object({ cost: z.number() }),
      vertexFieldsSchema: z.object({ capacity: z.number() }),
      edges: [{ cellId: "center", side: 0, fields: { cost: 2 } }],
      vertices: [{ cellId: "center", corner: 0, fields: { capacity: 3 } }],
      cells: [
        {
          id: "center",
          at: { q: 0, r: 0 },
          fields: { terrain: "forest", notes: [{ text: "Home" }] },
        },
      ],
    },
  ],
  tileSeeds: [
    {
      id: "island",
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
});
const topologyTable = topology.createInitialTable({ playerIds: ["seat"] });
const topologyQueries = createTableQueries(topologyTable, topology);
const topologyCell = topologyQueries
  .board("map")
  .space(tileSpaceId("island", "center"));
const terrain: "forest" | "plain" = topologyCell.fields.terrain;
const priority: number | undefined = topologyCell.fields.notes[0].priority;
// @ts-expect-error Unknown metadata keys must not be admitted by a broad JSON index.
topologyCell.fields.missing;
// @ts-expect-error Nested declaration fields are readonly.
topologyCell.fields.notes[0].text = "changed";
// @ts-expect-error Unknown local cells are excluded from the authored API.
topologyQueries.board("map").space(tileSpaceId("island", "missing"));
const boardAuthor = createGame({
  manifest: topology,
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
});
const boardDefinition = boardAuthor.assemble({
  initialPhase: "play",
  view: boardAuthor.view(() => ({})),
  phases: { play: boardAuthor.phase("play").define({ kind: "player" }) },
});
const boardInstance = createGameInstance<typeof boardDefinition>()({
  source,
  features: (core, context) => ({ board: boardFeature(core, context) }),
});
const layoutCell = boardInstance.boards
  .get("map")
  .getLayout({ hexSize: 20 })
  .getSpaces()[0];
type IsAny<T> = 0 extends 1 & T ? true : false;
const layoutCellIsTyped: IsAny<typeof layoutCell> = false;
const layoutTerrainIsTyped: IsAny<typeof layoutCell.data.fields.terrain> =
  false;
const layoutTerrain: "forest" | "plain" = layoutCell.data.fields.terrain;
// @ts-expect-error Installed layout fields retain the declared value type.
const incorrectTerrain: number = layoutCell.data.fields.terrain;
// @ts-expect-error Installed layout metadata remains readonly.
layoutCell.data.fields.notes[0].text = "changed";
void [
  terrain,
  priority,
  layoutCellIsTyped,
  layoutTerrainIsTyped,
  layoutTerrain,
  incorrectTerrain,
];

const boardLayout = boardInstance.boards.get("map").getLayout({ hexSize: 20 });
const layoutEdge = boardLayout.getEdges()[0];
const layoutVertex = boardLayout.getVertices()[0];
const edgeCost: number | undefined = layoutEdge.data?.fields.cost;
const vertexCapacity: number | undefined = layoutVertex.data?.fields.capacity;
const edgeIsTyped: IsAny<typeof layoutEdge.data> = false;
// @ts-expect-error Layout edge metadata retains declared field keys.
layoutEdge.data?.fields.missing;
// @ts-expect-error Layout vertex metadata retains declared field types.
const incorrectCapacity: string | undefined =
  layoutVertex.data?.fields.capacity;
void [edgeCost, vertexCapacity, edgeIsTyped, incorrectCapacity];

const relation = topologyQueries.board("map").state.relations[0];
const toll: number = relation.fields.toll;
const relationNote: string | undefined = relation.fields.note;
// @ts-expect-error Declared relation fields retain exact keys.
relation.fields.missing;
// @ts-expect-error Query results cannot mutate authoritative relation state.
relation.fields.toll = 5;
void [toll, relationNote];
