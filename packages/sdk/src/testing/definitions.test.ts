import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { markManifestScopedSchema } from "../reducer/model/manifest";
import {
  createScenarioAuthoring,
  ScenarioDefinitionValidationError,
  ScenarioReplayError,
  toScenarioReplayDefinition,
  type ScenarioCommandOf,
  type ScenarioSchemaOutput,
  type ScenarioSeatRef,
} from "./definitions";

const playerIdSchema = markManifestScopedSchema(z.string(), "playerId");
const ordinaryStringSchema = z.string();
const nestedPlayerSchema = z.object({
  primary: playerIdSchema,
  optional: playerIdSchema.optional(),
  nullable: playerIdSchema.nullable(),
  group: z.array(playerIdSchema),
  tuple: z.tuple([z.literal("lead"), playerIdSchema]),
  recipient: z.union([playerIdSchema, z.literal("bank")]),
  ordinary: ordinaryStringSchema,
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
      setupProfilesById: { standard: { id: "standard" } },
    },
  },
  phases: {
    play: {
      interactions: {
        choose: {
          inputs: {
            selection: { kind: "form", schema: nestedPlayerSchema },
          },
        },
        label: {
          inputs: {
            value: { kind: "form", schema: ordinaryStringSchema },
          },
        },
      },
    },
  },
  views: {},
} as const;

const { defineScenario } = createScenarioAuthoring(game);

function validScenario() {
  return {
    id: "scenario.valid",
    description: "A self-contained scenario",
    setup: { players: 2, seed: 0, setupProfileId: "standard" },
    given: [
      {
        actor: { seat: 0 },
        interactionId: "choose",
        params: {
          selection: {
            primary: { seat: 1 },
            nullable: null,
            group: [{ seat: 0 }, { seat: 1 }],
            tuple: ["lead", { seat: 0 }],
            recipient: "bank",
            ordinary: "player-1-is-ordinary-data",
          },
        },
      },
    ],
    when: [],
    then: () => {},
  } as const;
}

function expectValidationError(
  load: () => unknown,
  options: {
    readonly code: ScenarioDefinitionValidationError["code"];
    readonly path: string;
  },
): void {
  try {
    load();
    throw new Error("Expected scenario definition validation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(ScenarioDefinitionValidationError);
    expect(error).toMatchObject(options);
  }
}

describe("createScenarioAuthoring", () => {
  test("accepts serializable self-contained commands and strips assertions from replay data", () => {
    const definition = defineScenario(validScenario());
    const replay = toScenarioReplayDefinition(definition);

    expect(replay).toEqual({
      id: "scenario.valid",
      description: "A self-contained scenario",
      setup: { players: 2, seed: 0, setupProfileId: "standard" },
      given: definition.given,
      when: [],
    });
    expect("then" in replay).toBe(false);
    expect(replay).not.toBe(definition);
    expect(replay.given).not.toBe(definition.given);
  });

  test("reports stable paths for setup validation", () => {
    expectValidationError(
      () =>
        defineScenario({
          ...validScenario(),
          setup: { players: 2, seed: Number.MAX_SAFE_INTEGER + 1 },
        }),
      { code: "UNSAFE_INTEGER", path: "scenario.setup.seed" },
    );
    expectValidationError(
      () =>
        defineScenario({
          ...validScenario(),
          setup: { players: 4, seed: 0 },
        }),
      { code: "OUT_OF_RANGE", path: "scenario.setup.players" },
    );
    expectValidationError(
      () =>
        defineScenario({
          ...validScenario(),
          setup: { players: 2, seed: 0, setupProfileId: "test-only" },
        }),
      {
        code: "UNKNOWN_SETUP_PROFILE",
        path: "scenario.setup.setupProfileId",
      },
    );
  });

  test("validates actor and semantic parameter seats against setup players", () => {
    const actorOutOfRange = validScenario();
    expectValidationError(
      () =>
        defineScenario({
          ...actorOutOfRange,
          given: [
            {
              ...actorOutOfRange.given[0],
              actor: { seat: 2 },
            },
          ],
        }),
      { code: "OUT_OF_RANGE", path: "scenario.given[0].actor.seat" },
    );

    const paramOutOfRange = validScenario();
    expectValidationError(
      () =>
        defineScenario({
          ...paramOutOfRange,
          given: [
            {
              ...paramOutOfRange.given[0],
              params: {
                selection: {
                  ...paramOutOfRange.given[0].params.selection,
                  primary: { seat: 2 },
                },
              },
            },
          ],
        }),
      {
        code: "OUT_OF_RANGE",
        path: "scenario.given[0].params.selection.primary.seat",
      },
    );
  });

  test("does not infer seat semantics from ordinary string fields", () => {
    expectValidationError(
      () =>
        defineScenario({
          ...validScenario(),
          given: [
            {
              actor: { seat: 0 },
              interactionId: "label",
              params: { value: { seat: 99 } },
            },
          ],
        } as never),
      {
        code: "INVALID_COMMAND_PARAMS",
        path: "scenario.given[0].params.value",
      },
    );
  });

  test("rejects non-serializable replay data and legacy scenario fields", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    for (const [value, path] of [
      [Number.NaN, "scenario.given[0].params.value"],
      [undefined, "scenario.given[0].params.value"],
      [() => {}, "scenario.given[0].params.value"],
      [Symbol("value"), "scenario.given[0].params.value"],
      [new Date(0), "scenario.given[0].params.value"],
      [cyclic, "scenario.given[0].params.value.self"],
    ] as const) {
      expectValidationError(
        () =>
          defineScenario({
            ...validScenario(),
            given: [
              {
                actor: { seat: 0 },
                interactionId: "label",
                params: { value },
              },
            ],
          } as never),
        { code: "NON_SERIALIZABLE", path },
      );
    }
    expectValidationError(
      () =>
        defineScenario({
          ...validScenario(),
          from: "legacy-base",
        } as never),
      { code: "UNKNOWN_FIELD", path: "scenario.from" },
    );
  });
});

