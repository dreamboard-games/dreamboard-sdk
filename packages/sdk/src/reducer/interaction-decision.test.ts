import { createHash } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  cardInput,
  cardTarget,
  choiceTarget,
  createManifestStringLiteralSchema,
  createReducerBundle,
  defineCardAction,
  defineGame,
  defineGameContract,
  defineInputs,
  defineInteraction,
  defineInteractionRule,
  definePhase,
  definePhaseStage,
  defineStepPhase,
  formInput,
  many,
  promptInput,
  type RuntimeTableRecord,
} from "../reducer";
import { asPlayerId, perPlayer, perPlayerGet } from "../reducer/per-player";

function buildManifest() {
  const playerIds = ["player-1", "player-2"] as const;
  const phaseNames = ["takeTurn"] as const;
  const resourceIds = ["gold"] as const;
  const cardIds = ["card-a", "card-b"] as const;
  const cardTypes = ["spell", "trap"] as const;
  const playerZoneIds = ["playZone"] as const;
  return {
    literals: {
      playerIds,
      phaseNames,
      setupOptionIds: [] as const,
      setupProfileIds: [] as const,
      cardSetIds: [] as const,
      cardTypes,
      deckIds: [] as const,
      handIds: playerZoneIds,
      sharedZoneIds: [] as const,
      playerZoneIds,
      zoneIds: playerZoneIds,
      cardIds,
      resourceIds,
      resourcePresentationById: {
        gold: { label: "Gold", icon: "🪙" },
      },
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
      cardTypeByCardId: { "card-a": "spell", "card-b": "trap" },
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {},
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: createManifestStringLiteralSchema(phaseNames),
      setupOptionId: createManifestStringLiteralSchema([] as const),
      setupProfileId: createManifestStringLiteralSchema([] as const),
      cardSetId: createManifestStringLiteralSchema([] as const),
      cardType: createManifestStringLiteralSchema(cardTypes),
      cardId: createManifestStringLiteralSchema(cardIds),
      deckId: createManifestStringLiteralSchema([] as const),
      handId: createManifestStringLiteralSchema(playerZoneIds),
      sharedZoneId: createManifestStringLiteralSchema([] as const),
      playerZoneId: createManifestStringLiteralSchema(playerZoneIds),
      zoneId: createManifestStringLiteralSchema(playerZoneIds),
      resourceId: createManifestStringLiteralSchema(resourceIds),
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
      resources: () => perPlayer([], () => ({})),
    },
    setupOptionsById: {},
    setupChoiceIdsByOptionId: {},
    setupProfilesById: {},
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  } as const;
}

function buildTwoZoneManifest() {
  const base = buildManifest();
  const playerIds = ["player-1", "player-2"] as const;
  const phaseNames = ["takeTurn"] as const;
  const resourceIds = ["gold"] as const;
  const cardIds = ["card-a", "card-b"] as const;
  const cardTypes = ["spell", "trap"] as const;
  const playerZoneIds = ["playZone", "discardZone"] as const;
  return {
    ...base,
    literals: {
      ...base.literals,
      playerIds,
      phaseNames,
      resourceIds,
      cardIds,
      cardTypes,
      handIds: playerZoneIds,
      playerZoneIds,
      zoneIds: playerZoneIds,
      cardTypeByCardId: { "card-a": "spell", "card-b": "trap" },
    },
    ids: {
      ...base.ids,
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: createManifestStringLiteralSchema(phaseNames),
      cardType: createManifestStringLiteralSchema(cardTypes),
      cardId: createManifestStringLiteralSchema(cardIds),
      handId: createManifestStringLiteralSchema(playerZoneIds),
      playerZoneId: createManifestStringLiteralSchema(playerZoneIds),
      zoneId: createManifestStringLiteralSchema(playerZoneIds),
      resourceId: createManifestStringLiteralSchema(resourceIds),
    },
  } as const;
}

function createTable(
  options: { player1Gold?: number } = {},
): RuntimeTableRecord {
  const ids = [asPlayerId("player-1"), asPlayerId("player-2")];
  return {
    playerOrder: ["player-1", "player-2"],
    zones: {
      shared: {},
      perPlayer: {
        playZone: perPlayer(ids, () => ["card-a", "card-b"]),
      },
      visibility: {},
    },
    decks: {},
    hands: {},
    handVisibility: {},
    cards: {
      "card-a": {
        id: "card-a",
        cardSetId: "cards",
        cardType: "spell",
        properties: {},
      },
      "card-b": {
        id: "card-b",
        cardSetId: "cards",
        cardType: "trap",
        properties: {},
      },
    },
    pieces: {},
    componentLocations: {},
    ownerOfCard: {},
    visibility: {},
    resources: perPlayer(ids, (id) => ({
      gold: id === "player-1" ? (options.player1Gold ?? 1) : 5,
    })),
    boards: {
      byId: {},
      hex: {},
      network: {},
      square: {},
      track: {},
    },
    dice: {},
  };
}

