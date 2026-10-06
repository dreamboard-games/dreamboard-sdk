import { testGameplayBasis } from "../../shared/__fixtures__/reference-basis.js";
import { createGame as createModel } from "../../reducer";

import { describe, expect, test } from "vitest";
import { z } from "zod";

import type { RuntimeTableRecord } from "../model";
import { compileManifest } from "../manifest/compiler";
import { asPlayerId } from "../per-player";
import { createIngressRuntimeCodec } from "./session-codec";

function buildMinimalManifest() {
  return compileManifest({
    players: { minPlayers: 2, maxPlayers: 2, optimalPlayers: 2 },
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        defaultHome: { type: "zone", zoneId: "draw" },
        cardSchema: z.object({ rank: z.number().int() }),
        cards: [
          {
            id: "card-1",
            name: "One",
            cardType: "card-1",
            count: 1,
            properties: { rank: 1 },
          },
          {
            id: "card-2",
            name: "Two",
            cardType: "card-2",
            count: 1,
            properties: { rank: 2 },
          },
        ],
      },
    ],
    zones: [
      {
        id: "draw",
        name: "Draw",
        scope: "shared",
        allowedCardSetIds: ["cards"],
        visibility: "public",
      },
      {
        id: "hand",
        name: "Hand",
        scope: "perPlayer",
        allowedCardSetIds: ["cards"],
        visibility: "ownerOnly",
      },
    ],
  });
}

