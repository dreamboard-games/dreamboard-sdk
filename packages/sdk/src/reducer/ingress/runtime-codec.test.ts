import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { defineGame, defineGameContract, definePhase } from "../authoring";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../model";
import { asPlayerId, perPlayer } from "../per-player";
import {
  createIngressRuntimeCodec,
  runtimePayloadSchema,
  safeParseOrThrow,
} from "./runtime-codec";
import { StaleContractArtifactError } from "../stale-contract-artifact-error";
import type { TrustedRuntimeInput } from "../core/types";
import {
  createIngressRuntimeCodec as createInputCodec,
  runtimePayloadSchema as inputPayloadSchema,
} from "./decode-runtime-input";
import {
  createIngressRuntimeCodec as createSessionDecoder,
  runtimePayloadSchema as sessionPayloadSchema,
} from "./decode-session-state";
import { createIngressRuntimeCodec as createSessionEncoder } from "./encode-session-state";

function buildMinimalManifest<const PhaseNames extends readonly string[]>(
  phaseNames: PhaseNames,
) {
  const playerIds = ["player-1", "player-2"] as const;
  return {
    literals: {
      playerIds,
      phaseNames,
      setupOptionIds: [] as const,
      setupProfileIds: [] as const,
      cardSetIds: [] as const,
      cardTypes: [] as const,
      deckIds: ["draw"] as const,
      handIds: ["hand"] as const,
      sharedZoneIds: ["draw"] as const,
      playerZoneIds: ["hand"] as const,
      zoneIds: ["draw", "hand"] as const,
      cardIds: ["card-1", "card-2"] as const,
      resourceIds: [] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: [] as const,
      dieIds: [] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      boardContainerIds: [] as const,
      tileIds: [] as const,
      tileTypeIds: [] as const,
      edgeIds: [] as const,
      edgeTypeIds: [] as const,
      vertexIds: [] as const,
      vertexTypeIds: [] as const,
      portIds: [] as const,
      portTypeIds: [] as const,
      spaceIds: [] as const,
      spaceTypeIds: [] as const,
      handVisibilityById: { hand: "ownerOnly" },
      zoneVisibilityById: { draw: "public", hand: "ownerOnly" },
      cardSetIdByCardId: {},
      cardTypeByCardId: {},
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {},
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: createManifestStringLiteralSchema(phaseNames),
      setupOptionId: createManifestStringLiteralSchema([] as const),
      setupProfileId: createManifestStringLiteralSchema([] as const),
      cardSetId: createManifestStringLiteralSchema([] as const),
      cardType: createManifestStringLiteralSchema([] as const),
      cardId: createManifestStringLiteralSchema(["card-1", "card-2"] as const),
      deckId: createManifestStringLiteralSchema(["draw"] as const),
      handId: createManifestStringLiteralSchema(["hand"] as const),
      sharedZoneId: createManifestStringLiteralSchema(["draw"] as const),
      playerZoneId: createManifestStringLiteralSchema(["hand"] as const),
      zoneId: createManifestStringLiteralSchema(["draw", "hand"] as const),
      resourceId: createManifestStringLiteralSchema([] as const),
      dieTypeId: createManifestStringLiteralSchema([] as const),
      dieId: createManifestStringLiteralSchema([] as const),
      boardBaseId: createManifestStringLiteralSchema([] as const),
      boardId: createManifestStringLiteralSchema([] as const),
      boardContainerId: createManifestStringLiteralSchema([] as const),
      boardTypeId: createManifestStringLiteralSchema([] as const),
      tileId: createManifestStringLiteralSchema([] as const),
      tileTypeId: createManifestStringLiteralSchema([] as const),
      edgeId: createManifestStringLiteralSchema([] as const),
      edgeTypeId: createManifestStringLiteralSchema([] as const),
      vertexId: createManifestStringLiteralSchema([] as const),
      vertexTypeId: createManifestStringLiteralSchema([] as const),
      portId: createManifestStringLiteralSchema([] as const),
      portTypeId: createManifestStringLiteralSchema([] as const),
      spaceId: createManifestStringLiteralSchema([] as const),
      spaceTypeId: createManifestStringLiteralSchema([] as const),
      pieceId: createManifestStringLiteralSchema([] as const),
      pieceTypeId: createManifestStringLiteralSchema([] as const),
      relationTypeId: createManifestStringLiteralSchema([] as const),
    },
    defaults: {
      zones: () => ({
        shared: { draw: [] },
        perPlayer: {
          hand: perPlayer(
            playerIds.map((playerId) => asPlayerId(playerId)),
            () => [],
          ),
        },
        visibility: { draw: "public", hand: "ownerOnly" },
        cardSetIdsByZoneId: {},
      }),
      decks: () => ({ draw: [] }),
      hands: () => ({
        hand: perPlayer(
          playerIds.map((playerId) => asPlayerId(playerId)),
          () => [],
        ),
      }),
      handVisibility: () => ({ hand: "ownerOnly" }),
      ownerOfCard: () => ({ "card-1": null, "card-2": null }),
      visibility: () => ({
        "card-1": { faceUp: true },
        "card-2": { faceUp: true },
      }),
      resources: () =>
        perPlayer(
          playerIds.map((playerId) => asPlayerId(playerId)),
          () => ({}),
        ),
    },
    setupOptionsById: {},
    setupChoiceIdsByOptionId: {},
    setupProfilesById: {},
    tableSchema: z
      .object({
        playerOrder: z.array(z.string()),
        zones: z.object({
          shared: z.record(z.string(), z.array(z.string())),
          perPlayer: z.record(z.string(), z.custom()),
          visibility: z.record(z.string(), z.string()),
          cardSetIdsByZoneId: z.record(z.string(), z.array(z.string())),
        }),
        decks: z.record(z.string(), z.array(z.string())),
        hands: z.record(z.string(), z.custom()),
        handVisibility: z.record(z.string(), z.string()),
        cards: z.record(z.string(), z.object({}).passthrough()),
        pieces: z.record(z.string(), z.object({}).passthrough()),
        componentLocations: z.record(z.string(), z.object({}).passthrough()),
        ownerOfCard: z.record(z.string(), z.string().nullable()),
        visibility: z.record(z.string(), z.object({}).passthrough()),
        resources: z.custom(),
        boards: z.object({
          byId: z.record(z.string(), z.object({}).passthrough()),
        }),
        dice: z.record(z.string(), z.object({}).passthrough()),
      })
      .strict() as unknown as z.ZodType<RuntimeTableRecord>,
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  } as const;
}