function createTwoZoneTable(): RuntimeTableRecord {
  const ids = [asPlayerId("player-1"), asPlayerId("player-2")];
  return {
    ...createTable(),
    zones: {
      shared: {},
      perPlayer: {
        playZone: perPlayer(ids, () => ["card-a"]),
        discardZone: perPlayer(ids, () => ["card-b"]),
      },
      visibility: {},
    },
  };
}

function getAvailableInteractions(
  bundle: ReturnType<typeof createReducerBundle>,
  state: Parameters<typeof bundle.projectSeatsDynamic>[0]["state"],
  playerId: string,
) {
  const projection = bundle.projectSeatsDynamic({
    state,
    playerIds: [playerId],
  });
  return hydrateRefs(
    projection.interactionsByRef,
    projection.seats[playerId]?.availableInteractionRefs,
  );
}

function hydrateRefs<T>(
  interactionsByRef: Record<string, T>,
  refs: readonly string[] | undefined,
): T[] {
  return (refs ?? []).map((ref) => interactionsByRef[ref]).filter(Boolean);
}

function nodeSha256Digest(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalizeJson(value)))
    .digest("hex")}`;
}

function canonicalizeJson(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalizeJson(item)]),
    );
  }
  return null;
}

function hydrateCardRefs<T>(
  projection: { interactionsByRef: Record<string, T> },
  refs: readonly string[] | undefined,
): T[] {
  return hydrateRefs(projection.interactionsByRef, refs);
}

function makeBundle(options: { diagnostics?: "verbose" } = {}) {
  const contract = defineGameContract({
    manifest: buildManifest(),
    phases: { takeTurn: z.object({}) },
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const phaseState = z.object({});
  const inMain = <Interaction>(interaction: Interaction) => ({
    steps: ["main"] as const,
    interaction,
  });
  const inBlocked = <Interaction>(interaction: Interaction) => ({
    steps: ["blocked"] as const,
    interaction,
  });
  const ruleBidAmountInput = formInput.number({
    min: 0,
    max: 10,
    defaultValue: 2,
  });
  const enoughGoldRule = defineInteractionRule<
    typeof contract,
    typeof phaseState
  >()<{
    amount: typeof ruleBidAmountInput;
  }>({
    id: "enough-gold",
    errorCode: "INSUFFICIENT_RESOURCES",
    message: "Need 2 gold.",
    available: ({ state, input }) =>
      (perPlayerGet(state.table.resources, asPlayerId(input.playerId))?.gold ??
        0) >= 2,
    validate: ({ state, input }) =>
      (perPlayerGet(state.table.resources, asPlayerId(input.playerId))?.gold ??
        0) >= input.params.amount
        ? null
        : {
            errorCode: "INSUFFICIENT_RESOURCES",
            message: "Not enough gold.",
          },
  });
  const stringGoldRule = defineInteractionRule<
    typeof contract,
    typeof phaseState
  >()<{
    amount: typeof ruleBidAmountInput;
  }>({
    id: "string-gold",
    errorCode: "INSUFFICIENT_RESOURCES",
    validate: ({ state, input }) =>
      (perPlayerGet(state.table.resources, asPlayerId(input.playerId))?.gold ??
        0) >= input.params.amount
        ? null
        : "Need that much gold.",
  });
  const answerTarget = choiceTarget
    .options([{ id: "yes", label: "Yes" }] as const)
    .build();
  const game = defineGame({
    contract,
    initial: {
      public: () => ({}),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "takeTurn",
    phases: {
      takeTurn: defineStepPhase<typeof contract>()({
        kind: "player",
        steps: ["main", "blocked"],
        state: phaseState,
        interactions: {
          spendGold: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              commit: { mode: "autoWhenReady" },
              inputs: {},
              cost: () => ({ gold: 2 }),
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          stageBlocked: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {},
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          stepBlocked: inBlocked(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {},
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          answerPrompt: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              to: () => "player-2",
              inputs: {
                answer: promptInput({
                  schema: z.enum(["yes"]),
                  target: answerTarget,
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          allocateGold: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                allocation: formInput.resourceMap({
                  resources: [
                    {
                      resourceId: "gold",
                      label: "Gold",
                      max: ({ state, playerId }) =>
                        perPlayerGet(
                          state.table.resources,
                          asPlayerId(playerId),
                        )?.gold ?? 0,
                    },
                  ],
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          bidGold: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                amount: formInput.number({
                  min: 0,
                  max: ({ state, playerId }) =>
                    perPlayerGet(state.table.resources, asPlayerId(playerId))
                      ?.gold ?? 0,
                  step: 1,
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          ruleGatedBid: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                amount: ruleBidAmountInput,
              },
              rules: [enoughGoldRule],
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          stringRuleBid: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                amount: ruleBidAmountInput,
              },
              rules: [stringGoldRule],
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          chooseMode: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                mode: formInput.choice({
                  choices: [
                    { value: "spend", label: "Spend" },
                    { value: "save", label: "Save" },
                  ],
                  defaultValue: "save",
                }),
              },
              rules: [
                {
                  id: "mode-default",
                  errorCode: "missing-default-mode",
                  validate: ({ input }) =>
                    input.params.mode === "save"
                      ? null
                      : {
                          errorCode: "missing-default-mode",
                          message:
                            "Projection should receive the collector default.",
                        },
                },
              ],
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          chooseResource: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                resource: formInput.choice({
                  choices: formInput.resourceChoices({
                    decorate: ({ resourceId }) => ({
                      badge: resourceId === "gold" ? "2:1" : undefined,
                      description:
                        resourceId === "gold"
                          ? "Give 2 Gold to receive 1 resource."
                          : undefined,
                    }),
                  }),
                  defaultValue: "gold",
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          choosePlayer: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                player: formInput.choice({
                  choices: ({ state, playerId }) =>
                    state.table.playerOrder
                      .filter((id) => id !== playerId)
                      .map((id) => ({ value: id, label: id })),
                  defaultValue: ({ choices }) => choices[0]?.value,
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
          choosePlayers: inMain(
            defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                players: formInput.choiceList({
                  choices: ({ state, playerId }) =>
                    state.table.playerOrder
                      .filter((id) => id !== playerId)
                      .map((id) => ({ value: id, label: id })),
                  min: 1,
                  max: 1,
                  defaultValue: "all",
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          ),
        },
        cardActions: {
          playCard: {
            steps: ["main"],
            action: defineCardAction<typeof contract, typeof phaseState>()({
              cardType: "spell",
              playFrom: "playZone",
              rules: [
                {
                  id: "card-blocked",
                  errorCode: "card-blocked",
                  validate: ({ input }) =>
                    input.params.cardId === "card-a"
                      ? {
                          errorCode: "card-blocked",
                          message: "Card is blocked.",
                        }
                      : undefined,
                },
              ],
              reduce: ({ state, accept }) => accept(state),
            }),
          },
        },
        stages: {
          open: definePhaseStage<typeof contract, typeof phaseState>()({
            allow: [
              "spendGold",
              "stepBlocked",
              "answerPrompt",
              "playCard",
              "allocateGold",
              "bidGold",
              "chooseMode",
              "chooseResource",
              "ruleGatedBid",
              "stringRuleBid",
            ],
            when: () => true,
          }),
        },
        zones: ["playZone"],
      }),
    },
  });
  return createReducerBundle(game, options);
}

describe("trusted interaction decision pipeline", () => {
  test("projected descriptors carry stable descriptor digests and seat-scoped initial draft digests", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const oneSeatProjection = bundle.projectSeatsDynamic({
      state,
      playerIds: ["player-1"],
    });
    const shiftedSeatProjection = bundle.projectSeatsDynamic({
      state,
      playerIds: ["player-2", "player-1"],
    });
    const oneSeatDescriptor = hydrateRefs(
      oneSeatProjection.interactionsByRef,
      oneSeatProjection.seats["player-1"]?.availableInteractionRefs,
    ).find((descriptor) => descriptor.interactionId === "stageBlocked");
    const shiftedSeatDescriptor = hydrateRefs(
      shiftedSeatProjection.interactionsByRef,
      shiftedSeatProjection.seats["player-1"]?.availableInteractionRefs,
    ).find((descriptor) => descriptor.interactionId === "stageBlocked");

    expect(oneSeatDescriptor).toBeDefined();
    const inputDefaults = Object.fromEntries(
      (oneSeatDescriptor?.inputs ?? []).flatMap((input) =>
        input.defaultValue === undefined
          ? []
          : [[input.key, input.defaultValue] as const],
      ),
    );
    expect(oneSeatDescriptor?.descriptorDigest).toBe(
      nodeSha256Digest({
        commitMode: oneSeatDescriptor?.commit.mode,
        defaults: inputDefaults,
        inputKeys: oneSeatDescriptor?.inputs.map((input) => input.key),
        inputs: oneSeatDescriptor?.inputs.map((input) => ({
          key: input.key,
          kind: input.kind,
          domain: input.domain,
          defaultValue:
            input.defaultValue === undefined ? null : input.defaultValue,
        })),
        interactionId: oneSeatDescriptor?.interactionId,
        interactionKey: oneSeatDescriptor?.interactionKey,
        stableIdentity: `${oneSeatDescriptor?.interactionKey}:${oneSeatDescriptor?.interactionId}`,
      }),
    );
    expect(oneSeatDescriptor?.draftDigest).toBe(
      nodeSha256Digest({
        digestVersion: "interaction-draft@2",
        actorSeat: 0,
        descriptorDigest: oneSeatDescriptor?.descriptorDigest,
        emitted: false,
        interactionId: oneSeatDescriptor?.interactionId,
        interactionKey: oneSeatDescriptor?.interactionKey,
        values: inputDefaults,
      }),
    );
    expect(shiftedSeatDescriptor?.descriptorDigest).toBe(
      oneSeatDescriptor?.descriptorDigest,
    );
    expect(shiftedSeatDescriptor?.draftDigest).not.toBe(
      oneSeatDescriptor?.draftDigest,
    );
  });

  test("stage and step gating share descriptor and submit decisions", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const descriptors = getAvailableInteractions(bundle, state, "player-1");

    expect(
      descriptors.find((d) => d.interactionId === "stageBlocked"),
    ).toMatchObject({
      availability: {
        status: "blocked",
        reason: "Interaction not allowed in current stage",
      },
    });
    expect(
      descriptors.find((d) => d.interactionId === "stepBlocked"),
    ).toMatchObject({
      availability: {
        status: "blocked",
        reason: "Interaction not allowed in current step",
      },
    });

    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "stageBlocked",
          params: {},
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "action-unavailable",
      message:
        "Interaction 'stageBlocked' is not allowed in the current stage.",
    });
    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "stepBlocked",
          params: {},
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "action-unavailable",
      message: "Interaction 'stepBlocked' is not allowed in the current step.",
    });
  });

  test("prompt addressees stay hidden from non-addressees and reject with prompt-not-owned", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    expect(
      getAvailableInteractions(bundle, state, "player-1").some(
        (descriptor) => descriptor.interactionId === "answerPrompt",
      ),
    ).toBe(false);
    expect(
      getAvailableInteractions(bundle, state, "player-2").find(
        (descriptor) => descriptor.interactionId === "answerPrompt",
      ),
    ).toMatchObject({
      kind: "prompt",
      availability: { status: "available" },
      context: { to: "player-2" },
    });

    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "answerPrompt",
          params: { answer: "yes" },
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "prompt-not-owned",
    });
  });

  test("cost details and submit rejection come from the same decision path", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    expect(
      getAvailableInteractions(bundle, state, "player-1").find(
        (descriptor) => descriptor.interactionId === "spendGold",
      ),
    ).toMatchObject({
      availability: {
        status: "insufficientResources",
        reason: "INSUFFICIENT_RESOURCES",
        missingResources: { gold: 1 },
      },
      cost: { gold: 2 },
      currentResources: { gold: 1 },
      commit: { mode: "autoWhenReady" },
    });

    expect(
      getAvailableInteractions(bundle, state, "player-1").find(
        (descriptor) => descriptor.interactionId === "stageBlocked",
      ),
    ).toMatchObject({
      commit: { mode: "manual" },
    });

    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "spendGold",
          params: {},
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "INSUFFICIENT_RESOURCES",
    });
  });

  test("interaction rules drive both descriptor availability and submit validation", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    expect(
      getAvailableInteractions(bundle, state, "player-1").find(
        (descriptor) => descriptor.interactionId === "ruleGatedBid",
      ),
    ).toMatchObject({
      availability: {
        status: "blocked",
        reason: "Need 2 gold.",
      },
    });

    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "ruleGatedBid",
          params: { amount: 2 },
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "INSUFFICIENT_RESOURCES",
      message: "Need 2 gold.",
    });

    const fundedState = await bundle.initialize({
      table: createTable({ player1Gold: 2 }),
      playerIds: ["player-1", "player-2"],
    });

    expect(
      getAvailableInteractions(bundle, fundedState, "player-1").find(
        (descriptor) => descriptor.interactionId === "ruleGatedBid",
      ),
    ).toMatchObject({
      availability: { status: "available" },
    });

    await expect(
      bundle.validateInput({
        state: fundedState,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "ruleGatedBid",
          params: { amount: 3 },
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "INSUFFICIENT_RESOURCES",
      message: "Not enough gold.",
    });
  });

  test("rule validation may return a dynamic message string", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable({ player1Gold: 2 }),
      playerIds: ["player-1", "player-2"],
    });

    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "stringRuleBid",
          params: { amount: 3 },
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "INSUFFICIENT_RESOURCES",
      message: "Need that much gold.",
    });
  });

  test("explainInteraction reports structured rule and input diagnostics", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    expect(
      bundle.explainInteraction({
        state,
        playerId: "player-1",
        interactionId: "ruleGatedBid",
      }),
    ).toMatchObject({
      interactionId: "ruleGatedBid",
      phase: "takeTurn",
      step: "main",
      availability: "blocked",
      actor: { required: [], playerIsActor: true },
      rules: [
        {
          ruleId: "enough-gold",
          outcome: "failed",
          errorCode: "INSUFFICIENT_RESOURCES",
          message: "Need 2 gold.",
        },
      ],
      inputs: [
        {
          key: "amount",
          kind: "form",
          eligibleCount: 11,
        },
      ],
    });
  });

  test("verbose diagnostics opt in to descriptor reasons", async () => {
    const defaultBundle = makeBundle();
    const verboseBundle = makeBundle({ diagnostics: "verbose" });
    const defaultState = await defaultBundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const verboseState = await verboseBundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const defaultDescriptor = getAvailableInteractions(
      defaultBundle,
      defaultState,
      "player-1",
    ).find((descriptor) => descriptor.interactionId === "ruleGatedBid");
    expect(defaultDescriptor?.reasons).toBeUndefined();
    expect(
      getAvailableInteractions(verboseBundle, verboseState, "player-1").find(
        (descriptor) => descriptor.interactionId === "ruleGatedBid",
      ),
    ).toMatchObject({
      reasons: [
        {
          ruleId: "enough-gold",
          errorCode: "INSUFFICIENT_RESOURCES",
        },
      ],
    });
  });

  test("hand zones derive card actions and preserve card-mode validation", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.projectSeatsDynamic({
      state,
      playerIds: ["player-1"],
    });
    const playZone = projection.seats["player-1"]?.zones.playZone;

    expect(playZone?.cardIds).toEqual(["card-a", "card-b"]);
    expect(JSON.parse(playZone!.cardViewsById["card-a"]!)).toEqual({
      id: "card-a",
      cardType: "spell",
      properties: {},
    });

    expect(
      hydrateCardRefs(projection, playZone?.playableByCardId["card-a"]),
    ).toMatchObject([
      {
        interactionId: "playCard",
        inputs: [
          {
            key: "cardId",
            kind: "card",
            domain: {
              type: "cardTarget",
              projection: "resolved",
              targetKind: "card",
              zoneIds: ["playZone"],
              eligibleTargets: ["card-a"],
            },
          },
        ],
        availability: {
          status: "blocked",
          reason: "Card is blocked.",
        },
      },
    ]);
    expect(playZone?.playableByCardId["card-b"]).toEqual([]);
  });

  test("hand zones derive authored hand interactions from card inputs", async () => {
    const contract = defineGameContract({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
    const playZoneTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();
    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: phaseState,
          initialState: () => ({}),
          interactions: {
            playSelected: defineInteraction<
              typeof contract,
              typeof phaseState
            >()({
              inputs: {
                cardId: cardInput({ target: playZoneTarget }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
            playMany: defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                cardIds: many(cardInput({ target: playZoneTarget }), {
                  count: 2,
                  distinct: true,
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          },
          zones: ["playZone"],
        }),
      },
    });
    const bundle = createReducerBundle(game);
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.projectSeatsDynamic({
      state,
      playerIds: ["player-1"],
    });
    const playZone = projection.seats["player-1"]?.zones.playZone;

    expect(
      hydrateCardRefs(projection, playZone?.playableByCardId["card-a"]).find(
        (descriptor) => descriptor.interactionId === "playSelected",
      ),
    ).toMatchObject({
      interactionId: "playSelected",
      availability: { status: "available" },
      zoneId: "playZone",
    });
    expect(
      hydrateCardRefs(projection, playZone?.playableByCardId["card-b"]).find(
        (descriptor) => descriptor.interactionId === "playSelected",
      ),
    ).toMatchObject({
      interactionId: "playSelected",
      availability: { status: "available" },
      zoneId: "playZone",
    });
    expect(
      getAvailableInteractions(bundle, state, "player-1").find(
        (descriptor) => descriptor.interactionId === "playSelected",
      ),
    ).toMatchObject({ commit: { mode: "autoWhenReady" } });
    expect(
      getAvailableInteractions(bundle, state, "player-1").find(
        (descriptor) => descriptor.interactionId === "playMany",
      ),
    ).toMatchObject({ commit: { mode: "manual" } });
  });

  test("card interactions with renderable form inputs default to manual commit", async () => {
    const contract = defineGameContract({
      manifest: buildTwoZoneManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: phaseState,
          initialState: () => ({}),
          cardActions: {
            playWithChoices: defineCardAction<
              typeof contract,
              typeof phaseState
            >()({
              cardType: "spell",
              playFrom: "playZone",
              inputs: {
                selectedCardIds: formInput.choiceList({
                  choices: [{ value: "card-a", label: "Card A" }],
                  defaultValue: [],
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          },
          zones: ["playZone"],
        }),
      },
    });
    const bundle = createReducerBundle(game);
    const state = await bundle.initialize({
      table: createTwoZoneTable(),
      playerIds: ["player-1", "player-2"],
    });

    const descriptor = getAvailableInteractions(bundle, state, "player-1").find(
      (candidate) => candidate.interactionId === "playWithChoices",
    );
    expect(descriptor).toMatchObject({ commit: { mode: "manual" } });
    expect(
      descriptor?.inputs.find((input) => input.key === "selectedCardIds"),
    ).toMatchObject({ defaultValue: [] });
  });

  test("default commit policy follows terminal input dependencies", async () => {
    const contract = defineGameContract({
      manifest: buildTwoZoneManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
    const playZoneTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();
    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: phaseState,
          initialState: () => ({}),
          interactions: {
            formOnly: defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                choice: formInput.choice({
                  choices: [{ value: "one", label: "One" }],
                  defaultValue: "one",
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
            targetOnly: defineInteraction<typeof contract, typeof phaseState>()(
              {
                inputs: {
                  cardId: cardInput({ target: playZoneTarget }),
                },
                reduce: ({ state, accept }) => accept(state),
              },
            ),
            targetThenForm: defineInteraction<
              typeof contract,
              typeof phaseState
            >()({
              inputs: defineInputs((input) => {
                const cardId = input.add(
                  "cardId",
                  cardInput({ target: playZoneTarget }),
                );
                return {
                  cardId,
                  choice: input.add(
                    "choice",
                    formInput.choice<string, never, readonly [typeof cardId]>({
                      dependsOn: [cardId],
                      choices: ({ values }) => [
                        {
                          value: `resolve-${values.cardId}`,
                          label: `Resolve ${values.cardId}`,
                        },
                      ],
                      defaultValue: ({ choices }) => choices[0]?.value,
                    }),
                  ),
                };
              }),
              reduce: ({ state, accept }) => accept(state),
            }),
            formThenTarget: defineInteraction<
              typeof contract,
              typeof phaseState
            >()({
              inputs: defineInputs((input) => {
                const mode = input.add(
                  "mode",
                  formInput.choice({
                    choices: [{ value: "play", label: "Play" }],
                    defaultValue: () => undefined,
                  }),
                );
                return {
                  mode,
                  cardId: input.add(
                    "cardId",
                    cardInput({ target: playZoneTarget, dependsOn: [mode] }),
                  ),
                };
              }),
              reduce: ({ state, accept }) => accept(state),
            }),
            independentMixed: defineInteraction<
              typeof contract,
              typeof phaseState
            >()({
              inputs: {
                cardId: cardInput({ target: playZoneTarget }),
                choice: formInput.choice({
                  choices: [{ value: "one", label: "One" }],
                  defaultValue: "one",
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          },
          zones: ["playZone"],
        }),
      },
    });
    const bundle = createReducerBundle(game);
    const state = await bundle.initialize({
      table: createTwoZoneTable(),
      playerIds: ["player-1", "player-2"],
    });
    const descriptors = getAvailableInteractions(bundle, state, "player-1");
    const commitModeFor = (interactionId: string) =>
      descriptors.find(
        (descriptor) => descriptor.interactionId === interactionId,
      )?.commit.mode;

    expect(commitModeFor("formOnly")).toBe("manual");
    expect(commitModeFor("targetOnly")).toBe("autoWhenReady");
    expect(commitModeFor("targetThenForm")).toBe("manual");
    expect(commitModeFor("formThenTarget")).toBe("autoWhenReady");
    expect(commitModeFor("independentMixed")).toBe("manual");
  });

  test("many-input interactions cannot opt into auto submit", () => {
    const contract = defineGameContract({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
    const playZoneTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();

    expect(() =>
      defineInteraction<typeof contract, typeof phaseState>()({
        commit: { mode: "autoWhenReady" } as never,
        inputs: {
          cardIds: many(cardInput({ target: playZoneTarget }), {
            count: 2,
            distinct: true,
          }),
        },
        reduce: ({ state, accept }) => accept(state),
      }),
    ).toThrow(
      'defineInteraction: interactions with many(...) inputs must use commit: { mode: "manual" }.',
    );
  });

  test("submit target validation receives collector dependency values", async () => {
    const contract = defineGameContract({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
    const playZoneTarget = cardTarget
      .zones<never, "card-a">(["playZone"])
      .where({
        id: "mode-enabled",
        errorCode: "MODE_BLOCKED",
        message: "Mode blocks that target.",
        test: ({ values }) => values?.mode === "enabled",
      })
      .build();
    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: phaseState,
          initialState: () => ({}),
          interactions: {
            playWithMode: defineInteraction<
              typeof contract,
              typeof phaseState
            >()({
              inputs: defineInputs((input) => {
                const mode = input.add(
                  "mode",
                  formInput.choice({
                    choices: [{ value: "enabled", label: "Enabled" }],
                    defaultValue: () => undefined,
                  }),
                );
                return {
                  mode,
                  cardId: input.add(
                    "cardId",
                    cardInput({
                      target: playZoneTarget,
                      dependsOn: [mode],
                    }),
                  ),
                };
              }),
              reduce: ({ state, accept }) => accept(state),
            }),
          },
          zones: ["playZone"],
        }),
      },
    });
    const bundle = createReducerBundle(game);
    const state = await bundle.initialize({
      table: createTwoZoneTable(),
      playerIds: ["player-1", "player-2"],
    });

    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "playWithMode",
          params: { mode: "enabled", cardId: "card-a" },
        },
      }),
    ).resolves.toMatchObject({ valid: true });
  });

  test("hand zones bind playable cards to the matching card input zone", async () => {
    const contract = defineGameContract({
      manifest: buildTwoZoneManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
    const discardTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["discardZone"])
      .build();
    const playTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();
    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: phaseState,
          initialState: () => ({}),
          interactions: {
            inspectThenPlay: defineInteraction<
              typeof contract,
              typeof phaseState
            >()({
              inputs: {
                discardCardId: cardInput({ target: discardTarget }),
                cardId: cardInput({ target: playTarget }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          },
          zones: ["playZone", "discardZone"],
        }),
      },
    });
    const bundle = createReducerBundle(game);
    const state = await bundle.initialize({
      table: createTwoZoneTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.projectSeatsDynamic({
      state,
      playerIds: ["player-1"],
    });

    expect(
      hydrateCardRefs(
        projection,
        projection.seats["player-1"]?.zones.playZone.playableByCardId["card-a"],
      ),
    ).toMatchObject([{ interactionId: "inspectThenPlay" }]);
    expect(
      hydrateCardRefs(
        projection,
        projection.seats["player-1"]?.zones.discardZone.playableByCardId[
          "card-b"
        ],
      ),
    ).toMatchObject([{ interactionId: "inspectThenPlay" }]);
  });

  test("hand zones derive simultaneous submit card inputs and hide submitted cards", async () => {
    const contract = defineGameContract({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({ submitted: z.array(z.string()) }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
    const playZoneTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();
    const game = defineGame({
      contract,
      initial: {
        public: () => ({ submitted: [] }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "simultaneousPlayer",
          state: phaseState,
          initialState: () => ({}),
          actors: ({ q }) => q.player.order(),
          zones: ["playZone"],
          submit: {
            inputs: {
              cardIds: many(cardInput({ target: playZoneTarget }), {
                count: 1,
                distinct: true,
              }),
            },
          },
          resolve: ({ state, accept }) => accept(state),
        }),
      },
    });
    const bundle = createReducerBundle(game);
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.projectSeatsDynamic({
      state,
      playerIds: ["player-1"],
    });

    expect(
      hydrateCardRefs(
        projection,
        projection.seats["player-1"]?.zones.playZone.playableByCardId["card-a"],
      ),
    ).toMatchObject([
      {
        interactionId: "submit",
        availability: { status: "available" },
        zoneId: "playZone",
      },
    ]);

    const submitted = await bundle.dispatch({
      state,
      input: {
        kind: "interaction",
        interactionId: "submit",
        playerId: "player-1",
        params: { cardIds: ["card-a"] },
      },
    });
    expect(submitted.kind).toBe("accept");
    if (submitted.kind !== "accept") return;
    const afterSubmit = bundle.projectSeatsDynamic({
      state: submitted.state,
      playerIds: ["player-1", "player-2"],
    });

    expect(
      afterSubmit.seats["player-1"]?.zones.playZone.playableByCardId["card-a"],
    ).toEqual([]);
    expect(
      hydrateCardRefs(
        afterSubmit,
        afterSubmit.seats["player-2"]?.zones.playZone.playableByCardId[
          "card-a"
        ],
      ),
    ).toMatchObject([
      {
        interactionId: "submit",
        availability: { status: "available" },
        zoneId: "playZone",
      },
    ]);
  });

  test("descriptors omit reducer-owned dispatch priority metadata", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.projectSeatsDynamic({
      state,
      playerIds: ["player-1"],
    });

    const interaction = hydrateRefs(
      projection.interactionsByRef,
      projection.seats["player-1"]?.availableInteractionRefs,
    ).find((descriptor) => descriptor.interactionId === "spendGold");
    const cardAction = hydrateCardRefs(
      projection,
      projection.seats["player-1"]?.zones.playZone.playableByCardId["card-a"],
    ).find((descriptor) => descriptor.interactionId === "playCard");

    expect(interaction).toMatchObject({
      interactionId: "spendGold",
      kind: "action",
    });
    expect(cardAction).toMatchObject({
      interactionId: "playCard",
      kind: "action",
    });
    expect(interaction).not.toHaveProperty("dispatchPriority");
    expect(cardAction).not.toHaveProperty("dispatchPriority");
  });

  test("card actions only surface for their authored card type", async () => {
    const contract = defineGameContract({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: phaseState,
          initialState: () => ({}),
          cardActions: {
            castSpell: defineCardAction<typeof contract, typeof phaseState>()({
              cardType: "spell",
              playFrom: "playZone",
              reduce: ({ state, accept }) => accept(state),
            }),
          },
          zones: ["playZone"],
        }),
      },
    });
    const bundle = createReducerBundle(game);
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.projectSeatsDynamic({
      state,
      playerIds: ["player-1"],
    });

    expect(
      hydrateCardRefs(
        projection,
        projection.seats["player-1"]?.zones.playZone.playableByCardId["card-a"],
      ),
    ).toMatchObject([
      { interactionId: "castSpell", availability: { status: "available" } },
    ]);
    expect(
      projection.seats["player-1"]?.zones.playZone.playableByCardId["card-b"],
    ).toEqual([]);
    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "castSpell",
          params: { cardId: "card-b" },
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "WRONG_CARD_TYPE",
    });
  });

  test("defineGame rejects zones that do not point at manifest player zones", () => {
    const contract = defineGameContract({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});

    expect(() =>
      defineGame({
        contract,
        initial: {
          public: () => ({}),
          private: () => ({}),
          hidden: () => ({}),
        },
        phases: {
          takeTurn: definePhase<typeof contract>()({
            kind: "player",
            state: phaseState,
            initialState: () => ({}),
            zones: ["typo-zone" as never],
          }),
        },
      }),
    ).toThrow(
      "defineGame: phases.takeTurn.zones[0] 'typo-zone' is not declared in manifest.literals.playerZoneIds.",
    );
  });

  test("defineGame rejects removed zone spec objects", () => {
    const contract = defineGameContract({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});

    expect(() =>
      defineGame({
        contract,
        initial: {
          public: () => ({}),
          private: () => ({}),
          hidden: () => ({}),
        },
        phases: {
          takeTurn: definePhase<typeof contract>()({
            kind: "player",
            state: phaseState,
            initialState: () => ({}),
            zones: {
              playZone: {
                cardsFrom: () => ["card-a"],
                playableVia: ["typoAction"],
              } as never,
            } as never,
          }),
        },
      }),
    ).toThrow(
      'defineGame: phases.takeTurn.zones uses removed zone spec objects. Use zones: ["manifest-player-zone-id"] and cardActions[*].playFrom instead.',
    );
  });

  test("domain-aware form inputs project server-authored input domains", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const descriptors = getAvailableInteractions(bundle, state, "player-2");

    expect(
      descriptors.find((d) => d.interactionId === "allocateGold"),
    ).toMatchObject({
      inputs: [
        {
          key: "allocation",
          domain: {
            type: "resourceMap",
            resources: [
              {
                resourceId: "gold",
                label: "Gold",
                icon: "🪙",
                min: 0,
                max: 5,
              },
            ],
          },
        },
      ],
    });
    expect(
      descriptors.find((d) => d.interactionId === "bidGold"),
    ).toMatchObject({
      inputs: [
        {
          key: "amount",
          domain: {
            type: "boundedNumber",
            min: 0,
            max: 5,
            step: 1,
          },
        },
      ],
    });
    expect(
      descriptors.find((d) => d.interactionId === "chooseMode"),
    ).toMatchObject({
      availability: { status: "available" },
      inputs: [
        {
          key: "mode",
          defaultValue: "save",
          domain: {
            type: "choice",
            choices: [
              { value: "spend", label: "Spend" },
              { value: "save", label: "Save" },
            ],
          },
        },
      ],
    });
    expect(
      descriptors.find((d) => d.interactionId === "chooseResource"),
    ).toMatchObject({
      inputs: [
        {
          key: "resource",
          defaultValue: "gold",
          domain: {
            type: "choice",
            choices: [
              {
                value: "gold",
                label: "Gold",
                icon: "🪙",
                badge: "2:1",
                description: "Give 2 Gold to receive 1 resource.",
              },
            ],
          },
        },
      ],
    });
    expect(
      descriptors.find((d) => d.interactionId === "choosePlayer"),
    ).toMatchObject({
      inputs: [
        {
          key: "player",
          domain: {
            type: "choice",
            choices: [{ value: "player-1", label: "player-1" }],
          },
        },
      ],
    });
    expect(
      descriptors.find((d) => d.interactionId === "choosePlayers"),
    ).toMatchObject({
      inputs: [
        {
          key: "players",
          defaultValue: ["player-1"],
          domain: {
            type: "choiceList",
            choices: [{ value: "player-1", label: "player-1" }],
            min: 1,
            max: 1,
          },
        },
      ],
    });
    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "chooseMode",
          params: {},
        },
      }),
    ).resolves.toMatchObject({ valid: true });
  });
});
