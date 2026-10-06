import * as z from "zod";
import { projectSeatDescriptor } from "./bundle/trusted/seat-interactions.js";
import { createSeatDisclosure } from "./bundle/trusted/tile-disclosure.js";
import {
  createInputTestState,
  inputDefinitions,
} from "./input-test-fixtures.js";
import { testReferenceBasis } from "../shared/__fixtures__/reference-basis.js";
const disclosure = createSeatDisclosure(
  createInputTestState().table,
  inputDefinitions,
  "player-1",
  testReferenceBasis,
);
const cardCollector = {
  kind: "card" as const,
  schema: z.string(),
  meta: { zoneId: "hand", targetKind: "card" as const },
  domain: () => ({
    type: "cardTarget" as const,
    projection: "resolved" as const,
    targetKind: "card" as const,
    zoneIds: ["hand"],
    eligibleTargets: ["card-a", "card-b"],
  }),
};
const collectors = {
  card: cardCollector,
  unrelated: { kind: "form" as const, schema: z.string() },
};
import { expect, test } from "vitest";
import type { InteractionDescriptorShape } from "./bundle/trusted/interaction-types.js";
import { InteractionDescriptorSchema } from "../shared/interaction-schema.js";
import { type CardConcealment } from "./bundle/trusted/card-concealment.js";

const concealment: CardConcealment = {
  zones: [],
  canTarget: (id) => id !== "card-b",
  seatCardId: (id) =>
    id === "card-a"
      ? "card-ref:sha256:b36769e54cacd3a17b1bb1decc20f2ad2bcac2dd64dfdbcd61a07d503fc1da79"
      : id,
  isHidden: (id) => id === "card-a",
  tableCardId: (id) => id,
};

for (const value of ["card-b", ["card-a", "card-b"]]) {
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
            eligibleTargets: ["card-a", "card-b"],
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
        selected: { card: value, unrelated: "card-b" },
      },
    } satisfies InteractionDescriptorShape;
    InteractionDescriptorSchema.parse(descriptor);
    const projected = projectSeatDescriptor(
      descriptor,
      collectors,
      disclosure,
      concealment,
    );
    expect(projected).toBeNull();
    const domainOnly = projectSeatDescriptor(
      { ...descriptor, step: undefined },
      collectors,
      disclosure,
      concealment,
    );
    expect(domainOnly?.inputs[0]).not.toHaveProperty("defaultValue");
    expect(domainOnly?.inputs[0].domain).toMatchObject({
      eligibleTargets: [
        "card-ref:sha256:b36769e54cacd3a17b1bb1decc20f2ad2bcac2dd64dfdbcd61a07d503fc1da79",
      ],
    });
    expect(domainOnly?.step).toBeUndefined();
    expect(domainOnly?.inputs[0].domain).toMatchObject({
      selection: descriptor.inputs[0].domain.selection,
    });
  });
}

test("suppresses a concealed identity default while retaining the issued selection", () => {
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
        defaultValue: ["card-a"],
        domain: {
          type: "cardTarget",
          projection: "resolved",
          targetKind: "card",
          zoneIds: ["hand"],
          eligibleTargets: ["card-a"],
          selection: { mode: "many", min: 1 },
        },
      },
    ],
    step: {
      index: 1,
      total: 2,
      canCancel: true,
      selected: { card: ["card-a"] },
    },
  } satisfies InteractionDescriptorShape;
  InteractionDescriptorSchema.parse(descriptor);
  const projected = projectSeatDescriptor(
    descriptor,
    {
      card: {
        ...cardCollector,
        schema: z.array(z.string()),
        selection: { mode: "many", min: 1 },
      },
    },
    disclosure,
    concealment,
  );
  expect(projected?.inputs[0]).not.toHaveProperty("defaultValue");
  expect(projected?.step?.selected).toEqual({
    card: [
      "card-ref:sha256:b36769e54cacd3a17b1bb1decc20f2ad2bcac2dd64dfdbcd61a07d503fc1da79",
    ],
  });
});
