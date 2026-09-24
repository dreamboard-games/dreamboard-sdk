import { Zod as ReducerWireZod } from "@dreamboard-games/reducer-contract";
import { describe, expect, test } from "vitest";
import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
  HostToPluginEnvelopeSchema,
  InteractionResultSchema,
  PluginGameplayFrameSchema,
  SubmitInteractionCommandSchema,
  CancelInteractionCommandSchema,
  computePluginActionSetVersion,
  digestPluginGameplayFrame,
  digestPluginRuntimeJson,
  encodeCanonicalPluginRuntimeJson,
  materializePluginGameplayFrame,
  type InteractionDescriptor,
  type PluginProtocolEnvelope,
  type ReducerBoardStaticProjection,
  type ReducerSeatProjectionBundle,
} from "../../plugin-runtime-contract.js";

const claimDescriptor = {
  kind: "action",
  phaseName: "play",
  interactionKey: "claim",
  interactionId: "claim:player-1",
  label: "Claim",
  commit: { mode: "manual" },
  inputs: [
    {
      key: "card",
      kind: "card",
      domain: {
        type: "cardTarget",
        projection: "resolved",
        targetKind: "card",
        zoneIds: ["hand"],
        eligibleTargets: ["card-1"],
      },
    },
  ],
  availability: { status: "available" },
} satisfies InteractionDescriptor;

function baseFrame() {
  return {
    basis: {
      version: 42,
      actionSetVersion: "sha256:actions",
      perspectivePlayerId: "player-1",
    },
    view: { score: 7 },
    flow: {
      currentPhase: "play",
      currentStage: "play",
      activePlayers: ["player-1"],
      simultaneousPhase: null,
    },
    availableInteractions: [claimDescriptor],
    zones: {
      hand: {
        cardIds: ["card-1"],
        cardViewsById: {
          "card-1": '{"rank":"A"}',
        },
        playableByCardId: {
          "card-1": [claimDescriptor],
        },
      },
    },
  };
}

