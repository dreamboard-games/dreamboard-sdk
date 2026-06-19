import { defineScenario } from "@dreamboard-games/sdk/testing";
import { scenarioMetadata } from "../../app/phases/scenarios.ts";

export default defineScenario({
  id: "draft-stall-ready",
  description:
    "Materialize a deterministic draft-ready market for the browser submit replay.",
  from: "standard",
  runners: ["reducer"],
  when: async ({ game }) => {
    await game.patchState?.((snapshot) => {
      const domain = snapshot.domain as Record<string, unknown>;
      domain.publicState = structuredClone(scenarioMetadata.initial.state);
    });
  },
  then: ({ expect, interactions, seat, view }) => {
    const playerId = seat(0);
    const playerView = view(playerId) as {
      legalMarketCardIds?: readonly string[];
    };
    const draftStall = interactions(playerId).find(
      (candidate) => candidate.interactionId === "draftStall",
    );

    expect(playerView.legalMarketCardIds).toContain("food-p3-c0-1");
    expect(draftStall).toBeDefined();
    expect(draftStall?.availability?.status).toBe("available");
  },
});
