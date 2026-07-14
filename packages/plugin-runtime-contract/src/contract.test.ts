import { describe, expect, test } from "bun:test";
import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
  HostToPluginEnvelopeSchema,
  PluginGameplayFrameSchema,
  computePluginActionSetVersion,
  digestPluginGameplayFrame,
  digestPluginRuntimeJson,
  encodeCanonicalPluginRuntimeJson,
  materializePluginGameplayFrame,
  type InteractionDescriptor,
  type PluginProtocolEnvelope,
  type ReducerBoardStaticProjection,
  type ReducerSeatProjectionBundle,
} from "./index.js";

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
    gameVersion: 42,
    actionSetVersion: "sha256:actions",
    perspectivePlayerId: "player-1",
    sharedView: {
      boardStatic: null,
      dynamicView: null,
    },
    view: { score: 7 },
    flow: {
      currentPhase: "play",
      currentStage: "play",
      activePlayers: ["player-1"],
      simultaneousPhase: null,
    },
    availableInteractions: [claimDescriptor],
    recentEvents: [],
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

describe("@dreamboard-games/plugin-runtime-contract", () => {
  test("strict frame and protocol schemas accept version 3 gameplay frames", () => {
    const frame = PluginGameplayFrameSchema.parse(baseFrame());
    expect(frame.gameVersion).toBe(42);

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

    expect(envelope.version).toBe(3);
    expect(() =>
      PluginGameplayFrameSchema.parse({ ...baseFrame(), syncId: 9 }),
    ).toThrow();
    expect(() =>
      HostToPluginEnvelopeSchema.parse({ ...envelope, version: 2 }),
    ).toThrow();
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
          gameVersion: 3,
          actionSetVersion: "sha256:frame-3-actions",
        },
      },
    });

    expect(envelope.sequence).toBe(101);
    expect(envelope.payload.type).toBe("gameplay.frame");
    if (envelope.payload.type === "gameplay.frame") {
      expect(envelope.payload.frame.gameVersion).toBe(3);
      expect(envelope.payload.frame.actionSetVersion).toBe(
        "sha256:frame-3-actions",
      );
    }
  });

  test("materializes a plugin gameplay frame from reducer projection refs", () => {
    const actionSetVersion = computePluginActionSetVersion({
      gameVersion: 8,
      availableInteractions: [claimDescriptor],
    });
    const frame = materializePluginGameplayFrame({
      currentPhase: "play",
      activePlayers: ["player-1"],
      perspectivePlayerId: "player-1",
      gameVersion: 8,
      actionSetVersion,
      staticProjection: {
        view: { board: { id: "shared-board" } },
        hash: "static-hash",
        manifestVersion: "manifest-v1",
      },
      dynamicProjection: {
        currentStage: "play",
        stageSeats: ["player-1"],
        simultaneousPhase: null,
        guidance: {
          phase: {
            id: "play",
            label: "Play",
            summary: "Claim a card.",
          },
          setup: {
            profileId: "standard",
            name: "Standard",
            steps: [{ id: "shuffle", label: "Shuffle" }],
          },
        },
        recentEvents: [
          {
            kind: "systemAction",
            version: 8,
            index: 0,
            procedureId: "river-advance",
            title: "The river advanced",
            details: [{ label: "Revealed", value: "Storm" }],
          },
        ],
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
      },
    });

    expect(frame.gameVersion).toBe(8);
    expect(frame.actionSetVersion).toBe(actionSetVersion);
    expect(frame.view).toEqual({
      handSize: 1,
    });
    expect(frame.sharedView).toEqual({
      boardStatic: { board: { id: "shared-board" } },
      dynamicView: { market: ["card-1"] },
    });
    expect(frame.availableInteractions).toEqual([claimDescriptor]);
    expect(frame.guidance).toEqual({
      phase: {
        id: "play",
        label: "Play",
        summary: "Claim a card.",
      },
      setup: {
        profileId: "standard",
        name: "Standard",
        steps: [{ id: "shuffle", label: "Shuffle" }],
      },
    });
    expect(frame.recentEvents).toEqual([
      {
        kind: "systemAction",
        version: 8,
        index: 0,
        procedureId: "river-advance",
        title: "The river advanced",
        details: [{ label: "Revealed", value: "Storm" }],
      },
    ]);
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
      gameVersion: 8,
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
      handSize: 1,
    });
    expect(frame.sharedView).toEqual({
      boardStatic: { board: { id: "shared-board" } },
      dynamicView: null,
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
        gameVersion: 8,
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
      gameVersion: 1,
      availableInteractions: [claimDescriptor],
    });
    const second = computePluginActionSetVersion({
      gameVersion: 1,
      availableInteractions: [reorderedDescriptor],
    });
    const nextVersion = computePluginActionSetVersion({
      gameVersion: 2,
      availableInteractions: [claimDescriptor],
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(nextVersion).not.toBe(first);
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
