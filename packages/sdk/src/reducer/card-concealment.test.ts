import { compileManifest } from "./manifest/compiler.js";
import {
  testReferenceBasis,
  testGameplayBasis,
} from "../shared/__fixtures__/reference-basis.js";
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
    manifest: compileManifest({
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
    }),
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
              tx.moveComponentToZone({
                componentId: input.params.cardId,
                to: { zoneId: "table" },
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
    const deck = () => instance.zones.get("deck", "table").getCards();
    expect(deck().map((card) => [card.id, card.hidden])).toEqual([
      [expect.stringMatching(/^card-ref:sha256:/), true],
      [expect.stringMatching(/^card-ref:sha256:/), true],
    ]);
    const [top] = deck();
    expect(top.hidden && top.backImage).toBe("assets/back.webp");
    expect(JSON.stringify(source.inspect().frame.zones)).not.toMatch(
      /"(?:ace|king)"/,
    );

    // The seat picks the top card by position; it arrives face up.
    top.select({ interaction: "play.reveal" });
    await expect
      .poll(() => instance.zones.get("table", "table").getCards()[0]?.hidden)
      .toBe(false);
    const [revealed] = instance.zones.get("table", "table").getCards();
    const name = revealed.hidden ? null : revealed.view.id;
    expect(source.inspect().frame.zones.deck.table.cardViewsById).toEqual({});
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
      .poll(() => instance.zones.get("table", "table").getCards()[0]?.id)
      .toMatch(/^card-ref:sha256:/);
    source.switchSeat("player-2");
    expect(instance.zones.get("table", "table").getCards()[0]?.id).toMatch(
      /^card-ref:sha256:/,
    );
    source.switchSeat("player-1");
    instance.zones
      .get("table", "table")
      .getCards()[0]
      .select({ interaction: "play.flip" });
    await expect
      .poll(() => instance.zones.get("table", "table").getCards()[0]?.id)
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
      referenceBasis: testReferenceBasis,
      state: source.checkpoint().state,
      input: {
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "reveal",
        params: { cardId },
      },
    });
  expect(await reveal("ace")).toMatchObject({
    kind: "reject",
    errorCode: "COMPONENT_TARGET_NOT_ELIGIBLE",
  });
  expect(
    await reveal(
      bundle.project({
        state: source.checkpoint().state,
        playerIds: ["player-1"],
        referenceBasis: testReferenceBasis,
      }).seats["player-1"].zones!.deck.table.cardIds[1],
    ),
  ).toMatchObject({
    kind: "accept",
  });
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
      referenceBasis: testReferenceBasis,
      state: source.checkpoint().state,
      input: {
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "guess",
        params: { guess: value },
      },
    });
  expect(await guess("ace")).toMatchObject({ kind: "accept" });
  expect(await guess("card-ref:sha256:" + "0".repeat(64))).toMatchObject({
    kind: "reject",
  });

  // A step keeps showing the card it picked by position, and a form value as is.
  await source.apply({
    actor: { seat: 0 },
    interactionId: "pick",
    params: { cardId: "king" },
  });
  const pick = source
    .inspect()
    .frame.availableInteractions.find(
      (descriptor) => descriptor.interactionId === "pick",
    );
  expect(pick?.step?.selected?.cardId).toMatch(/^card-ref:sha256:/);
  expect(
    await source.apply({
      actor: { seat: 0 },
      interactionId: "pick",
      params: { guess: "ace" },
    }),
  ).toEqual({ accepted: true });
  source.dispose();
});

function cargoGame() {
  const model = createGame({
    manifest: compileManifest({
      players: { minPlayers: 2, maxPlayers: 2 },
      zones: [
        {
          id: "cargo",
          name: "Cargo",
          attachedTo: { pieceType: "ship" },
          visibility: "ownerOnly",
        },
      ],
      pieceTypes: [
        { id: "ship", name: "Ship" },
        { id: "crate", name: "Crate" },
      ],
      pieceSeeds: [
        { id: "vessel", typeId: "ship" },
        {
          id: "parcel",
          typeId: "crate",
          home: { type: "zone", zoneId: "cargo", component: "vessel" },
        },
      ],
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({}),
          defaultHome: { type: "zone", zoneId: "cargo", component: "vessel" },
          cards: [card("treasure")],
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
          tx.setComponentOwner({
            componentId: "vessel",
            ownerId: q.player.order()[0],
          });
          tx.setActivePlayers([]);
        },
        interactions: {
          selectCargo: play.interaction({
            inputs: { cardId: play.inputs.card({ from: ["cargo"] }) },
            reduce() {},
          }),
          transfer: play.interaction({
            inputs: {},
            reduce({ tx, q }) {
              tx.setComponentOwner({
                componentId: "vessel",
                ownerId: q.player.order()[1],
              });
            },
          }),
          abandon: play.interaction({
            inputs: {},
            reduce({ tx }) {
              tx.setComponentOwner({ componentId: "vessel", ownerId: null });
            },
          }),
          cover: play.interaction({
            inputs: {},
            reduce({ tx }) {
              tx.flipCard({ cardId: "treasure", faceUp: false });
            },
          }),
        },
      }),
    },
    view: model.view(() => ({})),
  });
}

