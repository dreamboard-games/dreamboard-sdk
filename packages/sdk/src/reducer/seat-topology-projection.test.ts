import { testReferenceBasis } from "../shared/__fixtures__/reference-basis.js";
import { RuntimeJsonSchema } from "../shared/runtime-json.js";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { compileManifest, createGame, createReducerBundle } from "../reducer";

describe("seat topology projection", () => {
  test("derives public topology only through the requested seat", async () => {
    const manifest = compileManifest({
      players: { minPlayers: 1, maxPlayers: 2 },
      cardSets: [],
      zones: [],
      boards: [
        {
          id: "island",
          name: "Island",
          layout: "generic",
          scope: "shared",
          spaces: [{ id: "home", name: "Home" }],
          relations: [],
        },
      ],
    } as const);
    const game = createGame({
      manifest,
      phases: { playing: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    let viewCalls = 0;
    const definition = game.assemble({
      phases: { playing: game.phase("playing").define({ kind: "player" }) },
      view: game.view(({ playerId }) => {
        viewCalls++;
        return { privateSeat: playerId };
      }),
    });
    const bundle = createReducerBundle(definition);
    const initialized = await bundle.initialize({
      table: RuntimeJsonSchema.parse(
        manifest.createInitialTable({ playerIds: ["player-1"] }),
      ),
      playerIds: ["player-1"],
      rngSeed: 1,
    });
    const projection = bundle.project({
      referenceBasis: testReferenceBasis,
      state: initialized.state,
      playerIds: ["player-1"],
    });
    expect(projection.seats["player-1"].boards).toMatchObject({
      island: {
        id: "island",
        baseId: "island",
        layout: "generic",
        spaces: { home: { id: "home", name: "Home", fields: {} } },
      },
    });
    expect(viewCalls).toBe(1);
    expect(projection.seats["player-1"].view).toEqual({
      privateSeat: "player-1",
    });
    expect(bundle).not.toHaveProperty("boardStatic");
  });
});
