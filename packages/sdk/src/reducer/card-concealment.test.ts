import { expect, test } from "vitest";
import * as z from "zod";
import { createGame } from "../reducer.js";
import { createReducerBundle } from "./bundle/create-reducer-bundle.js";
import { createGameInstance } from "../headless/instance.js";
import { localSource } from "../testing/sources/local-source.js";

const card = (id: string) => ({
  id,
  cardType: "cards",
  name: id,
  count: 1,
  properties: {},
  frontImage: `assets/${id}.webp`,
  backImage: "assets/back.webp",
});

function faceDownGame() {
  const model = createGame({
    manifest: {
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({ note: z.string().optional() }),
          defaultHome: { type: "zone", zoneId: "deck" },
          cards: [card("ace"), card("king")],
        },
      ],
      zones: [
        { id: "deck", name: "Deck", scope: "shared", visibility: "hidden" },
        { id: "table", name: "Table", scope: "shared", visibility: "public" },
      ],
    },
    phases: { play: z.object({}) },
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  const ace = () =>
    play.inputs.form.choice({
      choices: [{ value: "ace", label: "Ace" }],
      defaultValue: () => undefined,
    });
  return model.assemble({
    initial: { public: () => ({}) },
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx, q }) {
          tx.setActivePlayers([q.player.order()[0]]);
        },
        interactions: {
          reveal: play.interaction({
            inputs: { cardId: play.inputs.card({ from: ["deck"] }) },
            reduce({ tx, input }) {
              tx.moveCardBetweenSharedZones({
                fromZoneId: "deck",
                toZoneId: "table",
                cardId: input.params.cardId,
              });
            },
          }),
          // A form value may match a card id; it never names a card.
          guess: play.interaction({
            inputs: { guess: ace() },
            reduce() {},
          }),
          pick: play.interaction({
            steps: play
              .steps()
              .input("cardId", play.inputs.card({ from: ["deck"] }))
              .input("guess", ace()),
            reduce() {},
          }),
          flip: play.interaction({
            inputs: { cardId: play.inputs.card({ from: ["table"] }) },
            reduce({ tx, input, q }) {
              tx.flipCard({
                cardId: input.params.cardId,
                faceUp: !q.card.visibility(input.params.cardId)?.faceUp,
              });
            },
          }),
        },
      }),
    },
    view: model.view(() => ({})),
  });
}

test("seats see hidden and face-down cards only by position and their backs", async () => {
  const game = faceDownGame();
  const source = await localSource(game, { players: 2, seed: 1 });
  const instance = createGameInstance<typeof game>()({ source });
  try {
    const deck = () => instance.zones.get("deck").getCards();
    expect(deck().map((card) => [card.id, card.hidden])).toEqual([
      ["hidden:deck:0", true],
      ["hidden:deck:1", true],
    ]);
    const [top] = deck();
    expect(top.hidden && top.backImage).toBe("assets/back.webp");
    expect(JSON.stringify(source.inspect().frame.zones)).not.toMatch(
      /ace|king/,
    );

    // The seat picks the top card by position; it arrives face up.
    top.select({ interaction: "play.reveal" });
    await expect
      .poll(() => instance.zones.get("table").getCards()[0]?.hidden)
      .toBe(false);
    const [revealed] = instance.zones.get("table").getCards();
    const name = revealed.hidden ? null : revealed.view.id;
    expect(source.inspect().frame.zones.deck.cardViewsById).toEqual({});
    expect(revealed.view).toMatchObject({
      id: name,
      cardType: "cards",
      properties: {},
    });
    expect(revealed.view?.properties).not.toHaveProperty("note");
    expect(["ace", "king"]).toContain(name);

    // Face down, neither seat sees it; the next flip turns it back up.
    revealed.select({ interaction: "play.flip" });
    await expect
      .poll(() => instance.zones.get("table").getCards()[0]?.id)
      .toBe("hidden:table:0");
    source.switchSeat("player-2");
    expect(instance.zones.get("table").getCards()[0]?.id).toBe(
      "hidden:table:0",
    );
    source.switchSeat("player-1");
    instance.zones
      .get("table")
      .getCards()[0]
      .select({ interaction: "play.flip" });
    await expect
      .poll(() => instance.zones.get("table").getCards()[0]?.id)
      .toBe(name);
  } finally {
    instance.dispose();
    source.dispose();
  }
});

test("a seat cannot name a card hidden from it by its id", async () => {
  const game = faceDownGame();
  const source = await localSource(game, { players: 2, seed: 1 });
  const bundle = createReducerBundle(game);
  const reveal = (cardId: string) =>
    bundle.dispatch({
      state: source.checkpoint().state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "reveal",
        params: { cardId },
      },
    });
  expect(await reveal("ace")).toMatchObject({
    kind: "reject",
    errorCode: "CARD_TARGET_NOT_ELIGIBLE",
  });
  expect(await reveal("hidden:deck:1")).toMatchObject({ kind: "accept" });
  // Tests know the table and may still name the card itself.
  expect(
    await source.apply({
      actor: { seat: 0 },
      interactionId: "reveal",
      params: { cardId: "ace" },
    }),
  ).toEqual({ accepted: true });
  source.dispose();
});

test("only card inputs name cards by position", async () => {
  const game = faceDownGame();
  const source = await localSource(game, { players: 2, seed: 1 });
  const bundle = createReducerBundle(game);
  const guess = (value: string) =>
    bundle.dispatch({
      state: source.checkpoint().state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "guess",
        params: { guess: value },
      },
    });
  expect(await guess("ace")).toMatchObject({ kind: "accept" });
  expect(await guess("hidden:deck:0")).toMatchObject({ kind: "reject" });

  // A step keeps showing the card it picked by position, and a form value as is.
  await source.apply({
    actor: { seat: 0 },
    interactionId: "pick",
    params: { cardId: "hidden:deck:1" },
  });
  const pick = source
    .inspect()
    .frame.availableInteractions.find(
      (descriptor) => descriptor.interactionId === "pick",
    );
  expect(pick?.step?.selected).toEqual({ cardId: "hidden:deck:1" });
  expect(
    await source.apply({
      actor: { seat: 0 },
      interactionId: "pick",
      params: { guess: "ace" },
    }),
  ).toEqual({ accepted: true });
  source.dispose();
});