function buildDefinition(
  options: {
    playState?: z.ZodType<{ actionCount: number }>;
  } = {},
) {
  const setupState = z.object({ selectedFirstPlayer: z.string().nullable() });
  const playState =
    options.playState ?? z.object({ actionCount: z.number().int() });
  const contract = createModel({
    manifest: buildMinimalManifest(),
    phases: { setup: setupState, play: playState },
    state: {
      public: z.object({ score: z.number().int() }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });

  return contract.assemble({
    view: () => ({}),
    initial: {
      public: () => ({ score: 0 }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "setup",
    phases: {
      setup: contract.phase("setup").define({
        kind: "player",
        initialState: () => ({ selectedFirstPlayer: null }),
      }),
      play: contract
        .phase("play")
        .define({ kind: "player", initialState: () => ({ actionCount: 0 }) }),
    },
  });
}

function rawCanonicalTable() {
  const players = [asPlayerId("player-1"), asPlayerId("player-2")];
  return {
    tiles: {},
    playerOrder: ["player-1", "player-2"],
    zones: {
      draw: { table: ["card-1"] },
      hand: Object.fromEntries(
        players.map((playerId) => [
          playerId,
          playerId === "player-1" ? ["card-2"] : [],
        ]),
      ),
    },

    cards: {
      "card-1": {
        id: "card-1",
        cardSetId: "cards",
        cardType: "card-1",
        properties: { rank: 1 },
      },
      "card-2": {
        id: "card-2",
        cardSetId: "cards",
        cardType: "card-2",
        properties: { rank: 2 },
      },
    },
    componentLocations: {
      "card-1": {
        type: "InZone",
        zoneId: "draw",
        hostId: "table",
        playedBy: null,
      },
      "card-2": {
        type: "InZone",
        zoneId: "hand",
        hostId: "player-1",
        playedBy: null,
      },
    },
    ownerOfCard: { "card-1": null, "card-2": "player-1" },
    visibility: {
      "card-1": { faceUp: true },
      "card-2": { faceUp: true },
    },
    resources: Object.fromEntries(players.map((id) => [id, {}])),
    pieces: {},
    boards: {},
    dice: {},
  } satisfies RuntimeTableRecord;
}

describe("ingress runtime codec", () => {
  test("rejects partial raw table compatibility shapes", () => {
    const definition = buildDefinition();
    const codec = createIngressRuntimeCodec(definition);

    expect(() =>
      codec.parseInitialTable(
        {
          playerOrder: ["player-1", "player-2"],
          decks: { draw: ["card-1"] },
        },
        ["player-1", "player-2"],
      ),
    ).toThrow(/zones/);
  });

  test("admits player records and rejects wrapper objects at initial wire ingress", () => {
    const codec = createIngressRuntimeCodec(buildDefinition());
    const table = rawCanonicalTable();
    const wire: unknown = JSON.parse(JSON.stringify(table));
    expect(codec.parseInitialTable(wire, table.playerOrder).table).toEqual(
      table,
    );
    const wrapper = {
      __perPlayer: true,
      entries: [
        ["player-1", []],
        ["player-2", []],
      ],
    };
    for (const invalid of [
      { ...table, resources: wrapper },
      { ...table, hands: { hand: wrapper } },
      { ...table, zones: { hand: wrapper } },
    ]) {
      expect(() =>
        codec.parseInitialTable(invalid, table.playerOrder),
      ).toThrow();
    }
  });

  test("parses and serializes sessions for heterogeneous phases", () => {
    const definition = buildDefinition();
    const codec = createIngressRuntimeCodec(definition);
    const initial = codec.parseInitialTable(rawCanonicalTable(), [
      "player-1",
      "player-2",
    ]);

    expect(initial.playerIds).toEqual(["player-1", "player-2"]);
    expect(initial.table.playerOrder).toEqual(["player-1", "player-2"]);

    const parsed = codec.parseState({
      domain: {
        table: rawCanonicalTable(),
        publicState: { score: 7 },
        privateState: { "player-1": {}, "player-2": {} },
        hiddenState: {},
        flow: {
          currentPhase: "play",
          turn: 3,
          round: 1,
          activePlayers: ["player-1"],
        },
        phase: { actionCount: 2 },
      },
      runtime: {
        events: [],
        rng: { seed: 42, cursor: 0, trace: [] },
        options: {},
        pending: {},
        simultaneous: { current: null },
        lastTransition: null,
      },
    });

    expect(parsed.domain.flow.currentPhase).toBe("play");
    expect(parsed.domain.phase).toEqual({ actionCount: 2 });
    expect(codec.serializeState(parsed)).toMatchObject({
      domain: {
        publicState: { score: 7 },
        phase: { actionCount: 2 },
      },
      runtime: {
        events: [],
        rng: { seed: 42, cursor: 0, trace: [] },
        pending: {},
        simultaneous: { current: null },
        lastTransition: null,
      },
    });
    expect(() =>
      codec.parseInput({
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "takeAction",
      }),
    ).toThrow(/params/);
    expect(() =>
      codec.parseInput({
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "",
        params: {},
      }),
    ).toThrow(/interactionId/);
    expect(() =>
      codec.parseInput({
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "takeAction",
        params: {},
        extra: true,
      }),
    ).toThrow(/Unrecognized key/);
    expect(
      codec.parseInput({
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "takeAction",
        params: {},
      }),
    ).toEqual({
      basis: testGameplayBasis("player-1"),
      kind: "interaction",
      playerId: "player-1",
      interactionId: "takeAction",
      params: {},
    });
  });

  test("serializes without metadata and validates restored state against current schemas", () => {
    const definition = buildDefinition();
    const codec = createIngressRuntimeCodec(definition);
    const parsed = codec.parseState({
      domain: {
        table: rawCanonicalTable(),
        publicState: { score: 7 },
        privateState: { "player-1": {}, "player-2": {} },
        hiddenState: {},
        flow: {
          currentPhase: "play",
          turn: 3,
          round: 1,
          activePlayers: ["player-1"],
        },
        phase: { actionCount: 2 },
      },
      runtime: {
        events: [],
        rng: { seed: 42, cursor: 0, trace: [] },
        options: {},
        pending: {},
        simultaneous: { current: null },
        lastTransition: null,
      },
    });
    const encoded = codec.serializeState(parsed);

    expect(encoded).not.toHaveProperty("meta");
    expect(codec.parseState(encoded).domain.phase).toEqual({ actionCount: 2 });

    const changedCodec = createIngressRuntimeCodec(
      buildDefinition({
        playState: z.object({
          actionCount: z.number().int(),
          optionalNote: z.string().optional(),
        }),
      }),
    );

    expect(changedCodec.parseState(encoded).domain.phase).toEqual({
      actionCount: 2,
    });
  });
});
