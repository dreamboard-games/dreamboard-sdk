import { describe, expect, it } from "vitest";
import * as z from "zod";
import { createGame, createReducerBundle } from "../reducer.js";
import { RuntimeJsonSchema } from "../shared/runtime-json.js";
import { EventAudienceSchema } from "../shared/runtime-schema.js";
import { asPlayerId } from "./per-player.js";
import type { GameEvent } from "../shared/domain/results.js";
const north = asPlayerId("north");
const south = asPlayerId("south");
const referenceBasis = { sessionId: "event-admission", version: 1 };
const inputBasis = {
  ...referenceBasis,
  perspectivePlayerId: north,
  actionSetVersion: "events",
};
const event = (playerIds: string[], tileId?: string): GameEvent => ({
  kind: "systemAction",
  procedureId: "event",
  title: "Event",
  audience: { kind: "seats", playerIds },
  details: [
    {
      label: "Detail",
      value: tileId === undefined ? "missing-tile" : { kind: "tile", tileId },
    },
  ],
});
async function fixture(emitted: GameEvent, enter = false) {
  const model = createGame({
    manifest: {
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [],
      tileTypes: [
        {
          id: "face",
          name: "Face",
          layout: "hex",
          cells: [{ id: "cell", at: { q: 0, r: 0 } }],
        },
      ],
      tileSeeds: [{ id: "tile", typeId: "face" }],
    },
    phases: { play: z.object({}) },
    state: {
      public: z.object({ count: z.int().default(0) }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  const definition = model.assemble({
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx }) {
          tx.setActivePlayers([north]);
          if (enter) tx.emit(emitted);
        },
        interactions: {
          publish: play.interaction({
            inputs: {},
            reduce({ tx }) {
              tx.patchPublicState({ count: 1 });
              tx.emit(emitted);
            },
          }),
        },
      }),
    },
    view: model.view(() => ({})),
  });
  const bundle = createReducerBundle(definition);
  const initialized = await bundle.initialize({
    table: RuntimeJsonSchema.parse(
      model.contract.manifest.createInitialTable({ playerIds: [north, south] }),
    ),
    playerIds: [north, south],
    rngSeed: 1,
  });
  return { bundle, initialized };
}
describe("event session reference admission", () => {
  it("requires nonempty unique seat audiences", () => {
    expect(
      EventAudienceSchema.safeParse({ kind: "seats", playerIds: [] }).success,
    ).toBe(false);
    expect(
      EventAudienceSchema.safeParse({
        kind: "seats",
        playerIds: [north, north],
      }).success,
    ).toBe(false);
    expect(
      EventAudienceSchema.safeParse({
        kind: "seats",
        playerIds: [north, south],
      }).success,
    ).toBe(true);
  });
  it.each([event(["outsider"]), event([north], "missing-tile")])(
    "rejects invalid authored references before accepting a reducer result",
    async (emitted) => {
      const { bundle, initialized } = await fixture(emitted);
      const before = structuredClone(initialized.state);
      await expect(
        bundle.dispatch({
          state: initialized.state,
          referenceBasis,
          input: {
            kind: "interaction",
            interactionId: "publish",
            playerId: north,
            params: {},
            basis: inputBasis,
          },
        }),
      ).rejects.toThrow(/unknown session player|unknown tile/);
      expect(initialized.state).toEqual(before);
    },
  );
  it.each([event(["outsider"]), event([north], "missing-tile")])(
    "rejects invalid authored references at initialization",
    async (emitted) => {
      await expect(fixture(emitted, true)).rejects.toThrow(
        /unknown session player|unknown tile/,
      );
    },
  );
  it.each([event(["outsider"]), event([north], "missing-tile")])(
    "rejects invalid restored references before projecting or dispatching",
    async (invalid) => {
      const { bundle, initialized } = await fixture(event([north]));
      const restored = structuredClone(initialized.state);
      restored.runtime.events = [
        structuredClone({
          ...invalid,
          details: invalid.details?.map((detail) => ({ ...detail })),
        }),
      ];
      expect(() =>
        bundle.project({ state: restored, playerIds: [north], referenceBasis }),
      ).toThrow(/unknown session player|unknown tile/);
      await expect(
        bundle.dispatch({
          state: restored,
          referenceBasis,
          input: {
            kind: "interaction",
            interactionId: "publish",
            playerId: north,
            params: {},
            basis: inputBasis,
          },
        }),
      ).rejects.toThrow(/unknown session player|unknown tile/);
    },
  );
  it("accepts existing omitted tile details and treats arbitrary text as explicit publication", async () => {
    for (const emitted of [event([north], "tile"), event([north])]) {
      const { bundle, initialized } = await fixture(emitted);
      const result = await bundle.dispatch({
        state: initialized.state,
        referenceBasis,
        input: {
          kind: "interaction",
          interactionId: "publish",
          playerId: north,
          params: {},
          basis: inputBasis,
        },
      });
      if (result.kind !== "accept") throw new Error("Expected accepted event");
      const projected = bundle.project({
        state: result.state,
        playerIds: [north, south],
        referenceBasis: { ...referenceBasis, version: 2 },
      });
      expect(projected.seats[south].events).toEqual([]);
      expect(projected.seats[north].events).toHaveLength(1);
      expect(projected.seats[north].events[0].details).toEqual(
        emitted.details?.[0].value === "missing-tile"
          ? [{ label: "Detail", value: "missing-tile" }]
          : undefined,
      );
    }
  });
});
