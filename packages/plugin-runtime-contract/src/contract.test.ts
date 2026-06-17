import { describe, expect, test } from "bun:test";
import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
  HostToPluginEnvelopeSchema,
  PluginGameplayFrameSchema,
  computePluginActionSetVersion,
  digestPluginGameplayFrame,
  materializePluginGameplayFrame,
  type InteractionDescriptor,
  type PluginProtocolEnvelope,
} from "./index.js";

const claimDescriptor = {
  kind: "action",
  phaseName: "play",
  interactionKey: "claim",
  interactionId: "claim:player-1",
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
      board: { id: "shared-board" },
      handSize: 1,
    });
    expect(frame.availableInteractions).toEqual([claimDescriptor]);
    expect(frame.zones.hand?.playableByCardId["card-1"]).toEqual([
      claimDescriptor,
    ]);
    expect(digestPluginGameplayFrame(frame)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test("action set hashing is canonical and sensitive to gameplay basis", () => {
    const reorderedDescriptor = {
      availability: { status: "available" },
      inputs: claimDescriptor.inputs,
      commit: { mode: "manual" },
      interactionId: "claim:player-1",
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
});
