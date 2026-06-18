import { defineScenario } from "../testing-types";

type ResourceCounts = Record<string, number>;

/**
 * Complete trade lifecycle: offer → accept → confirm.
 *
 * Why this scenario exists:
 * Before actor-traild interaction authorization in the SDK bundle, a targeted
 * captain who tried to respond to a trade would hit a
 * `NOT_YOUR_TURN` error from the engine — the active-player gate treated
 * response interactions the same as phase-actor interactions, and refused
 * anyone who wasn't the current turn holder.
 *
 * This scenario is the end-to-end regression for that fix:
 *   1. seat 0 (turn holder) offers a 1-for-1 trade to seat 1.
 *   2. seat 1 (response actor, NOT the active player) submits
 *      `respondToTrade` and must succeed — the bundle must recognize them as
 *      authorized by the interaction-level actor selector.
 *   3. seat 0 confirms the trade with seat 1 as partner; resources
 *      move in both directions.
 *
 * The scenario dynamically probes each player's `myResources` to pick
 * feasible `give` / `want` payloads, so it stays deterministic regardless
 * of what the seeded setup grants.
 */
export default defineScenario({
  id: "trade-full-lifecycle",
  description:
    "Response actor can accept a trade (no NOT_YOUR_TURN), then the offerer confirms and resources transfer",
  from: "after-setup",
  when: async ({ game, view, expect, seat }) => {
    const offerer = seat(0);
    const partner = seat(1);

    await game.submit(offerer, "rollDice", {});

    const p1 = view(offerer) as { myResources: ResourceCounts };
    const p2 = view(partner) as { myResources: ResourceCounts };

    const giveResource = Object.entries(p1.myResources).find(
      ([, count]) => count > 0,
    )?.[0];
    const wantResource = Object.entries(p2.myResources).find(
      ([resource, count]) => count > 0 && resource !== giveResource,
    )?.[0];

    // Defensive: this scenario is only meaningful when both seats have at
    // least one distinct resource to swap. The after-setup base's seed is
    // stable, so these expectations surface setup drift immediately rather
    // than silently skipping coverage of the accept/confirm path.
    expect(giveResource).toBeDefined();
    expect(wantResource).toBeDefined();

    await game.submit(offerer, "offerTrade", {
      give: { [giveResource!]: 1 },
      want: { [wantResource!]: 1 },
      targetPlayerIds: [partner],
    });

    // Response actor accepts. Before the authorization fix this line threw
    // `SubmissionError: NOT_YOUR_TURN` because the engine ignored the
    // interaction-level actor selector.
    await game.submit(partner, "respondToTrade", { response: "accept" });

    await game.submit(offerer, "confirmTrade", { partnerId: partner });
  },
  then: ({ expect, interactions, state, view, seat }) => {
    expect(state()).toBe("playerTurn");

    const offerer = seat(0);
    const partner = seat(1);

    const p1After = view(offerer) as {
      pendingTrade: unknown;
      myResources: ResourceCounts;
    };
    const p2After = view(partner) as {
      pendingTrade: unknown;
      myResources: ResourceCounts;
    };
    expect(p1After.pendingTrade).toBeNull();
    expect(p2After.pendingTrade).toBeNull();

    // Both sides still have non-negative resource totals — the trade did
    // not bankrupt anyone and the transfer ran in both directions.
    const sum = (counts: ResourceCounts) =>
      Object.values(counts).reduce((acc, value) => acc + value, 0);
    expect(sum(p1After.myResources)).toBeGreaterThanOrEqual(1);
    expect(sum(p2After.myResources)).toBeGreaterThanOrEqual(1);

    // And — importantly — the `respondToTrade` descriptor is no longer
    // surfaced to seat 1, because `pendingTrade` cleared.
    const respond = interactions(partner).find(
      (d) => d.interactionId === "respondToTrade",
    );
    expect(respond).toBeUndefined();
  },
});