test("attached cargo follows its host's current owner without granting card visibility", async () => {
  for (const faceDown of [false, true]) {
    const game = cargoGame();
    const source = await localSource(game, { players: 2, seed: 1 });
    const instance = createGameInstance<typeof game>()({ source });
    try {
      // Reducer cargo also contains a piece; the UI facade presents cards only.
      expect(source.checkpoint().state.domain).toMatchObject({
        table: { zones: { cargo: { vessel: ["treasure", "parcel"] } } },
      });
      expect(instance.zones.get("cargo", "vessel").count).toBe(1);
      expect(instance.zones.get("cargo", "vessel").getIsEmpty()).toBe(false);
      expect(source.inspect().frame.zones.cargo.vessel.cardIds).toEqual([
        "treasure",
      ]);
      source.switchSeat("player-2");
      expect(source.inspect().frame.zones.cargo).toBeUndefined();
      expect(
        JSON.stringify(source.inspect().frame.availableInteractions),
      ).not.toContain("treasure");
      if (faceDown)
        await source.apply({
          actor: { seat: 0 },
          interactionId: "cover",
          params: {},
        });
      expect(
        await source.apply({
          actor: { seat: 0 },
          interactionId: "transfer",
          params: {},
        }),
      ).toEqual({ accepted: true });
      const transferred = source.checkpoint();
      const cargo = source.inspect().frame.zones.cargo.vessel;
      expect(cargo.cardIds).toEqual([
        faceDown ? expect.stringMatching(/^card-ref:sha256:/) : "treasure",
      ]);
      expect(Object.keys(cargo.cardViewsById)).toEqual(
        faceDown ? [] : ["treasure"],
      );
      source.switchSeat("player-1");
      expect(source.inspect().frame.zones.cargo).toBeUndefined();
      expect(
        JSON.stringify(source.inspect().frame.availableInteractions),
      ).not.toContain("treasure");
      expect(
        await source.apply({
          actor: { seat: 0 },
          interactionId: "abandon",
          params: {},
        }),
      ).toEqual({ accepted: true });
      for (const player of ["player-1", "player-2"]) {
        source.switchSeat(player);
        expect(source.inspect().frame.zones.cargo).toBeUndefined();
        expect(
          JSON.stringify(source.inspect().frame.availableInteractions),
        ).not.toContain("treasure");
      }
      source.restore(transferred);
      source.switchSeat("player-1");
      expect(source.inspect().frame.zones.cargo).toBeUndefined();
      source.switchSeat("player-2");
      expect(source.inspect().frame.zones.cargo.vessel.cardIds).toEqual(
        faceDown ? [expect.stringMatching(/^card-ref:sha256:/)] : cargo.cardIds,
      );
      if (faceDown)
        expect(source.inspect().frame.zones.cargo.vessel.cardIds).not.toEqual(
          cargo.cardIds,
        );
    } finally {
      instance.dispose();
      source.dispose();
    }
  }
});

test("concealed detached cards and unknown cards cannot be targeted", async () => {
  const { concealCards } = await import("./bundle/trusted/card-concealment.js");
  const { createSeatDisclosure } =
    await import("./bundle/trusted/tile-disclosure.js");
  const { createInputTestState, inputDefinitions } =
    await import("./input-test-fixtures.js");
  const table = createInputTestState().table;
  const cardId = "card-a";
  table.componentLocations[cardId] = { type: "Detached" };
  table.visibility[cardId] = { faceUp: false };
  const disclosure = createSeatDisclosure(
    table,
    inputDefinitions,
    "player-1",
    testReferenceBasis,
  );
  const cards = concealCards(table, "player-1", disclosure);
  expect(cards.isHidden(cardId)).toBe(true);
  expect(cards.canTarget(cardId)).toBe(false);
  expect(cards.tableCardId(cardId)).toBeNull();
  expect(cards.canTarget("unknown-card")).toBe(false);
  expect(cards.tableCardId("unknown-card")).toBeNull();
});
