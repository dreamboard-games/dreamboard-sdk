import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createGame } from "../reducer";
import {
  createManifestStringLiteralSchema,
  type ClientParamsOfInteractionOfDefinition,
  type PhaseNamesOfDefinition,
  type RuntimeTableRecord,
} from "../reducer/model";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

function createModel() {
  const playerIds = ["player-1", "player-2"] as const;
  const phaseNames = ["setup", "playerTurn"] as const;
  const cardIds = ["card-1"] as const;
  const cardTypes = ["standard"] as const;
  const handIds = ["hand"] as const;
  return {
    manifest: {
      literals: {
        playerIds,
        phaseNames,
        cardSetIds: [] as const,
        cardTypes,
        deckIds: [] as const,
        handIds,
        sharedZoneIds: [] as const,
        playerZoneIds: handIds,
        zoneIds: handIds,
        cardIds,
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
        handVisibilityById: {},
        zoneVisibilityById: {},
        cardSetIdByCardId: {},
        cardTypeByCardId: { "card-1": "standard" },
        cardSetIdsBySharedZoneId: {},
        cardSetIdsByPlayerZoneId: {},
      },
      ids: {
        playerId: createManifestStringLiteralSchema(playerIds),
        phaseName: createManifestStringLiteralSchema(phaseNames),
        cardSetId: createManifestStringLiteralSchema([] as const),
        cardType: createManifestStringLiteralSchema(cardTypes),
        cardId: createManifestStringLiteralSchema(cardIds),
        deckId: createManifestStringLiteralSchema([] as const),
        handId: createManifestStringLiteralSchema(handIds),
        sharedZoneId: createManifestStringLiteralSchema([] as const),
        playerZoneId: createManifestStringLiteralSchema(handIds),
        zoneId: createManifestStringLiteralSchema(handIds),
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
        zones: () => ({ shared: {}, perPlayer: {}, visibility: {} }),
        decks: () => ({}),
        hands: () => ({}),
        handVisibility: () => ({}),
        ownerOfCard: () => ({}),
        visibility: () => ({}),
        resources: () => Object.fromEntries([].map((id) => [id, {}])),
      },
      tableSchema: z.custom<RuntimeTableRecord>(),
      runtimeSchema: z.any(),
      createGameStateSchema: () => z.any(),
    },
    state: {
      public: z.object({
        currentPlayerId:
          createManifestStringLiteralSchema(playerIds).nullable(),
      }),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: {
      setup: z.object({}),
      playerTurn: z.object({ rolled: z.boolean() }),
    },
  };
}

function createAuthoring() {
  return createGame(createModel());
}

describe("createGame", () => {
  test("stages model inference before contextually typing the implementation", () => {
    const authoring = createAuthoring();
    const setup = authoring.phase("setup");
    const playerTurn = authoring.phase("playerTurn");
    const game = authoring.assemble({
      initial: {
        public: ({ playerIds }) => ({
          currentPlayerId: playerIds[0] ?? null,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "setup",
      phases: {
        setup: setup.define({
          kind: "player",
          initialState: () => ({}),
          interactions: {},
        }),
        playerTurn: playerTurn.define({
          kind: "player",
          initialState: () => ({ rolled: false }),
          actor: ({ state }) => state.publicState.currentPlayerId,
          interactions: {
            chooseMood: playerTurn.interaction({
              inputs: {
                mood: playerTurn.inputs.form.choice({
                  choices: [
                    { value: "ready", label: "Ready" },
                    { value: "wait", label: "Wait" },
                  ],
                  defaultValue: "ready",
                }),
                dice: playerTurn.inputs.rng.d6(),
              },
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });

    type PhaseNames = PhaseNamesOfDefinition<typeof game>;
    type Params = ClientParamsOfInteractionOfDefinition<
      typeof game,
      "playerTurn",
      "chooseMood"
    >;
    const typeAssertions = [true, true] satisfies [
      Expect<Equal<PhaseNames, "setup" | "playerTurn">>,
      Expect<Equal<Params, { mood: "ready" | "wait" }>>,
    ];

    expect(game.contract.phaseNames).toEqual(["setup", "playerTurn"]);
    expect(typeAssertions).toEqual([true, true]);
  });
});

describe("bound game authoring", () => {
  test("preserves an interaction specification through the bound factory", () => {
    const authoring = createAuthoring();
    const playerTurn = authoring.phase("playerTurn");
    const spec = {
      inputs: {
        mood: playerTurn.inputs.form.choice({
          choices: [
            { value: "ready", label: "Ready" },
            { value: "wait", label: "Wait" },
          ],
          defaultValue: "ready",
        }),
      },
      reduce: () => {},
    };

    expect(playerTurn.interaction(spec)).toBe(spec);
  });

  test("infers game phases and client params without authored annotations", () => {
    const authoring = createAuthoring();
    const setup = authoring.phase("setup");
    const playerTurn = authoring.phase("playerTurn");

    const setupPhase = setup.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {},
    });
    const playerTurnPhase = playerTurn.define({
      kind: "player",
      initialState: () => ({ rolled: false }),
      actor: ({ state }) => state.publicState.currentPlayerId,
      interactions: {
        chooseMood: playerTurn.interaction({
          inputs: {
            mood: playerTurn.inputs.form.choice({
              choices: [
                { value: "ready", label: "Ready" },
                { value: "wait", label: "Wait" },
              ],
              defaultValue: "ready",
            }),
            dice: playerTurn.inputs.rng.d6(),
          },
          reduce: () => {},
        }),
      },
    });

    const game = authoring.assemble({
      initial: {
        public: ({ playerIds }) => ({
          currentPlayerId: playerIds[0] ?? null,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "setup",
      phases: {
        setup: setupPhase,
        playerTurn: playerTurnPhase,
      },
      view: () => ({}),
    });

    type PhaseNames = PhaseNamesOfDefinition<typeof game>;
    type Params = ClientParamsOfInteractionOfDefinition<
      typeof game,
      "playerTurn",
      "chooseMood"
    >;
    const typeAssertions = [true, true] satisfies [
      Expect<Equal<PhaseNames, "setup" | "playerTurn">>,
      Expect<Equal<Params, { mood: "ready" | "wait" }>>,
    ];

    expect(game.contract).toBe(authoring.contract);
    expect(game.phases.playerTurn).toBe(playerTurnPhase);
    expect(typeAssertions).toEqual([true, true]);
  });
});
