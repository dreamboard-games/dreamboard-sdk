import { createGame as createModel } from "../reducer";
import { InteractionSteps } from "./authoring/steps";

import { createReducerTestingBundle } from "../testing/reducer-runtime.js";
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { cardInput, cardTarget, choiceTarget, formInput } from "./inputs";
import { many } from "../reducer";
import {
  createManifestStringLiteralSchema,
  RuntimeTableRecord,
} from "../reducer/advanced";
import { asPlayerId } from "../reducer/per-player";
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
      resources: () => Object.fromEntries([].map((id) => [id, {}])),
    },
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
  options: {
    player1Gold?: number;
  } = {},
): RuntimeTableRecord {
  const ids = [asPlayerId("player-1"), asPlayerId("player-2")];
  return {
    playerOrder: ["player-1", "player-2"],
    zones: {
      shared: {},
      perPlayer: {
        playZone: Object.fromEntries(
          ids.map((id) => [id, ["card-a", "card-b"]]),
        ),
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
    resources: Object.fromEntries(
      ids.map((id) => [
        id,
        {
          gold: id === "player-1" ? (options.player1Gold ?? 1) : 5,
        },
      ]),
    ),
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
        playZone: Object.fromEntries(ids.map((id) => [id, ["card-a"]])),
        discardZone: Object.fromEntries(ids.map((id) => [id, ["card-b"]])),
      },
      visibility: {},
    },
  };
}
function getAvailableInteractions(
  bundle: ReturnType<typeof createReducerTestingBundle>,
  state: Parameters<typeof bundle.project>[0]["state"],
  playerId: string,
) {
  const projection = bundle.project({
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
  projection: {
    interactionsByRef: Record<string, T>;
  },
  refs: readonly string[] | undefined,
): T[] {
  return hydrateRefs(projection.interactionsByRef, refs);
}
function makeBundle(
  options: {
    diagnostics?: "verbose";
  } = {},
) {
  const contract = createModel({
    manifest: buildManifest(),
    phases: { takeTurn: z.object({}) },
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const inMain = <Interaction>(interaction: Interaction) => interaction;
  const inBlocked = <Interaction>(interaction: Interaction) => ({
    ...interaction,
    rules: [
      {
        id: "blocked",
        errorCode: "action-unavailable",
        message: "Interaction is blocked by its rule.",
        available: () => false,
      },
    ],
  });
  const ruleBidAmountInput = formInput.number({
    min: 0,
    max: 10,
    defaultValue: 2,
  });
  const enoughGoldRule = contract.phase("takeTurn").rule({
    id: "enough-gold",
    errorCode: "INSUFFICIENT_RESOURCES",
    message: "Need 2 gold.",
    available: ({ state, input }) =>
      (state.table.resources[asPlayerId(input.playerId)]?.gold ?? 0) >= 2,
    validate: ({ state, input }) =>
      (state.table.resources[asPlayerId(input.playerId)]?.gold ?? 0) >=
      input.params.amount
        ? null
        : {
            errorCode: "INSUFFICIENT_RESOURCES",
            message: "Not enough gold.",
          },
  });
  const stringGoldRule = contract.phase("takeTurn").rule({
    id: "string-gold",
    errorCode: "INSUFFICIENT_RESOURCES",
    validate: ({ state, input }) =>
      (state.table.resources[asPlayerId(input.playerId)]?.gold ?? 0) >=
      input.params.amount
        ? null
        : "Need that much gold.",
  });
  const answerTarget = choiceTarget
    .options([{ id: "yes", label: "Yes" }] as const)
    .build();
  const game = contract.assemble({
    initial: {
      public: () => ({}),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "takeTurn",
    phases: {
      takeTurn: contract.phase("takeTurn").define({
        kind: "player",
        name: "Take turn",
        interactions: {
          spendGold: inMain(
            contract.phase("takeTurn").interaction({
              presentation: {
                label: "Spend gold",
                help: "Spend exactly two gold from your current resource pool.",
              },
              commit: { mode: "autoWhenReady" },
              inputs: {},
              rules: [
                {
                  id: "affordable",
                  errorCode: "INSUFFICIENT_RESOURCES",
                  available: ({ q, input }) =>
                    q.player.canAfford(input.playerId, { gold: 2 }),
                  validate: ({ q, input }) =>
                    q.player.canAfford(input.playerId, { gold: 2 }),
                },
              ],
              reduce: () => {},
            }),
          ),
          stageBlocked: inBlocked(
            contract.phase("takeTurn").interaction({
              inputs: {},
              reduce: () => {},
            }),
          ),
          stepBlocked: inBlocked(
            contract.phase("takeTurn").interaction({
              inputs: {},
              reduce: () => {},
            }),
          ),
          answerPrompt: inMain(
            contract.phase("takeTurn").interaction({
              actor: () => "player-2",
              inputs: {
                answer: formInput.choice({
                  defaultValue: () => undefined,
                  choices: (context) =>
                    answerTarget.options(context).map((option) => ({
                      value: option.id,
                      label: option.label ?? option.id,
                    })),
                }),
              },
              reduce: () => {},
            }),
          ),
          allocateGold: inMain(
            contract.phase("takeTurn").interaction({
              inputs: {
                allocation: formInput.resourceMap({
                  resources: [
                    {
                      resourceId: "gold",
                      label: "Gold",
                      max: ({ state, playerId }) =>
                        state.table.resources[asPlayerId(playerId)]?.gold ?? 0,
                    },
                  ],
                }),
              },
              reduce: () => {},
            }),
          ),
          bidGold: inMain(
            contract.phase("takeTurn").interaction({
              inputs: {
                amount: formInput.number({
                  min: 0,
                  max: ({ state, playerId }) =>
                    state.table.resources[asPlayerId(playerId)]?.gold ?? 0,
                  step: 1,
                }),
              },
              reduce: () => {},
            }),
          ),
          ruleGatedBid: inMain(
            contract.phase("takeTurn").interaction({
              presentation: {
                label: "Bid gold",
                help: "Choose a bid that your current gold can pay.",
              },
              inputs: {
                amount: ruleBidAmountInput,
              },
              rules: [enoughGoldRule],
              reduce: () => {},
            }),
          ),
          stringRuleBid: inMain(
            contract.phase("takeTurn").interaction({
              presentation: {
                label: "Choose mode",
              },
              inputs: {
                amount: ruleBidAmountInput,
              },
              rules: [stringGoldRule],
              reduce: () => {},
            }),
          ),
          chooseMode: inMain(
            contract.phase("takeTurn").interaction({
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
              reduce: () => {},
            }),
          ),
          chooseResource: inMain(
            contract.phase("takeTurn").interaction({
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
              reduce: () => {},
            }),
          ),
          choosePlayer: inMain(
            contract.phase("takeTurn").interaction({
              inputs: {
                player: formInput.choice({
                  choices: ({ state, playerId }) =>
                    state.table.playerOrder
                      .filter((id) => id !== playerId)
                      .map((id) => ({ value: id, label: id })),
                  defaultValue: ({ choices }) => choices[0]?.value,
                }),
              },
              reduce: () => {},
            }),
          ),
          choosePlayers: inMain(
            contract.phase("takeTurn").interaction({
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
              reduce: () => {},
            }),
          ),
          playCard: contract.phase("takeTurn").interaction({
            inputs: {
              cardId: cardInput({
                target: cardTarget
                  .zones<
                    {
                      table: RuntimeTableRecord;
                    },
                    string
                  >(["playZone"])
                  .where({
                    id: "card-type",
                    errorCode: "CARD_TYPE_NOT_ALLOWED",
                    test: ({ state, targetId }) =>
                      state.table.cards[targetId]?.cardType === "spell",
                  })
                  .build(),
              }),
            },
            presentation: {
              label: "Play spell",
              help: "Choose a spell from your play zone.",
            },
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
            reduce: () => {},
          }),
        },
      }),
    },
    view: () => ({}),
  });
  return createReducerTestingBundle(game, options);
}
describe("trusted interaction decision pipeline", () => {
  test("dispatch hands explicit paramsSchema data to params-only reducers", async () => {
    const manifest = buildManifest();
    const contract = createModel({
      manifest,
      state: {
        public: z.object({
          selectedCardId: manifest.ids.cardId.nullable(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
      phases: {
        takeTurn: z.object({}),
      },
      errors: {},
    });
    const game = contract.assemble({
      initial: {
        public: () => ({ selectedCardId: null }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            chooseCard: contract.phase("takeTurn").interaction({
              inputs: {},
              paramsSchema: z.object({
                cardId: manifest.ids.cardId,
              }),
              reduce({ input, tx }) {
                tx.patchPublicState({ selectedCardId: input.params.cardId });
                return;
              },
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const result = await bundle.dispatch({
      state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "chooseCard",
        params: { cardId: "card-a" },
      },
    });
    expect(result.kind).toBe("accept");
    if (result.kind !== "accept") return;
    expect(result.state.domain.publicState).toMatchObject({
      selectedCardId: "card-a",
    });
  });
  test("projected descriptors carry stable descriptor digests and seat-scoped initial draft digests", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const oneSeatProjection = bundle.project({
      state,
      playerIds: ["player-1"],
    });
    const shiftedSeatProjection = bundle.project({
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
  test("rules share descriptor and submit decisions", async () => {
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
        reason: "Interaction is blocked by its rule.",
      },
    });
    expect(
      descriptors.find((d) => d.interactionId === "stepBlocked"),
    ).toMatchObject({
      availability: {
        status: "blocked",
        reason: "Interaction is blocked by its rule.",
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
      message: "Interaction is blocked by its rule.",
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
      message: "Interaction is blocked by its rule.",
    });
  });
  test("descriptor projection carries authored presentation and fallback labels", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const descriptors = getAvailableInteractions(bundle, state, "player-1");
    expect(
      descriptors.find(
        (descriptor) => descriptor.interactionId === "spendGold",
      ),
    ).toMatchObject({
      label: "Spend gold",
      help: "Spend exactly two gold from your current resource pool.",
      availability: {
        status: "blocked",
        reason: "INSUFFICIENT_RESOURCES",
      },
    });
    expect(
      descriptors.find(
        (descriptor) => descriptor.interactionId === "stageBlocked",
      ),
    ).toMatchObject({
      label: "Stage Blocked",
      availability: {
        status: "blocked",
        reason: "Interaction is blocked by its rule.",
      },
    });
  });
  test("automatic zone projection respects hidden zones and component visibility", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    state.domain.table.zones.visibility.playZone = "hidden";
    const hidden = bundle.project({
      state,
      playerIds: ["player-1", "player-2"],
    });
    expect(hidden.seats["player-1"].zones).not.toHaveProperty("playZone");
    expect(hidden.seats["player-2"].zones).not.toHaveProperty("playZone");
    state.domain.table.zones.visibility.playZone = "ownerOnly";
    state.domain.table.visibility["card-a"] = {
      faceUp: false,
      visibleTo: ["player-1"],
    };
    const visible = bundle.project({
      state,
      playerIds: ["player-1", "player-2"],
    });
    expect(visible.seats["player-1"].zones.playZone.cardIds).toEqual([
      "card-a",
      "card-b",
    ]);
    expect(visible.seats["player-2"].zones.playZone.cardIds).toEqual([
      "card-b",
    ]);
    expect(
      visible.seats["player-2"].zones.playZone.cardViewsById,
    ).not.toHaveProperty("card-a");
  });

  test("dynamic projection omits removed guidance metadata", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.project({
      state,
      playerIds: ["player-1"],
    });
    expect(projection).not.toHaveProperty("guidance");
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
      kind: "action",
      availability: { status: "available" },
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
      errorCode: "NOT_YOUR_TURN",
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
        status: "blocked",
        reason: "INSUFFICIENT_RESOURCES",
      },
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
      step: null,
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
    const projection = bundle.project({
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
        availability: { status: "available" },
      },
    ]);
    expect(playZone?.playableByCardId["card-b"]).toEqual([]);
    expect(
      await bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "playCard",
          params: { cardId: "card-a" },
        },
      }),
    ).toMatchObject({ valid: false, message: "Card is blocked." });
  });
  test("hand zones derive authored hand interactions from card inputs", async () => {
    const contract = createModel({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const playZoneTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();
    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            playSelected: contract.phase("takeTurn").interaction({
              inputs: {
                cardId: cardInput({ target: playZoneTarget }),
              },
              reduce: () => {},
            }),
            playMany: contract.phase("takeTurn").interaction({
              inputs: {
                cardIds: many(cardInput({ target: playZoneTarget }), {
                  count: 2,
                  distinct: true,
                }),
              },
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.project({
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
    const contract = createModel({
      manifest: buildTwoZoneManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            playWithChoices: contract.phase("takeTurn").interaction({
              inputs: {
                cardId: cardInput({
                  target: cardTarget
                    .zones<
                      {
                        table: RuntimeTableRecord;
                      },
                      string
                    >(["playZone"])
                    .where({
                      id: "card-type",
                      errorCode: "CARD_TYPE_NOT_ALLOWED",
                      test: ({ state, targetId }) =>
                        state.table.cards[targetId]?.cardType === "spell",
                    })
                    .build(),
                }),
                selectedCardIds: formInput.choiceList({
                  choices: [{ value: "card-a", label: "Card A" }],
                  defaultValue: [],
                }),
              },
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
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
  test("default commit policy follows the current input", async () => {
    const contract = createModel({
      manifest: buildTwoZoneManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const playZoneTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();
    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            formOnly: contract.phase("takeTurn").interaction({
              inputs: {
                choice: formInput.choice({
                  choices: [{ value: "one", label: "One" }],
                  defaultValue: "one",
                }),
              },
              reduce: () => {},
            }),
            targetOnly: contract.phase("takeTurn").interaction({
              inputs: {
                cardId: cardInput({ target: playZoneTarget }),
              },
              reduce: () => {},
            }),
            targetThenForm: contract.phase("takeTurn").interaction({
              steps: new InteractionSteps()
                .input("cardId", cardInput({ target: playZoneTarget }))
                .input("choice", ({ selected }) =>
                  formInput.choice({
                    choices: [
                      { value: `resolve-${selected.cardId}`, label: "Resolve" },
                    ],
                    defaultValue: () => undefined,
                  }),
                ),
              reduce: () => {},
            }),
            formThenTarget: contract.phase("takeTurn").interaction({
              steps: new InteractionSteps()
                .input(
                  "mode",
                  formInput.choice({
                    choices: [{ value: "play", label: "Play" }],
                    defaultValue: () => undefined,
                  }),
                )
                .input("cardId", cardInput({ target: playZoneTarget })),
              reduce: () => {},
            }),
            independentMixed: contract.phase("takeTurn").interaction({
              inputs: {
                cardId: cardInput({ target: playZoneTarget }),
                choice: formInput.choice({
                  choices: [{ value: "one", label: "One" }],
                  defaultValue: "one",
                }),
              },
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
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
    expect(commitModeFor("targetThenForm")).toBe("autoWhenReady");
    expect(commitModeFor("formThenTarget")).toBe("manual");
    expect(commitModeFor("independentMixed")).toBe("manual");
  });
  test("many-input interactions cannot opt into auto submit", () => {
    const contract = createModel({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const playZoneTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();
    expect(contract.contract.phaseNames).toEqual(["takeTurn"]);
    expect(() =>
      contract.phase("takeTurn").interaction({
        commit: { mode: "autoWhenReady" } as never,
        inputs: {
          cardIds: many(cardInput({ target: playZoneTarget }), {
            count: 2,
            distinct: true,
          }),
        },
        reduce: () => {},
      }),
    ).toThrow(
      'defineInteraction: interactions with many(...) inputs must use commit: { mode: "manual" }.',
    );
  });
  test("a committed selection controls the next target authority", async () => {
    const contract = createModel({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            playWithMode: contract.phase("takeTurn").interaction({
              steps: new InteractionSteps()
                .input(
                  "mode",
                  formInput.choice({
                    choices: [
                      { value: "disabled", label: "Disabled" },
                      { value: "enabled", label: "Enabled" },
                    ],
                    defaultValue: () => undefined,
                  }),
                )
                .input("cardId", ({ selected }) =>
                  cardInput({
                    target: cardTarget
                      .zones(["playZone"])
                      .where({
                        id: "mode-enabled",
                        errorCode: "MODE_BLOCKED",
                        test: () => selected.mode === "enabled",
                      })
                      .build(),
                  }),
                ),
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const state = await bundle.initialize({
      table: createTwoZoneTable(),
      playerIds: ["player-1", "player-2"],
    });
    const first = await bundle.dispatch({
      state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "playWithMode",
        params: { mode: "enabled" },
      },
    });
    expect(first.kind).toBe("accept");
    if (first.kind !== "accept") return;
    await expect(
      bundle.validateInput({
        state: first.state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "playWithMode",
          params: { cardId: "card-a" },
        },
      }),
    ).resolves.toMatchObject({ valid: true });
    expect(
      bundle.enumerateInteractionParams({
        state: first.state,
        playerId: "player-1",
        interactionId: "playWithMode",
        maxEvaluations: 100,
      }),
    ).toMatchObject({
      inputSatisfiability: { status: "yes" },
      enumeration: {
        status: "enumerated",
        assignments: [{ cardId: "card-a" }],
      },
    });
    const disabled = await bundle.dispatch({
      state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "playWithMode",
        params: { mode: "disabled" },
      },
    });
    if (disabled.kind !== "accept")
      throw new Error("first step must not enumerate future domains");
    await expect(
      bundle.validateInput({
        state: disabled.state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "playWithMode",
          params: { cardId: "card-a" },
        },
      }),
    ).resolves.toMatchObject({ valid: false });
  });
  test("hand zones bind playable cards to the matching card input zone", async () => {
    const contract = createModel({
      manifest: buildTwoZoneManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const discardTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["discardZone"])
      .build();
    const playTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();
    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            inspectThenPlay: contract.phase("takeTurn").interaction({
              inputs: {
                discardCardId: cardInput({ target: discardTarget }),
                cardId: cardInput({ target: playTarget }),
              },
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const state = await bundle.initialize({
      table: createTwoZoneTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.project({
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
    const contract = createModel({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({ submitted: z.array(z.string()) }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const playZoneTarget = cardTarget
      .zones<never, "card-a" | "card-b">(["playZone"])
      .build();
    const game = contract.assemble({
      initial: {
        public: () => ({ submitted: [] }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "simultaneousPlayer",
          initialState: () => ({}),
          actors: ({ q }) => q.player.order(),
          submit: {
            inputs: {
              cardIds: many(cardInput({ target: playZoneTarget }), {
                count: 1,
                distinct: true,
              }),
            },
          },
          resolve: () => {},
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.project({
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
    const afterSubmit = bundle.project({
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
    const projection = bundle.project({
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
    const contract = createModel({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            castSpell: contract.phase("takeTurn").interaction({
              inputs: {
                cardId: cardInput({
                  target: cardTarget
                    .zones<
                      {
                        table: RuntimeTableRecord;
                      },
                      string
                    >(["playZone"])
                    .where({
                      id: "card-type",
                      errorCode: "CARD_TYPE_NOT_ALLOWED",
                      test: ({ state, targetId }) =>
                        state.table.cards[targetId]?.cardType === "spell",
                    })
                    .build(),
                }),
              },
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.project({
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
      errorCode: "CARD_TYPE_NOT_ALLOWED",
    });
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
  test("synchronizes proven input emptiness with production descriptors", async () => {
    const contract = createModel({
      manifest: buildManifest(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            noLegalInput: contract.phase("takeTurn").interaction({
              inputs: {
                task: formInput.choice<string>({
                  choices: () => [],
                  defaultValue: () => undefined,
                }),
              },
              reduce: () => {},
            }),
            ruleRejectedInput: contract.phase("takeTurn").interaction({
              inputs: {
                task: formInput.choice({
                  choices: [
                    { value: "one", label: "One" },
                    { value: "two", label: "Two" },
                  ],
                  defaultValue: () => undefined,
                }),
              },
              rules: [
                {
                  id: "reject-every-task",
                  errorCode: "TASK_REJECTED",
                  validate: () => false,
                },
              ],
              reduce: () => {},
            }),
            costFilteredInput: contract.phase("takeTurn").interaction({
              inputs: {
                amount: formInput.number({ min: 1, max: 2, defaultValue: 2 }),
              },
              rules: [
                {
                  id: "affordable",
                  errorCode: "INSUFFICIENT_RESOURCES",
                  validate: ({ q, input }) =>
                    q.player.canAfford(input.playerId, {
                      gold: input.params.amount,
                    }),
                },
              ],
              reduce: () => {},
            }),
            opaqueInput: contract.phase("takeTurn").interaction({
              inputs: {},
              paramsSchema: z.object({ answer: z.string() }) as never,
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const state = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const descriptors = getAvailableInteractions(bundle, state, "player-1");
    expect(
      descriptors.find(
        (descriptor) => descriptor.interactionId === "noLegalInput",
      ),
    ).toMatchObject({
      availability: {
        status: "blocked",
        code: "NO_LEGAL_INPUT",
        reason: "No legal input is currently available.",
      },
    });
    expect(
      descriptors.find(
        (descriptor) => descriptor.interactionId === "opaqueInput",
      ),
    ).toMatchObject({ availability: { status: "available" } });
    expect(
      descriptors.find(
        (descriptor) => descriptor.interactionId === "ruleRejectedInput",
      ),
    ).toMatchObject({
      availability: {
        status: "available",
      },
    });
    expect(
      descriptors.find(
        (descriptor) => descriptor.interactionId === "costFilteredInput",
      ),
    ).toMatchObject({ availability: { status: "available" } });
    expect(
      bundle.resolveInteractionActionability({
        state,
        playerId: "player-1",
        interactionId: "noLegalInput",
      }),
    ).toMatchObject({
      found: true,
      visible: true,
      inputSatisfiability: { status: "no" },
    });
    expect(
      bundle.resolveInteractionActionability({
        state,
        playerId: "player-1",
        interactionId: "ruleRejectedInput",
      }),
    ).toMatchObject({
      found: true,
      visible: true,
      descriptor: {
        availability: { status: "available" },
      },
      inputSatisfiability: { status: "yes" },
    });
    expect(
      await bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "ruleRejectedInput",
          params: { task: "one" },
        },
      }),
    ).toMatchObject({ valid: false, errorCode: "TASK_REJECTED" });
    expect(
      bundle.enumerateInteractionParams({
        state,
        playerId: "player-1",
        interactionId: "ruleRejectedInput",
        maxEvaluations: 100,
      }),
    ).toMatchObject({
      found: true,
      visible: true,
      inputSatisfiability: { status: "yes" },
      enumeration: { status: "enumerated", assignments: [] },
    });
    expect(
      bundle.enumerateInteractionParams({
        state,
        playerId: "player-1",
        interactionId: "costFilteredInput",
        maxEvaluations: 100,
      }),
    ).toMatchObject({
      found: true,
      visible: true,
      inputSatisfiability: { status: "yes" },
      enumeration: {
        status: "enumerated",
        assignments: [{ amount: 1 }],
      },
    });
    expect(
      bundle.enumerateInteractionParams({
        state,
        playerId: "player-1",
        interactionId: "opaqueInput",
        maxEvaluations: 100,
      }),
    ).toMatchObject({
      found: true,
      visible: true,
      inputSatisfiability: { status: "notEnumerable" },
      enumeration: { status: "notEnumerable", assignments: [] },
    });
  });
});
