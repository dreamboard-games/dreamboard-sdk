import { defineScenario } from "../testing-types.ts";
import { givePlayerOrderCard, patchMatOccupancy } from "../scenario-helpers.ts";
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

function isAvailable(descriptor: InteractionDescriptorFor): boolean {
  return descriptor.availability.status === "available";
}

function isBlocked(descriptor: InteractionDescriptorFor): boolean {
  return (
    descriptor.availability.status !== "available" &&
    descriptor.availability.status !== "notYourTurn"
  );
}

// Action availability is reducer-projected through interaction descriptors.
// Seed seat(0) with the furniture-commission card + 2 wood items on their
// mat, then assert the canonical descriptor surface rather than duplicating
// canXXX booleans in the player view.
export default defineScenario({
  id: "player-view-action-availability",
  description:
    "Interaction descriptors report the live action panel for the controlling player at the start of placement.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // Plant 2 wood items on seat(0)'s mat so furniture-commission's
    // requirement (2 wood items) is met.
    await patchMatOccupancy(game, seat0, [
      ["cell-r0-c0", "workbench"],
      ["cell-r2-c3", "loom"],
    ]);
    await givePlayerOrderCard(game, seat0, "furniture-commission");
  },
  then: ({ expect, interactions, view, seat, state }) => {
    const seat0 = seat(0);
    const v = view(seat0);

    expect(state()).toBe("placement");
    expect(v.currentPhase).toBe("placement");
    expect(v.currentActorPlayerId).toBe(seat0);

    const descriptors = interactions(seat0);
    const fulfillOrder = byId(descriptors, "fulfillOrder");
    const placeWorker = byId(descriptors, "placeWorker");
    const passPlacement = byId(descriptors, "passPlacement");
    const craftAtWorkshop = byId(descriptors, "craftAtWorkshop");
    const chooseMarketAction = byId(descriptors, "chooseMarketAction");

    expect(isAvailable(fulfillOrder)).toBe(true);
    expect(eligibleTargetsFor(fulfillOrder, "cardId")).toContain(
      "furniture-commission",
    );

    // Placement excludes action spaces that cannot resolve after placement.
    expect(isAvailable(placeWorker)).toBe(true);
    expect(eligibleTargetsFor(placeWorker, "spaceId").length > 0).toBe(true);
    expect(isAvailable(passPlacement)).toBe(true);

    // Workshop / market barriers are inactive.
    expect(isBlocked(craftAtWorkshop)).toBe(true);
    expect(isBlocked(chooseMarketAction)).toBe(true);
  },
});
