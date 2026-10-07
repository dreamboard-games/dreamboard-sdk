import { expect, test } from "vitest";
import { z } from "zod";
import { createGame } from "../reducer.js";
import { compileManifest } from "./manifest/compiler.js";
import { createReducerBundle } from "./bundle/create-reducer-bundle.js";
import { localSource } from "../testing/sources/local-source.js";
import { perPlayerInstanceId } from "../shared/domain/per-player-instance.js";
import {
  testReferenceBasis,
  testGameplayBasis,
} from "../shared/__fixtures__/reference-basis.js";

function accessGame() {
  const model = createGame({
    manifest: compileManifest({
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({}),
          defaultHome: { type: "detached" },
          cards: (
            [
              "shared",
              "own",
              "public",
              "facedown",
              "private",
              "hidden",
              "attached",
            ] as const
          ).map((id) => ({
            id,
            name: id,
            cardType: "card",
            count: 1,
            properties: {},
            backImage: "assets/back.webp",
          })),
        },
      ],
      boards: [
        {
          id: "mat",
          name: "Mat",
          layout: "generic",
          scope: "perPlayer",
          spaces: [{ id: "cell" }],
        },
      ],
      zones: [
        { id: "shared", name: "Shared", scope: "shared", visibility: "public" },
        {
          id: "public",
          name: "Public",
          scope: "perPlayer",
          visibility: "public",
        },
        {
          id: "private",
          name: "Private",
          scope: "perPlayer",
          visibility: "ownerOnly",
        },
        {
          id: "hidden",
          name: "Hidden",
          scope: "perPlayer",
          visibility: "hidden",
        },
        {
          id: "attached",
          name: "Attached",
          attachedTo: { board: "mat" },
          visibility: "public",
        },
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
          const [first, second] = q.player.order();
          tx.setActivePlayers([first]);
          tx.moveComponentToZone({
            componentId: "shared",
            to: { zoneId: "shared" },
          });
          tx.moveComponentToZone({
            componentId: "own",
            to: { zoneId: "private", hostId: first },
          });
          tx.moveComponentToZone({
            componentId: "public",
            to: { zoneId: "public", hostId: second },
          });
          tx.moveComponentToZone({
            componentId: "facedown",
            to: { zoneId: "public", hostId: second },
          });
          tx.moveComponentToZone({
            componentId: "private",
            to: { zoneId: "private", hostId: second },
          });
          tx.moveComponentToZone({
            componentId: "hidden",
            to: { zoneId: "hidden", hostId: second },
          });
          tx.moveComponentToZone({
            componentId: "attached",
            to: {
              zoneId: "attached",
              hostId: perPlayerInstanceId("board", "mat", second),
            },
          });
          tx.flipCard({ cardId: "facedown", faceUp: false });
        },
        interactions: {
          pick: play.interaction({
            inputs: {
              cardId: play.inputs.card({
                from: ["shared", "public", "private", "hidden", "attached"],
              }),
            },
            reduce() {},
          }),
        },
      }),
    },
    view: model.view(() => ({})),
  });
}

test("card collectors admit accessible hosts and project concealed opponent cards by reference", async () => {
  const game = accessGame();
  const source = await localSource(game, { players: 2, seed: 1 });
  try {
    const bundle = createReducerBundle(game);
    const state = source.checkpoint().state;
    const projection = bundle.project({
      state,
      playerIds: ["player-1"],
      referenceBasis: testReferenceBasis,
    });
    const seat = projection.seats["player-1"];
    const domain = Object.values(projection.interactionsByRef!).find(
      (value) => value.interactionId === "pick" && value.actorSeat === 0,
    )?.inputs[0].domain;
    const reference = seat.zones!.public["player-2"].cardIds[1];
    expect(reference).toMatch(/^card-ref:sha256:/);
    expect(domain).toMatchObject({
      eligibleTargets: ["shared", "public", reference, "own", "attached"],
    });
    expect(JSON.stringify(domain)).not.toContain("facedown");
    const dispatch = (cardId: string) =>
      bundle.dispatch({
        referenceBasis: testReferenceBasis,
        state,
        input: {
          basis: testGameplayBasis("player-1"),
          kind: "interaction",
          playerId: "player-1",
          interactionId: "pick",
          params: { cardId },
        },
      });
    for (const id of ["shared", "own", "public", "attached", reference]) {
      expect(await dispatch(id)).toMatchObject({ kind: "accept" });
    }
    for (const id of ["private", "hidden", "facedown"]) {
      expect(await dispatch(id)).toMatchObject({ kind: "reject" });
    }
  } finally {
    source.dispose();
  }
});