describe("shared plugin runtime contract", () => {
  test("strict frame and protocol schemas accept version 5 gameplay frames", () => {
    const frame = PluginGameplayFrameSchema.parse(baseFrame());
    expect(frame.basis.version).toBe(42);

    const envelope = HostToPluginEnvelopeSchema.parse({
      protocol: DREAMBOARD_PLUGIN_PROTOCOL,
      version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
      channelId: "channel-1",
      sequence: 9,
      payload: {
        type: "gameplay.frame",
        frame,
      },
    } satisfies PluginProtocolEnvelope<unknown>);

    expect(envelope.version).toBe(5);
    expect(() =>
      PluginGameplayFrameSchema.parse({ ...baseFrame(), syncId: 9 }),
    ).toThrow();
    expect(() =>
      HostToPluginEnvelopeSchema.parse({ ...envelope, version: 2 }),
    ).toThrow();
  });

  test("cancel uses the same basis and action identity without submission params", () => {
    const cancel = {
      type: "interaction.cancel",
      clientActionId: "cancel-1",
      basis: baseFrame().basis,
      interactionId: "claim",
    };
    expect(CancelInteractionCommandSchema.parse(cancel)).toEqual(cancel);
    expect(
      CancelInteractionCommandSchema.safeParse({ ...cancel, params: {} })
        .success,
    ).toBe(false);
    expect(
      CancelInteractionCommandSchema.safeParse({ ...cancel, basis: undefined })
        .success,
    ).toBe(false);
  });

  test("envelope sequence is distinct from gameplay revision", () => {
    const envelope = HostToPluginEnvelopeSchema.parse({
      protocol: DREAMBOARD_PLUGIN_PROTOCOL,
      version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
      channelId: "channel-1",
      sequence: 101,
      payload: {
        type: "gameplay.frame",
        frame: {
          ...baseFrame(),
          basis: {
            ...baseFrame().basis,
            version: 3,
            actionSetVersion: "sha256:frame-3-actions",
          },
        },
      },
    });

    expect(envelope.sequence).toBe(101);
    expect(envelope.payload.type).toBe("gameplay.frame");
    if (envelope.payload.type === "gameplay.frame") {
      expect(envelope.payload.frame.basis.version).toBe(3);
      expect(envelope.payload.frame.basis.actionSetVersion).toBe(
        "sha256:frame-3-actions",
      );
    }
  });

  test("materializes a plugin gameplay frame from reducer projection refs", () => {
    const actionSetVersion = computePluginActionSetVersion({
      version: 8,
      availableInteractions: [claimDescriptor],
    });
    const frame = materializePluginGameplayFrame({
      currentPhase: "play",
      activePlayers: ["player-1"],
      perspectivePlayerId: "player-1",
      version: 8,
      actionSetVersion,
      staticProjection: {
        view: { board: { id: "shared-board" } },
        hash: "static-hash",
        manifestVersion: "manifest-v1",
      },
      dynamicProjection: ReducerWireZod.SeatProjectionBundleSchema.parse({
        currentStage: "play",
        stageSeats: ["player-1"],
        simultaneousPhase: null,
        sharedView: { market: ["card-1"] },
        interactionsByRef: {
          "claim-ref": claimDescriptor,
        },
        seats: {
          "player-1": {
            view: { handSize: 1 },
            availableInteractionRefs: ["claim-ref"],
            zones: {
              hand: {
                cardIds: ["card-1"],
                cardViewsById: {
                  "card-1": '{"rank":"A"}',
                },
                playableByCardId: {
                  "card-1": ["claim-ref"],
                },
              },
            },
          },
        },
      }),
    });

    expect(frame.basis).toEqual({
      version: 8,
      actionSetVersion,
      perspectivePlayerId: "player-1",
    });
    expect(frame.view).toEqual({
      board: { id: "shared-board" },
      market: ["card-1"],
      handSize: 1,
    });
    expect(frame.availableInteractions).toEqual([claimDescriptor]);
    expect(frame).not.toHaveProperty("guidance");
    expect(frame.zones.hand?.playableByCardId["card-1"]).toEqual([
      claimDescriptor,
    ]);
    expect(digestPluginGameplayFrame(frame)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test("materialization omits optional undefined object fields from reducer projections", () => {
    const frame = materializePluginGameplayFrame({
      currentPhase: "play",
      activePlayers: ["player-1"],
      perspectivePlayerId: "player-1",
      version: 8,
      actionSetVersion: "sha256:actions",
      staticProjection: {
        view: { board: { id: "shared-board", optional: undefined } },
        hash: undefined,
        manifestVersion: "manifest-v1",
      } as unknown as ReducerBoardStaticProjection,
      dynamicProjection: {
        currentStage: "play",
        schedulerFlow: {
          version: 1,
          activePlayerIds: ["player-1"],
          pendingPlayerIds: [],
          continuationDependencies: [],
        },
        interactionsByRef: {
          "claim-ref": {
            ...claimDescriptor,
            help: undefined,
            inputs: [
              {
                key: "card",
                kind: "choice",
                defaultValue: undefined,
                domain: {
                  type: "choice",
                  choices: [
                    {
                      value: "card-1",
                      label: "Card 1",
                      icon: undefined,
                      disabled: undefined,
                    },
                  ],
                },
              },
            ],
          },
        },
        seats: {
          "player-1": {
            view: { handSize: 1, optional: undefined },
            availableInteractionRefs: ["claim-ref"],
          },
        },
      } as unknown as ReducerSeatProjectionBundle,
    });

    expect(frame.view).toEqual({
      board: { id: "shared-board" },
      handSize: 1,
    });
    expect(frame.availableInteractions[0]?.inputs[0]?.domain).toEqual({
      type: "choice",
      choices: [{ value: "card-1", label: "Card 1" }],
    });
    expect(JSON.stringify(frame)).not.toContain("schedulerFlow");
  });

  test("materialization rejects undefined array entries in reducer projections", () => {
    expect(() =>
      materializePluginGameplayFrame({
        currentPhase: "play",
        activePlayers: ["player-1"],
        perspectivePlayerId: "player-1",
        version: 8,
        actionSetVersion: "sha256:actions",
        dynamicProjection: {
          interactionsByRef: {},
          seats: {
            "player-1": {
              availableInteractionRefs: [undefined],
            },
          },
        } as unknown as ReducerSeatProjectionBundle,
      }),
    ).toThrow("runtime JSON contains unsupported undefined value");
  });

  test("action set hashing is canonical and sensitive to gameplay basis", () => {
    const reorderedDescriptor = {
      availability: { status: "available" },
      inputs: claimDescriptor.inputs,
      commit: { mode: "manual" },
      interactionId: "claim:player-1",
      label: "Claim",
      interactionKey: "claim",
      phaseName: "play",
      kind: "action",
    } satisfies InteractionDescriptor;

    const first = computePluginActionSetVersion({
      version: 1,
      availableInteractions: [claimDescriptor],
    });
    const second = computePluginActionSetVersion({
      version: 1,
      availableInteractions: [reorderedDescriptor],
    });
    const nextVersion = computePluginActionSetVersion({
      version: 2,
      availableInteractions: [claimDescriptor],
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(nextVersion).not.toBe(first);
  });

  test("frame basis rejects the removed generation field", () => {
    expect(() =>
      PluginGameplayFrameSchema.parse({
        ...baseFrame(),
        basis: { ...baseFrame().basis, generation: 1 },
      }),
    ).toThrow();
  });

  test("canonical command and acknowledgement use one client action id", () => {
    const command = SubmitInteractionCommandSchema.parse({
      type: "interaction.submit",
      clientActionId: "action-1",
      basis: baseFrame().basis,
      interactionId: claimDescriptor.interactionId,
      params: "scalar-value",
    });
    const result = InteractionResultSchema.parse({
      type: "interaction.result",
      clientActionId: command.clientActionId,
      accepted: true,
    });

    expect(result).toEqual({
      type: "interaction.result",
      clientActionId: "action-1",
      accepted: true,
    });
    expect(() =>
      PluginGameplayFrameSchema.parse({
        ...baseFrame(),
        sharedView: { boardStatic: null, dynamicView: null },
      }),
    ).toThrow();
  });

  test("canonical JSON omits undefined object fields but rejects undefined arrays", () => {
    expect(
      encodeCanonicalPluginRuntimeJson({
        action: "claim",
        optional: undefined,
      }),
    ).toBe('{"action":"claim"}');
    expect(() => encodeCanonicalPluginRuntimeJson([undefined])).toThrow(
      "runtime JSON contains unsupported undefined value",
    );
  });

  test("runtime JSON digest uses a fixed SHA-256 vector", () => {
    expect(digestPluginRuntimeJson({ b: 2, a: 1 })).toBe(
      "sha256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
    );
  });
});
