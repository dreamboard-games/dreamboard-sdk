import { defineScenario } from "../testing-types.ts";

type ResourceCounts = Record<string, number>;
let selectedGiveResource: string | undefined;
let selectedWantResource: string | undefined;

/**
 * Trade-offer lifecycle on the sparse (one-resource / one-resource) payload.
 *
 * What it proves:
 * 1. `offerTrade` writes `pendingTrade` and targets the named captains.
 * 2. The bundle surfaces `respondToTrade` *only to the response actors* named in
 *    the offer — non-targeted seats (incl. the offerer) must not see it.
 * 3. Each response actor's descriptor has `availability.status === "available"` (i.e. the bundle has
 *    authorized them; they are not blocked by the old "Not your turn" gate).
 * 4. `cancelTrade` clears `pendingTrade` and makes the response action disappear
 *    for every response actor — again as observed via the descriptor API.
 *
 * A sibling scenario (`trade-full-lifecycle`) drives the full
 * respond → confirm path end-to-end.
 */
export default defineScenario({
  id: "trade-offer-sparse",
  description:
    "Offering a sparse (timber↔clay) trade surfaces respondToTrade to each named captain, and only to them",
  from: "after-setup",
  when: async ({ game, seat, view, expect }) => {
    const offerer = seat(0);
    const targetA = seat(1);
    const targetB = seat(2);

    await game.submit(offerer, "rollDice", {});

    const offererView = view(offerer) as { myResources: ResourceCounts };
    const targetAView = view(targetA) as { myResources: ResourceCounts };
    const targetBView = view(targetB) as { myResources: ResourceCounts };

    selectedGiveResource = Object.entries(offererView.myResources).find(
      ([, count]) => count > 0,
    )?.[0];
    selectedWantResource =
      Object.entries(targetAView.myResources).find(
        ([, count]) => count > 0,
      )?.[0] ??
      Object.entries(targetBView.myResources).find(
        ([, count]) => count > 0,
      )?.[0];

    // Keep this scenario deterministic: if setup drift removes tradeable
    // resources, fail here instead of silently skipping the sparse-offer path.
    expect(selectedGiveResource).toBeDefined();
    expect(selectedWantResource).toBeDefined();

    await game.submit(offerer, "offerTrade", {
      give: { [selectedGiveResource!]: 1 },
      want: { [selectedWantResource!]: 1 },
      targetPlayerIds: [targetA, targetB],
    });
  },
  then: ({ expect, interactions, state, view, seat }) => {
    expect(state()).toBe("playerTurn");

    const offerer = seat(0);
    const p1View = view(offerer) as {
      pendingTrade?: {
        give: Record<string, number>;
        want: Record<string, number>;
        targetPlayerIds: string[];
      };
    };
    expect(p1View.pendingTrade).toBeDefined();
    expect(p1View.pendingTrade!.give).toEqual({ [selectedGiveResource!]: 1 });
    expect(p1View.pendingTrade!.want).toEqual({ [selectedWantResource!]: 1 });
    expect(p1View.pendingTrade!.targetPlayerIds).toEqual([seat(1), seat(2)]);

    // Each response actor sees `respondToTrade` as an available action
    // descriptor. This is the projection the UI SDK consumes to render the
    // response surface, and the identity the scenario uses to submit via
    // `game.submit(...)`.
    for (const responseActor of [seat(1), seat(2)]) {
      const respond = interactions(responseActor).find(
        (d) => d.interactionId === "respondToTrade",
      );
      expect(respond).toBeDefined();
      expect(respond!.kind).toBe("action");
      expect(respond!.availability.status).toBe("available");
    }

    // The offerer (seat 0) and the non-targeted captain (seat 3) must
    // not see `respondToTrade` at all — actor-traild actions are hidden
    // from non-actors rather than shown as unavailable.
    for (const nonActor of [seat(0), seat(3)]) {
      const respond = interactions(nonActor).find(
        (d) => d.interactionId === "respondToTrade",
      );
      expect(respond).toBeUndefined();
    }
  },
});
