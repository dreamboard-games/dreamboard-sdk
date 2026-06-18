import { defineScenario } from "../testing-types";
import {
  staticBoards,
  type PlayerId,
  type SpaceId,
} from "../../shared/manifest-contract";

type ResourceId = "clay" | "grain" | "timber" | "iron" | "cloth";
type ResourceCounts = Record<ResourceId, number>;
type ScenarioView = {
  coloniesByVertexId: Readonly<
    Record<string, { readonly ownerId: PlayerId } | undefined>
  >;
  myResources: ResourceCounts;
};

const RESOURCES = ["clay", "grain", "timber", "iron", "cloth"] as const;
const CHARTER_CARD_COST: ResourceCounts = {
  clay: 0,
  grain: 1,
  timber: 0,
  iron: 1,
  cloth: 1,
};

function canAffordCharterCard(resources: ResourceCounts): boolean {
  return RESOURCES.every(
    (resource) => resources[resource] >= CHARTER_CARD_COST[resource],
  );
}

function missingCharterCardResource(
  resources: ResourceCounts,
): ResourceId | null {
  return (
    RESOURCES.find(
      (resource) => resources[resource] < CHARTER_CARD_COST[resource],
    ) ?? null
  );
}

function bankTradeGiveResource(
  resources: ResourceCounts,
  bankRates: Readonly<Record<ResourceId, number>>,
): ResourceId | null {
  return (
    RESOURCES.find((resource) => {
      const rate = bankRates[resource];
      const keepForCharterCard = CHARTER_CARD_COST[resource];
      return resources[resource] - keepForCharterCard >= rate;
    }) ?? null
  );
}

function discardPayload(
  resources: ResourceCounts,
  required: number,
): Partial<ResourceCounts> {
  const toDiscard: Partial<ResourceCounts> = {};
  let remaining = required;

  for (const resource of RESOURCES) {
    if (remaining === 0) break;
    const amount = Math.min(resources[resource], remaining);
    if (amount > 0) {
      toDiscard[resource] = amount;
      remaining -= amount;
    }
  }

  return toDiscard;
}

function resourceTotal(resources: ResourceCounts): number {
  return RESOURCES.reduce((total, resource) => total + resources[resource], 0);
}

function chooseStormMove(
  playerId: PlayerId,
  seats: readonly PlayerId[],
  view: (playerId: PlayerId) => unknown,
  currentStormSpaceId: string,
): { spaceId: SpaceId; stealFromPlayerId: PlayerId } {
  const playerView = view(playerId) as ScenarioView;
  const candidates: Array<{ spaceId: SpaceId; stealFromPlayerId: PlayerId }> =
    [];
  for (const vertex of staticBoards.hex.frontier.vertices) {
    const building = playerView.coloniesByVertexId[vertex.id];
    if (!building || building.ownerId === playerId) continue;
    for (const spaceId of vertex.spaceIds) {
      if (spaceId === currentStormSpaceId) continue;
      candidates.push({ spaceId, stealFromPlayerId: building.ownerId });
    }
  }
  const target = candidates.find((candidate) => {
    if (!seats.includes(candidate.stealFromPlayerId)) return false;
    const candidateView = view(candidate.stealFromPlayerId) as {
      myResources: ResourceCounts;
    };
    return resourceTotal(candidateView.myResources) > 0;
  });
  if (target) return target;
  const fallback = candidates[0];
  if (!fallback) throw new Error("Expected at least one storm steal target.");
  return fallback;
}

export default defineScenario({
  id: "buy-charter-card",
  description:
    "Materializes a live state immediately after the active player buys a charter card",
  from: "after-setup",
  when: async ({ game, view, seat }) => {
    const seats = [seat(0), seat(1), seat(2), seat(3)] as const;

    for (let turn = 0; turn < 80; turn++) {
      const playerId = seats[turn % seats.length];

      await game.submit(playerId, "rollDice", {});

      const rolledView = view(playerId) as {
        diceValues: readonly [number, number] | null;
        stormSpaceId: string;
      };
      const diceSum =
        rolledView.diceValues?.[0] != null && rolledView.diceValues?.[1] != null
          ? rolledView.diceValues[0] + rolledView.diceValues[1]
          : null;

      if (diceSum === 7) {
        for (const discardPlayerId of seats) {
          const discardView = view(discardPlayerId) as {
            myDiscardRequired: number;
            myResources: ResourceCounts;
          };
          if (discardView.myDiscardRequired > 0) {
            await game.submit(discardPlayerId, "discardCards", {
              toDiscard: discardPayload(
                discardView.myResources,
                discardView.myDiscardRequired,
              ),
            });
          }
        }

        const stormMove = chooseStormMove(
          playerId,
          seats,
          view,
          rolledView.stormSpaceId,
        );
        await game.submit(playerId, "moveStorm", {
          spaceId: stormMove.spaceId,
          stealFromPlayerId: stormMove.stealFromPlayerId,
        });
      }

      for (let trade = 0; trade < 3; trade++) {
        const currentView = view(playerId) as {
          myResources: ResourceCounts;
          myBankTradeRates: Readonly<Record<ResourceId, number>>;
        };
        if (canAffordCharterCard(currentView.myResources)) {
          break;
        }

        const receiveResource = missingCharterCardResource(
          currentView.myResources,
        );
        const giveResource = bankTradeGiveResource(
          currentView.myResources,
          currentView.myBankTradeRates,
        );
        if (!receiveResource || !giveResource) {
          break;
        }

        await game.submit(playerId, "tradeWithBank", {
          giveResource,
          receiveResource,
        });
      }

      const currentView = view(playerId) as { myResources: ResourceCounts };
      if (canAffordCharterCard(currentView.myResources)) {
        await game.submit(playerId, "buyCharterCard", {});
        return;
      }

      await game.submit(playerId, "endTurn", {});
    }

    throw new Error("Unable to reach a charter-card purchase within 80 turns.");
  },
  then: ({ expect, state, view, seat }) => {
    expect(state()).toBe("playerTurn");

    const seats = [seat(0), seat(1), seat(2), seat(3)] as const;
    const buyerView = seats
      .map(
        (playerId) =>
          view(playerId) as {
            myCharterCardCount: number;
            myCharterCardIds: readonly string[];
          },
      )
      .find((playerView) => playerView.myCharterCardCount > 0);

    expect(buyerView).toBeDefined();
    expect(buyerView!.myCharterCardCount).toBe(1);
    expect(buyerView!.myCharterCardIds.length).toBe(1);
  },
});
