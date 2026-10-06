import { compileManifest } from "../../reducer/manifest/compiler.js";
import { expect, test } from "vitest";
import { z } from "zod";
import { createGame } from "../../reducer.js";
import { localSource } from "./local-source.js";

function game() {
  const model = createGame({
    manifest: compileManifest({
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({}),
          defaultHome: { type: "zone", zoneId: "bag" },
          cards: [
            {
              id: "card",
              name: "Card",
              cardType: "cards",
              count: 1,
              properties: {},
            },
          ],
        },
      ],
      zones: [
        { id: "bag", name: "Bag", scope: "shared", visibility: "hidden" },
      ],
      tileTypes: [
        {
          id: "terrain",
          name: "Terrain",
          layout: "hex",
          cells: [{ id: "cell", at: { q: 0, r: 0 } }],
        },
      ],
      tileSeeds: [
        {
          id: "tile",
          typeId: "terrain",
          home: { type: "zone", zoneId: "bag" },
          disclosure: {
            face: { audience: "none" },
            appearance: { layout: "hex", cells: [{ q: 0, r: 0 }] },
          },
        },
      ],
    }),
    phases: { play: z.object({}) },
    state: {
      public: z.object({ count: z.number() }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  return model.assemble({
    initial: { public: () => ({ count: 0 }) },
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx, q }) {
          tx.setActivePlayers([q.player.order()[0]]);
        },
        interactions: {
          tile: play.interaction({
            inputs: { chosen: play.inputs.tile({ from: ["bag"] }) },
            reduce({ tx, state }) {
              tx.patchPublicState({ count: state.publicState.count + 1 });
            },
          }),
          card: play.interaction({
            inputs: { chosen: play.inputs.card({ from: ["bag"] }) },
            reduce({ tx, state }) {
              tx.patchPublicState({ count: state.publicState.count + 1 });
            },
          }),
        },
      }),
    },
    view: model.view(({ state }) => ({ count: state.publicState.count })),
  });
}

test("client submissions reject authority IDs and stale refs while authored apply remains explicit", async () => {
  const definition = game();
  const source = await localSource(definition, { players: 2, seed: 1 });
  const other = await localSource(definition, { players: 2, seed: 1 });
  try {
    const checkpoint = source.checkpoint();
    const oldTile = source.inspect().frame.zones.bag.table.tiles[0].ref;
    const oldCard = source.inspect().frame.zones.bag.table.cardIds[0];
    expect(await source.submit("tile", { chosen: "tile" })).toMatchObject({
      accepted: false,
    });
    expect(await source.submit("card", { chosen: "card" })).toMatchObject({
      accepted: false,
    });
    expect(await other.submit("tile", { chosen: oldTile })).toMatchObject({
      accepted: false,
    });
    expect(source.checkpoint()).toEqual(checkpoint);
    source.restore(checkpoint);
    expect(source.inspect().frame.zones.bag.table.tiles[0].ref).not.toBe(
      oldTile,
    );
    expect(source.inspect().frame.zones.bag.table.cardIds[0]).not.toBe(oldCard);
    expect(await source.submit("tile", { chosen: oldTile })).toMatchObject({
      accepted: false,
    });
    expect(await source.submit("card", { chosen: oldCard })).toMatchObject({
      accepted: false,
    });
    expect(
      await source.apply({
        actor: { seat: 0 },
        interactionId: "tile",
        params: { chosen: "tile" },
      }),
    ).toEqual({ accepted: true });
    expect(
      await source.apply({
        actor: { seat: 0 },
        interactionId: "card",
        params: { chosen: "card" },
      }),
    ).toEqual({ accepted: true });
    expect(source.checkpoint().state.domain.publicState).toEqual({ count: 2 });
  } finally {
    source.dispose();
    other.dispose();
  }
});

test("authored scenario validation accepts authoritative tile commands", async () => {
  const { validateScenarioDefinition } =
    await import("../scenario-definition-validation.js");
  const definition = game();
  expect(() =>
    validateScenarioDefinition(definition, {
      id: "author-tile",
      setup: { players: 2, seed: 1 },
      given: [],
      when: [
        {
          actor: { seat: 0 },
          interactionId: "tile",
          params: { chosen: "tile" },
        },
      ],
      then: () => {},
    }),
  ).not.toThrow();
});
