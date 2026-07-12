import { z } from "zod";
import { many } from "../src/reducer/inputs/many.js";
import type { PlayerSpaceInputSchema } from "../src/reducer/inputs/boardInput.js";
import { markManifestScopedSchema } from "../src/reducer/model/manifest.js";
import * as testingDefinitions from "../src/testing/definitions.js";
import {
  createScenarioAuthoring,
  type ScenarioCommandOf,
  type ScenarioSchemaOutput,
} from "../src/testing/definitions.js";

type AssertFalse<Value extends false> = Value;
type HasDefineBase = "defineBase" extends keyof typeof testingDefinitions
  ? true
  : false;
type _BaseApiIsAbsent = AssertFalse<HasDefineBase>;

const playerId = markManifestScopedSchema(z.string(), "playerId");
const ordinaryString = z.string();
const selectedPlayers = many(
  { kind: "form", schema: playerId },
  { min: 1, max: 3 },
);
const nested = z.object({
  target: playerId,
  optionalTarget: playerId.optional(),
  nullableTarget: playerId.nullable(),
  selectedPlayers: selectedPlayers.schema,
  pair: z.tuple([ordinaryString, playerId]),
  recipient: z.union([playerId, z.literal("bank")]),
  label: ordinaryString,
});

const game = {
  contract: {
    manifest: {
      normalSetup: {
        minPlayers: 2,
        maxPlayers: 3,
        createInitialTable: () => ({}),
      },
      literals: { playerIds: ["player-1", "player-2", "player-3"] },
      setupProfilesById: {},
    },
  },
  phases: {
    play: {
      interactions: {
        choose: {
          inputs: {
            selection: { kind: "form", schema: nested },
          },
        },
      },
    },
  },
  views: {},
} as const;

type Command = Extract<
  ScenarioCommandOf<typeof game>,
  { readonly interactionId: "choose" }
>;
type Selection = Command["params"]["selection"];

const validSelection: Selection = {
  target: { seat: 0 },
  nullableTarget: null,
  selectedPlayers: [{ seat: 1 }],
  pair: ["ordinary", { seat: 0 }],
  recipient: "bank",
  label: "player-1 remains ordinary data",
};

const runtimePlayerIdIsRejected: Selection = {
  ...validSelection,
  // @ts-expect-error semantic player ids must use a seat reference.
  target: "player-1",
};

const ordinaryStringRemainsString: Selection = {
  ...validSelection,
  // @ts-expect-error ordinary strings are not rewritten into seat references.
  label: { seat: 0 },
};

const manyPlayers: ScenarioSchemaOutput<typeof selectedPlayers.schema> = [
  { seat: 0 },
  { seat: 1 },
];
const manyRuntimeIdsAreRejected: ScenarioSchemaOutput<
  typeof selectedPlayers.schema
> = [
  // @ts-expect-error many(...) preserves its semantic inner player-id schema.
  "player-1",
];

type PlayerSpace = ScenarioSchemaOutput<
  PlayerSpaceInputSchema<"mat", "slot-a", string>
>;
const playerSpace: PlayerSpace = {
  boardId: "mat",
  playerId: { seat: 1 },
  spaceId: "slot-a",
};
const playerSpaceRuntimeIdIsRejected: PlayerSpace = {
  ...playerSpace,
  // @ts-expect-error player-board-space uses the same semantic seat reference.
  playerId: "player-2",
};

const { defineScenario } = createScenarioAuthoring(game);
const validDefinition = defineScenario({
  id: "typecheck.valid",
  setup: { players: 2, seed: 0 },
  given: [
    {
      actor: { seat: 0 },
      interactionId: "choose",
      params: { selection: validSelection },
    },
  ],
  when: [],
  then: ({ view, probe }) => {
    view({ seat: 0 });
    void probe({
      actor: { seat: 1 },
      interactionId: "choose",
      params: { selection: validSelection },
    });
  },
});

defineScenario({
  ...validDefinition,
  // @ts-expect-error reusable base authority is absent from the contract.
  from: "legacy-base",
});

defineScenario({
  ...validDefinition,
  // @ts-expect-error runner selectors are absent from behavior scenarios.
  runners: ["reducer"],
});

defineScenario({
  ...validDefinition,
  // @ts-expect-error when is canonical command data, not an imperative callback.
  when: async () => {},
});

void runtimePlayerIdIsRejected;
void ordinaryStringRemainsString;
void manyPlayers;
void manyRuntimeIdsAreRejected;
void playerSpaceRuntimeIdIsRejected;
