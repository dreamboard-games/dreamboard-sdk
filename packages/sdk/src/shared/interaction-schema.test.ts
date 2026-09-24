import { describe, expect, test } from "vitest";
import {
  InputDomainSchema,
  InteractionDescriptorSchema,
} from "./interaction-schema";
import { SeatProjectionBundleSchema } from "./runtime-schema";
import {
  encodeCanonicalPluginRuntimeJson,
  digestPluginRuntimeJson,
} from "./protocol/json";

const descriptor = {
  kind: "action",
  phaseName: "play",
  interactionKey: "play.pick",
  interactionId: "pick",
  label: "Pick",
  commit: { mode: "manual" },
  availability: { status: "available" },
  inputs: [
    {
      key: "choice",
      kind: "form",
      domain: { type: "choice", choices: [{ value: null, label: "Nobody" }] },
    },
  ],
};

describe("canonical interaction admission", () => {
  test.each([
    { type: "made-up" },
    { type: "choice", choices: 123 },
    { type: "choice", choices: [{ value: "a" }] },
    { type: "choiceList", choices: [{ value: null, label: "Invalid" }] },
    { type: "boardTarget", boardId: "map", eligibleTargets: [] },
    {
      type: "cardTarget",
      projection: "resolved",
      targetKind: "card",
      zoneIds: [],
      eligibleTargets: [1],
    },
    { type: "boundedNumber", min: 0, max: Infinity },
    { type: "resourceMap", resources: [{ resourceId: "wood", min: 0 }] },
    { type: "choice", choices: [], extra: true },
  ])("rejects malformed domain %# at worker and UI authority", (domain) => {
    expect(InputDomainSchema.safeParse(domain).success).toBe(false);
    const invalid = {
      ...descriptor,
      inputs: [{ ...descriptor.inputs[0], domain }],
    };
    expect(InteractionDescriptorSchema.safeParse(invalid).success).toBe(false);
    expect(
      SeatProjectionBundleSchema.safeParse({
        events: [],
        seats: {},
        interactionsByRef: { pick: invalid },
      }).success,
    ).toBe(false);
  });

  test("preserves nullable choice and fractional number semantics", () => {
    expect(InteractionDescriptorSchema.parse(descriptor)).toEqual(descriptor);
    const number = { type: "boundedNumber", min: 0.25, max: 1.5, step: 0.25 };
    expect(InputDomainSchema.parse(number)).toEqual(number);
  });

  test("validates references and zones directly at the worker boundary", () => {
    const projection = {
      events: [],
      interactionsByRef: { pick: descriptor },
      seats: {
        p1: {
          availableInteractionRefs: ["pick"],
          zones: {
            hand: {
              cardIds: ["c1"],
              cardViewsById: { c1: "{}" },
              playableByCardId: { c1: ["pick"] },
            },
          },
        },
      },
    };
    expect(SeatProjectionBundleSchema.parse(projection)).toEqual(projection);
    expect(
      SeatProjectionBundleSchema.safeParse({
        ...projection,
        seats: { p1: { availableInteractionRefs: [{}] } },
      }).success,
    ).toBe(false);
    expect(
      SeatProjectionBundleSchema.safeParse({
        ...projection,
        seats: {
          p1: {
            zones: {
              hand: {
                cardIds: [],
                cardViewsById: {},
                playableByCardId: { c1: [123] },
              },
            },
          },
        },
      }).success,
    ).toBe(false);
    expect(
      SeatProjectionBundleSchema.safeParse({
        ...projection,
        currentStage: "play",
      }).success,
    ).toBe(false);
    expect(
      SeatProjectionBundleSchema.safeParse({
        ...projection,
        stageSeats: ["p1"],
      }).success,
    ).toBe(false);
  });

  test.each([NaN, Infinity, new Date(), new Map(), () => 1, 1n, [undefined]])(
    "rejects non-JSON digest input %#",
    (value) => {
      expect(() => encodeCanonicalPluginRuntimeJson(value)).toThrow();
    },
  );

  test("canonical digest preserves optional omission and key-order equivalence", () => {
    expect(
      digestPluginRuntimeJson({
        b: [null, 0.25],
        a: { x: 1, missing: undefined },
      }),
    ).toBe(digestPluginRuntimeJson({ a: { x: 1 }, b: [null, 0.25] }));
    expect(encodeCanonicalPluginRuntimeJson({ b: 2, a: 1 })).toBe(
      '{"a":1,"b":2}',
    );
  });
});