function buildDefinition(
  options: {
    playState?: z.ZodTypeAny;
  } = {},
) {
  const contract = defineGameContract({
    manifest: buildMinimalManifest(["setup", "play"] as const),
    phases: { setup: z.object({}), play: z.object({}) },
    state: {
      public: z.object({ score: z.number().int() }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const setupState = z.object({ selectedFirstPlayer: z.string().nullable() });
  const playState =
    options.playState ?? z.object({ actionCount: z.number().int() });

  return defineGame({
    contract,
    initial: {
      public: () => ({ score: 0 }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "setup",
    phases: {
      setup: definePhase<typeof contract>()({
        kind: "player",
        state: setupState,
        initialState: () => ({ selectedFirstPlayer: null }),
      }),
      play: definePhase<typeof contract>()({
        kind: "player",
        state: playState,
        initialState: () => ({ actionCount: 0 }),
      }),
    },
  });
}

function rawCanonicalTable() {
  const players = [asPlayerId("player-1"), asPlayerId("player-2")];
  return {
    playerOrder: ["player-1", "player-2"],
    zones: {
      shared: { draw: [] },
      perPlayer: {
        hand: perPlayer(players, (playerId) =>
          playerId === "player-1" ? ["card-2"] : [],
        ),
      },
      visibility: { draw: "public", hand: "ownerOnly" },
      cardSetIdsByZoneId: {},
    },
    decks: { draw: ["card-1"] },
    hands: {
      hand: perPlayer(players, (playerId) =>
        playerId === "player-1" ? ["card-2"] : [],
      ),
    },
    handVisibility: { hand: "ownerOnly" },
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
      "card-1": { type: "InDeck", deckId: "draw", playedBy: null },
      "card-2": {
        type: "InHand",
        handId: "hand",
        playerId: "player-1",
      },
    },
    ownerOfCard: { "card-1": null, "card-2": "player-1" },
    visibility: {
      "card-1": { faceUp: true },
      "card-2": { faceUp: true },
    },
    resources: perPlayer(players, () => ({})),
    pieces: {},
    boards: { byId: {}, hex: {}, square: {} },
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
        } as RuntimeTableRecord,
        ["player-1", "player-2"],
      ),
    ).toThrow(/zones/);
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
        rng: { seed: 42, cursor: 0, trace: [] },
        setup: null,
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
        rng: { seed: 42, cursor: 0, trace: [] },
        simultaneous: { current: null },
        lastTransition: null,
      },
    });
    expect(
      codec.parseInput({
        kind: "interaction",
        playerId: "player-1",
        interactionId: "takeAction",
      }),
    ).toEqual({
      kind: "interaction",
      playerId: "player-1",
      interactionId: "takeAction",
      params: {},
    });
  });

  test("stamps session state fingerprints and rejects mismatched stamped sessions", () => {
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
        rng: { seed: 42, cursor: 0, trace: [] },
        setup: null,
        simultaneous: { current: null },
        lastTransition: null,
      },
    });
    const encoded = codec.serializeState(parsed);

    expect(encoded.meta?.contractFingerprint).toMatch(/^cfp1:[a-f0-9]{16}$/);
    expect(codec.parseState(encoded).domain.phase).toEqual({ actionCount: 2 });

    const changedCodec = createIngressRuntimeCodec(
      buildDefinition({
        playState: z.object({
          actionCount: z.number().int(),
          optionalNote: z.string().optional(),
        }),
      }),
    );

    expect(() => changedCodec.parseState(encoded)).toThrow(
      StaleContractArtifactError,
    );
    const legacyEncoded = {
      domain: encoded.domain,
      runtime: encoded.runtime,
    };
    expect(changedCodec.parseState(legacyEncoded).domain.phase).toEqual({
      actionCount: 2,
    });
  });

  test("keeps facade and wrapper exports stable", () => {
    const typedInput: TrustedRuntimeInput<"player-1"> = {
      kind: "interaction",
      playerId: "player-1",
      interactionId: "takeAction",
      params: {},
    };

    expect(typedInput.kind).toBe("interaction");
    expect(createInputCodec).toBe(createIngressRuntimeCodec);
    expect(createSessionDecoder).toBe(createIngressRuntimeCodec);
    expect(createSessionEncoder).toBe(createIngressRuntimeCodec);
    expect(inputPayloadSchema).toBe(runtimePayloadSchema);
    expect(sessionPayloadSchema).toBe(runtimePayloadSchema);
    expect(safeParseOrThrow(z.string(), "ok", "value")).toBe("ok");
  });
});
