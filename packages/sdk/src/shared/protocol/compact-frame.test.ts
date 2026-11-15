import { describe, expect, test } from "vitest";
import {
  CompactGameplayFrameSchema,
  hydrateCompactGameplayFrame,
} from "./compact-frame.js";
import {
  materializeCompactGameplayFrame,
  materializePluginGameplayFrame,
} from "./projection.js";
import {
  InteractionDescriptorSchema,
  SeatProjectionBundleSchema,
  PluginGameplayFrameSchema,
} from "./schema.js";

function input(): Parameters<typeof materializeCompactGameplayFrame>[0] {
  const cardIds = Array.from({ length: 36 }, (_, index) => `card-${index}`);
  const descriptor = InteractionDescriptorSchema.parse({
    kind: "action",
    phaseName: "play",
    interactionKey: "play.move",
    interactionId: "move",
    label: "Move",
    commit: { mode: "manual" },
    availability: { status: "available" },
    inputs: [
      {
        key: "card",
        kind: "form",
        domain: {
          type: "choice",
          choices: cardIds.map((value) => ({ value, label: value })),
        },
      },
    ],
  });
  return {
    players: ["alice", "bob"],
    sessionId: "session",
    version: 3,
    actionSetVersion: "actions-3",
    perspectivePlayerId: "alice",
    currentPhase: "play",
    activePlayers: ["alice"],
    causedBy: "request-1",
    dynamicProjection: SeatProjectionBundleSchema.parse({
      referenceBasis: { sessionId: "session", version: 3 },
      interactionsByRef: {
        move: descriptor,
        zoneOnly: { ...descriptor, interactionId: "flip" },
        private: { ...descriptor, label: "Bob secret" },
        unused: { ...descriptor, label: "Unused secret" },
      },
      seats: {
        alice: {
          events: [],
          view: { score: 5 },
          availableInteractionRefs: ["move"],
          zones: {
            deck: {
              table: {
                tiles: [],
                cardIds,
                cardViewsById: {},
                cardBacksById: Object.fromEntries(
                  cardIds.map((id) => [id, "back.webp"]),
                ),
                playableByCardId: Object.fromEntries(
                  cardIds.map((id) => [id, ["move", "zoneOnly"]]),
                ),
                shuffled: true,
              },
            },
          },
        },
        bob: {
          events: [],
          view: { secret: "Bob private view" },
          availableInteractionRefs: ["private"],
        },
      },
    }),
  };
}

describe("compact gameplay snapshots", () => {
  test("publishes only the selected seat's reachable descriptors and hydrates identically", () => {
    const source = input();
    const compact = materializeCompactGameplayFrame(source);
    expect(Object.keys(compact.interactionsByRef)).toEqual([
      "move",
      "zoneOnly",
    ]);
    expect(JSON.stringify(compact)).not.toMatch(/Bob|Unused/);
    const admitted = CompactGameplayFrameSchema.parse(compact);
    const hydrated = hydrateCompactGameplayFrame(admitted);
    expect(hydrated).toEqual(materializePluginGameplayFrame(source));
    expect(PluginGameplayFrameSchema.parse(hydrated)).toEqual(hydrated);
    expect(hydrated.zones.deck.table.playableByCardId["card-0"][0]).toBe(
      hydrated.availableInteractions[0],
    );
    expect(hydrated.zones.deck.table.playableByCardId["card-35"][0]).toBe(
      hydrated.availableInteractions[0],
    );
    expect(Buffer.byteLength(JSON.stringify(compact))).toBeLessThan(
      Buffer.byteLength(JSON.stringify(hydrated)) * 0.15,
    );
  });

  test("an absent seat cannot receive the registry or private view", () => {
    const compact = materializeCompactGameplayFrame({
      ...input(),
      perspectivePlayerId: "spectator",
    });
    expect(compact.interactionsByRef).toEqual({});
    expect(compact.availableInteractionRefs).toEqual([]);
    expect(compact.zones).toEqual({});
    expect(compact.view).toBeNull();
  });

  test.each(["sessionId", "version"] as const)(
    "rejects a mismatching projection %s",
    (field) => {
      const source = input();
      expect(() =>
        materializeCompactGameplayFrame({
          ...source,
          [field]: field === "version" ? 9 : "other",
        }),
      ).toThrow("reference basis");
    },
  );

  test("rejects missing references at producer and receiver boundaries", () => {
    const source = input();
    const broken = {
      ...source,
      dynamicProjection: { ...source.dynamicProjection, interactionsByRef: {} },
    };
    expect(() => materializeCompactGameplayFrame(broken)).toThrow(
      "missing from interactionsByRef",
    );
    const compact = materializeCompactGameplayFrame(source);
    expect(
      CompactGameplayFrameSchema.safeParse({
        ...compact,
        interactionsByRef: {},
      }).success,
    ).toBe(false);
    expect(
      CompactGameplayFrameSchema.safeParse({
        ...compact,
        interactionsByRef: { move: compact.interactionsByRef.move },
      }).success,
    ).toBe(false);
    expect(() =>
      materializeCompactGameplayFrame({
        ...source,
        dynamicProjection: {
          ...source.dynamicProjection,
          interactionsByRef: {
            move: source.dynamicProjection.interactionsByRef!.move,
          },
        },
      }),
    ).toThrow("zoneOnly");
    expect(
      CompactGameplayFrameSchema.safeParse({
        ...compact,
        availableInteractionRefs: ["missing"],
      }).success,
    ).toBe(false);
    expect(
      CompactGameplayFrameSchema.safeParse({
        ...compact,
        interactionsByRef: {
          ...compact.interactionsByRef,
          extra: compact.interactionsByRef.move,
        },
      }).success,
    ).toBe(false);
  });

  test("rejects malformed descriptors once at compact admission", () => {
    const compact = materializeCompactGameplayFrame(input());
    expect(
      CompactGameplayFrameSchema.safeParse({
        ...compact,
        interactionsByRef: {
          ...compact.interactionsByRef,
          move: { ...compact.interactionsByRef.move, inputs: "invalid" },
        },
      }).success,
    ).toBe(false);
  });
});
