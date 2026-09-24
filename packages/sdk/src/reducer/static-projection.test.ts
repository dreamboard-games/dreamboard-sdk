import { describe, expect, test } from "vitest";
import { z } from "zod";
import { compileManifest, createGame, createReducerBundle } from "../reducer";

describe("manifest static projection", () => {
  test("derives stable static boards from the manifest without evaluating a seat view", () => {
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
          containers: [],
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
    const first = bundle.boardStatic();
    const second = bundle.boardStatic();
    expect(first?.view).toEqual({ boards: manifest.staticBoards });
    expect(first?.hash).toBe(second?.hash);
    expect(first?.hash).toMatch(/^[0-9a-f]+$/);
    expect(typeof first?.manifestVersion).toBe("string");
    expect(viewCalls).toBe(0);
    expect(JSON.stringify(first)).not.toContain("privateSeat");
  });
});
