import { defineScenario } from "../testing-types.ts";
import type { InteractionDescriptorFor } from "../testing-types.ts";

function byId(
  descriptors: readonly InteractionDescriptorFor[],
  interactionId: string,
): InteractionDescriptorFor {
  const descriptor = descriptors.find(
    (candidate) => candidate.interactionId === interactionId,
  );
  if (!descriptor) {
    throw new Error(`Missing interaction descriptor: ${interactionId}`);
  }
  return descriptor;
}

function eligibleTargetsFor(
  descriptor: InteractionDescriptorFor,
  inputKey: string,
): readonly string[] {
  const domain = descriptor.inputs.find(
    (input) => input.key === inputKey,
  )?.domain;
  if (
    !domain ||
    (domain.type !== "cardTarget" && domain.type !== "boardTarget") ||
    domain.projection !== "resolved"
  ) {
    return [];
  }
  return domain.eligibleTargets;
}

export default defineScenario({
  id: "workshop-placement-requires-craft-option",
  description:
    "Workshop cannot receive a worker when the player cannot resolve a craft.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });
  },
  then: ({ expect, interactions, seat, state }) => {
    const seat0 = seat(0);

    expect(state()).toBe("placement");
    const placeWorker = byId(interactions(seat0), "placeWorker");
    expect(
      eligibleTargetsFor(placeWorker, "spaceId").includes("workshop"),
    ).toBe(false);
  },
});
