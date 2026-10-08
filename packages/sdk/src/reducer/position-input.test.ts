import { expect, test } from "vitest";
import { z } from "zod";
import { createGame } from "../reducer.js";
import { compileManifest } from "./manifest/compiler.js";
import { createGameInstance } from "../headless/instance.js";
import { localSource } from "../testing/sources/local-source.js";
import type { RuntimeJson } from "../shared/runtime-json.js";
import { asPlayerId } from "./per-player.js";

function reorderGame() {
  const model = createGame({
    manifest: compileManifest({
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({}),
          defaultHome: { type: "detached" },
          cards: (["a", "b", "c", "d", "e"] as const).map((id) => ({
            id,
            name: id,
            cardType: "card",
            count: 1,
            properties: {},
          })),
        },
      ],
      zones: [
        {
          id: "hand",
          name: "Hand",
          scope: "perPlayer",
          visibility: "ownerOnly",
        },
        { id: "pile", name: "Pile", scope: "shared", visibility: "hidden" },
      ],
    }),
    phases: { play: z.object({}) },
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  return model.assemble({
    initial: { public: () => ({}) },
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx, q }) {
          const [first] = q.player.order();
          tx.setActivePlayers([first]);
          for (const componentId of ["a", "b", "c", "d"] as const)
            tx.moveComponentToZone({
              componentId,
              to: { zoneId: "hand", hostId: first },
            });
          tx.moveComponentToZone({ componentId: "e", to: { zoneId: "pile" } });
        },
        interactions: {
          place: play.interaction({
            inputs: {
              cardId: play.inputs.card({ from: ["hand"] }),
              to: play.inputs.position({ zones: ["hand", "pile"] }),
            },
            reduce({ tx, input }) {
              tx.moveComponentToPosition({
                componentId: input.params.cardId,
                at: input.params.to,
              });
            },
          }),
        },
      }),
    },
    view: model.view(() => ({})),
  });
}

async function table() {
  const game = reorderGame();
  const source = await localSource(game, {
    players: 2,
    seed: 1,
    as: "player-1",
  });
  const instance = createGameInstance<typeof game>()({ source });
  return {
    source,
    instance,
    hand: () =>
      instance.zones
        .get("hand", asPlayerId("player-1"))
        .getCards()
        .map((card) => card.id),
    place: (cardId: string, index: number, zoneId = "hand") =>
      source.submit("place", {
        cardId,
        to: {
          zoneId,
          hostId: zoneId === "hand" ? "player-1" : "table",
          index,
        },
      }),
    dispose() {
      instance.dispose();
      source.dispose();
    },
  };
}

test("a position input offers each reachable zone host with its size", async () => {
  const current = await table();
  try {
    const input = current.instance.interactions
      .get("play.place")
      .getInputs()
      .find((value) => value.key === "to")!;
    expect(input.kind).toBe("position");
    // Another player's own hand is out of reach; a hidden shared pile is not.
    expect(input.getDomain()).toEqual({
      type: "zonePosition",
      zones: [
        { zoneId: "hand", hostId: "player-1", size: 4 },
        { zoneId: "pile", hostId: "table", size: 1 },
      ],
    });
  } finally {
    current.dispose();
  }
});

test("moving to a position lands between the cards it was between", async () => {
  const current = await table();
  try {
    expect(current.hand()).toEqual(["a", "b", "c", "d"]);
    // Later in the same zone: the card leaves its own place first.
    expect(await current.place("a", 3)).toEqual({ accepted: true });
    expect(current.hand()).toEqual(["b", "c", "a", "d"]);
    expect(await current.place("d", 0)).toEqual({ accepted: true });
    expect(current.hand()).toEqual(["d", "b", "c", "a"]);
    expect(await current.place("d", 4)).toEqual({ accepted: true });
    expect(current.hand()).toEqual(["b", "c", "a", "d"]);
    // Both points beside a card leave it where it is.
    for (const index of [1, 2]) {
      expect(await current.place("c", index)).toEqual({ accepted: true });
      expect(current.hand()).toEqual(["b", "c", "a", "d"]);
    }
    expect(await current.place("b", 0, "pile")).toEqual({ accepted: true });
    expect(current.hand()).toEqual(["c", "a", "d"]);
    expect(current.instance.zones.get("pile", "table").count).toBe(2);
  } finally {
    current.dispose();
  }
});

test("a position outside the zone or out of reach is rejected", async () => {
  const current = await table();
  try {
    expect(await current.place("a", 5)).toMatchObject({ accepted: false });
    expect(await current.place("a", 2, "pile")).toMatchObject({
      accepted: false,
    });
    expect(
      await current.source.submit("place", {
        cardId: "a",
        to: { zoneId: "hand", hostId: "player-2", index: 0 },
      }),
    ).toMatchObject({ accepted: false });
    const malformed: RuntimeJson[] = [
      { zoneId: "hand", hostId: "player-1", index: -1 },
      { zoneId: "hand", hostId: "player-1", index: 1.5 },
      { zoneId: "hand", hostId: "player-1", index: 0, extra: true },
    ];
    for (const to of malformed)
      expect(
        await current.source.submit("place", { cardId: "a", to }),
      ).toMatchObject({ accepted: false });
    expect(current.hand()).toEqual(["a", "b", "c", "d"]);
  } finally {
    current.dispose();
  }
});