describe("scenario authoring types", () => {
  test("recursively substitutes only semantic player-id schemas", () => {
    type Nested = ScenarioSchemaOutput<typeof nestedPlayerSchema>;
    const nested: Nested = {
      primary: { seat: 0 },
      nullable: null,
      group: [{ seat: 1 }],
      tuple: ["lead", { seat: 0 }],
      recipient: { seat: 1 },
      ordinary: "ordinary-string",
    };
    const command: ScenarioCommandOf<typeof game> = {
      actor: { seat: 0 },
      interactionId: "choose",
      params: { selection: nested },
    };

    expect(command.params).toEqual({ selection: nested });
  });

  test("keeps compile-time negative examples next to the public contract", () => {
    const assertNegativeTypes = () => {
      // @ts-expect-error semantic player ids are authored as seat refs.
      const wrongPlayer: ScenarioSchemaOutput<typeof playerIdSchema> =
        "player-1";
      // @ts-expect-error ordinary strings are not rewritten into seat refs.
      const wrongString: ScenarioSchemaOutput<typeof ordinaryStringSchema> = {
        seat: 0,
      };
      // @ts-expect-error actor identity is a seat ref, not a runtime player id.
      const wrongActor: ScenarioSeatRef = "player-1";
      expect([wrongPlayer, wrongString, wrongActor]).toBeDefined();
    };
    expect(typeof assertNegativeTypes).toBe("function");
    expect(true).toBe(true);
  });
});

describe("ScenarioReplayError", () => {
  test("preserves stable machine-readable rejection location", () => {
    const error = new ScenarioReplayError({
      scenarioId: "scenario.rejects",
      segment: "when",
      index: 2,
      interactionId: "choose",
      errorCode: "NOT_YOUR_TURN",
      reducerMessage: "Only the active player may act",
      trace: [],
    });

    expect(error).toMatchObject({
      name: "ScenarioReplayError",
      scenarioId: "scenario.rejects",
      segment: "when",
      index: 2,
      interactionId: "choose",
      errorCode: "NOT_YOUR_TURN",
      reducerMessage: "Only the active player may act",
      trace: [],
    });
  });
});
