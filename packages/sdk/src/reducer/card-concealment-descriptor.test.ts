import { expect, test } from "vitest";
import type { InteractionDescriptorShape } from "./bundle/trusted/interaction-types.js";
import { InteractionDescriptorSchema } from "../shared/interaction-schema.js";
import {
  concealDescriptor,
  type CardConcealment,
} from "./bundle/trusted/card-concealment.js";

const concealment: CardConcealment = {
  zones: [],
  canTarget: (id) => id !== "opponent-card",
  seatCardId: (id) => (id === "own-hidden-card" ? "hidden:own:0" : id),
  isHidden: (id) => id === "own-hidden-card",
  tableCardId: (id) => id,
};

for (const value of ["opponent-card", ["own-hidden-card", "opponent-card"]]) {
  test(`omits a denied ${Array.isArray(value) ? "many" : "single"} default and step selection completely`, () => {
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
          key: "card",
          kind: "card",
          defaultValue: value,
          domain: {
            type: "cardTarget",
            projection: "resolved",
            targetKind: "card",
            zoneIds: ["hand"],
            eligibleTargets: ["own-hidden-card", "opponent-card"],
            selection: Array.isArray(value)
              ? { mode: "many", min: 2 }
              : { mode: "single" },
          },
        },
      ],
      step: {
        index: 1,
        total: 2,
        canCancel: true,
        selected: { card: value, unrelated: "opponent-card" },
      },
    } satisfies InteractionDescriptorShape;
    InteractionDescriptorSchema.parse(descriptor);
    const projected = concealDescriptor(
      descriptor,
      new Set(["card"]),
      concealment,
    );
    expect(projected.inputs[0]).not.toHaveProperty("defaultValue");
    expect(projected.inputs[0].domain).toMatchObject({
      eligibleTargets: ["hidden:own:0"],
    });
    expect(projected.step?.selected).toEqual({ unrelated: "opponent-card" });
    expect(projected.inputs[0].domain).toMatchObject({
      selection: descriptor.inputs[0].domain.selection,
    });
  });
}

test("retains and maps a fully permitted default and selection", () => {
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
        key: "card",
        kind: "card",
        defaultValue: ["own-hidden-card"],
        domain: {
          type: "cardTarget",
          projection: "resolved",
          targetKind: "card",
          zoneIds: ["hand"],
          eligibleTargets: ["own-hidden-card"],
          selection: { mode: "many", min: 1 },
        },
      },
    ],
    step: {
      index: 1,
      total: 2,
      canCancel: true,
      selected: { card: ["own-hidden-card"] },
    },
  } satisfies InteractionDescriptorShape;
  InteractionDescriptorSchema.parse(descriptor);
  const projected = concealDescriptor(
    descriptor,
    new Set(["card"]),
    concealment,
  );
  expect(projected.inputs[0].defaultValue).toEqual(["hidden:own:0"]);
  expect(projected.step?.selected).toEqual({ card: ["hidden:own:0"] });
});
