import { compileManifest } from "../reducer/manifest/compiler.js";
import { createGame } from "../reducer.js";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { markManifestScopedSchema } from "../reducer/model/manifest";
import {
  projectScenarioCommandParams,
  resolveScenarioCommandParams,
  ScenarioCommandParamsError,
} from "./scenario-player-refs";
import {
  projectScenarioSeatReferences,
  resolveScenarioSeatReferences,
  ScenarioSchemaValueError,
} from "./scenario-schema";

const playerIdSchema = markManifestScopedSchema(z.string(), "playerId");
const playerIds = ["runtime-player-a", "runtime-player-b"] as const;

const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
  }),
  options: z.object({}),
  phases: { work: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const work = model.phase("work");

describe("scenario semantic player references", () => {
  test("projects and resolves only contract-marked player leaves", () => {
    const schema = z.object({
      target: playerIdSchema,
      label: z.string(),
      nested: z.array(z.object({ owner: playerIdSchema.nullable() })),
    });
    const runtimeValue = {
      target: "runtime-player-b",
      label: "runtime-player-a",
      nested: [{ owner: "runtime-player-a" }, { owner: null }],
    };

    const projected = projectScenarioSeatReferences({
      schema,
      value: runtimeValue,
      playerIds,
      path: "command.params",
    });
    expect(projected).toEqual({
      target: { seat: 1 },
      label: "runtime-player-a",
      nested: [{ owner: { seat: 0 } }, { owner: null }],
    });
    expect(
      resolveScenarioSeatReferences({
        schema,
        value: projected,
        playerIds,
        path: "command.params",
      }),
    ).toEqual(runtimeValue);
  });

  test("reports a stable path when a runtime id has no scenario seat", () => {
    expect(() =>
      projectScenarioSeatReferences({
        schema: z.object({ target: playerIdSchema }),
        value: { target: "unknown-player" },
        playerIds,
        path: "command.params",
      }),
    ).toThrow(ScenarioSchemaValueError);
    try {
      projectScenarioSeatReferences({
        schema: z.object({ target: playerIdSchema }),
        value: { target: "unknown-player" },
        playerIds,
        path: "command.params",
      });
    } catch (error) {
      expect(error).toMatchObject({ path: "command.params.target" });
    }
  });

  test("projects runtime command params into the same authored command schema", () => {
    const game = model.assemble({
      initialPhase: "work",
      phases: {
        work: work.define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            assign: work.interaction({
              inputs: {
                target: { kind: "form", schema: playerIdSchema },
                label: { kind: "form", schema: z.string() },
              },
              reduce() {},
            }),
          },
        }),
      },
      view: model.view(() => ({})),
    });
    const projected = projectScenarioCommandParams({
      game,
      phase: "work",
      interactionId: "assign",
      params: {
        target: "runtime-player-b",
        label: "runtime-player-a",
      },
      playerIds,
      path: "scenario.given[0]",
    });
    expect(projected).toEqual({
      target: { seat: 1 },
      label: "runtime-player-a",
    });
    expect(
      resolveScenarioCommandParams({
        game,
        phase: "work",
        interactionId: "assign",
        params: projected,
        playerIds,
        path: "scenario.given[0]",
      }),
    ).toEqual({
      target: "runtime-player-b",
      label: "runtime-player-a",
    });
  });

  test("does not expose an unassigned runtime player id through command projection", () => {
    const game = model.assemble({
      initialPhase: "work",
      phases: {
        work: work.define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            assign: work.interaction({
              inputs: {
                target: { kind: "form", schema: playerIdSchema },
              },
              reduce() {},
            }),
          },
        }),
      },
      view: model.view(() => ({})),
    });
    expect(() =>
      projectScenarioCommandParams({
        game,
        phase: "work",
        interactionId: "assign",
        params: { target: "unknown-player" },
        playerIds,
        path: "scenario.when[2]",
      }),
    ).toThrow(ScenarioCommandParamsError);
  });
});
