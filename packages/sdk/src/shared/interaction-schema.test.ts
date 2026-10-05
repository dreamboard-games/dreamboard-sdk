import { testReferenceBasis } from "./__fixtures__/reference-basis.js";
import { perPlayerInstanceId } from "./domain/per-player-instance.js";
import { inputTargetInDomain, inputValueKey } from "./input-domain";
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
    {
      type: "boardTarget",
      valueKind: "board-id",
      boardId: "map",
      eligibleTargets: [],
    },
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
        referenceBasis: testReferenceBasis,

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
      referenceBasis: testReferenceBasis,

      interactionsByRef: { pick: descriptor },
      seats: {
        p1: {
          events: [],
          availableInteractionRefs: ["pick"],
          zones: {
            hand: {
              p1: {
                tiles: [],
                cardIds: ["c1"],
                cardViewsById: {
                  c1: { id: "c1", cardType: "ranked", properties: {} },
                },
                cardBacksById: {},
                playableByCardId: { c1: ["pick"] },
              },
            },
          },
        },
      },
    };
    expect(SeatProjectionBundleSchema.parse(projection)).toEqual(projection);
    expect(
      SeatProjectionBundleSchema.safeParse({
        ...projection,
        seats: {
          p1: {
            events: [],
            zones: { hand: projection.seats.p1.zones.hand.p1 },
          },
        },
      }).success,
    ).toBe(false);
    expect(
      SeatProjectionBundleSchema.safeParse({
        ...projection,
        seats: { p1: { events: [], availableInteractionRefs: [{}] } },
      }).success,
    ).toBe(false);
    expect(
      SeatProjectionBundleSchema.safeParse({
        ...projection,
        seats: {
          p1: {
            events: [],
            zones: {
              hand: {
                p1: {
                  tiles: [],
                  cardIds: [],
                  cardViewsById: {},
                  cardBacksById: {},
                  playableByCardId: { c1: [123] },
                },
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

test("board domain admission distinguishes scalar IDs and complete player-board identities", () => {
  const base = {
    type: "boardTarget",
    projection: "resolved",
    targetKind: "space",
    boardBaseId: "mat",
  };
  const target = {
    boardId: perPlayerInstanceId("board", "mat", "alice"),
    spaceId: "slot",
  };
  const domain = InputDomainSchema.parse({
    ...base,
    valueKind: "board-space",
    eligibleTargets: [target],
  });
  expect(domain).toMatchObject({ eligibleTargets: [target] });
  expect(
    inputTargetInDomain(domain, {
      spaceId: "slot",
      boardId: perPlayerInstanceId("board", "mat", "alice"),
    }),
  ).toBe(true);
  for (const forged of [
    "slot",
    { ...target, boardId: perPlayerInstanceId("board", "mat", "bob") },
    { ...target, playerId: "bob" },
    { ...target, spaceId: "other" },
  ])
    expect(inputTargetInDomain(domain, forged)).toBe(false);
  for (const invalid of [
    { ...base, eligibleTargets: ["slot"] },
    { ...base, valueKind: "board-space", eligibleTargets: ["slot"] },
    { ...base, valueKind: "board-id", eligibleTargets: [target] },
    {
      ...base,
      valueKind: "board-space",
      targetKind: "edge",
      eligibleTargets: [target],
    },
  ])
    expect(InputDomainSchema.safeParse(invalid).success).toBe(false);
  expect(
    InputDomainSchema.parse({
      type: "boardTarget",
      projection: "resolved",
      targetKind: "space",
      valueKind: "board-id",
      boardId: "mat",
      eligibleTargets: ["slot"],
    }),
  ).toMatchObject({ eligibleTargets: ["slot"] });
});

test("canonical tuple keys ignore insertion order without changing custom object identity", () => {
  const target = {
    boardId: perPlayerInstanceId("board", "mat", "alice"),
    spaceId: "slot",
  };
  expect(inputValueKey(target)).toBe(
    inputValueKey({
      spaceId: "slot",
      boardId: perPlayerInstanceId("board", "mat", "alice"),
    }),
  );
  expect(inputValueKey({ ...target, payload: 1 })).not.toBe(
    inputValueKey({ ...target, payload: 2 }),
  );
  expect(inputValueKey({ ...target, playerId: "bob" })).not.toBe(
    inputValueKey(target),
  );
});
