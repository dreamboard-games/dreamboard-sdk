import { defineScenario } from "../testing-types.ts";
import type { PlayerId, SpaceId } from "../../shared/manifest-contract.ts";

type ResourceCounts = Record<string, number>;

function resourceTotal(resources: ResourceCounts): number {
  return Object.values(resources).reduce((total, count) => total + count, 0);
}

function chooseStealTarget(
  playerId: PlayerId,
  seats: readonly PlayerId[],
  view: (playerId: PlayerId) => { myResources: ResourceCounts },
): PlayerId {
  const target = seats.find(
    (candidate) =>
      candidate !== playerId && resourceTotal(view(candidate).myResources) > 0,
  );
  if (target) return target;
  const fallback = seats.find((candidate) => candidate !== playerId);
  if (!fallback) throw new Error("Expected at least one steal target.");
  return fallback;
}

export default defineScenario({
  id: "terminal-winner-after-endturn",
  description:
    "A player who reaches 10 Renown does not win until endTurn trails through checkGameEnd.",
  from: "terminal-before-endturn",
  runners: ["reducer"],
  async when({ game, interactions, seat, state, view, expect }) {
    const playerId = seat(0);
    const seats = [seat(0), seat(1), seat(2), seat(3)] as const;

    expect(state()).toBe("playerTurn");
    expect(view(playerId).myTotalInfluence).toBeGreaterThanOrEqual(10);
    expect(view(playerId).outcome).toBeNull();

    await game.submit(playerId, "rollDice", {});

    if (view(playerId).stormPending) {
      const moveStorm = interactions(playerId).find(
        (descriptor) => descriptor.interactionId === "moveStorm",
      );
      const spaceInput = moveStorm?.inputs.find(
        (input) => input.key === "spaceId",
      );
      const spaceId =
        spaceInput?.domain.type === "boardTarget" &&
        spaceInput.domain.projection === "resolved"
          ? spaceInput.domain.eligibleTargets?.[0]
          : undefined;
      if (!spaceId) {
        throw new Error("Expected moveStorm to expose an eligible space.");
      }
      await game.submit(playerId, "moveStorm", {
        spaceId: spaceId as SpaceId,
        stealFromPlayerId: chooseStealTarget(playerId, seats, view),
      });
    }

    await game.submit(playerId, "endTurn", {});
  },
  then: ({ expect, state, view, interactions, seat }) => {
    const winner = seat(0);
    expect(state()).toBe("gameOver");
    expect(
      view(winner).outcome?.standings.find(
        (standing) => standing.result === "win",
      )?.playerId,
    ).toBe(winner);
    expect(
      interactions(winner).some(
        (descriptor) => descriptor.interactionId === "endTurn",
      ),
    ).toBe(false);
  },
});
