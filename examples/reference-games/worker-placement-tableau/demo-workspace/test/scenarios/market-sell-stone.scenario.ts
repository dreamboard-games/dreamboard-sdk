import { defineScenario } from "../testing-types";
import { setPlayerResources } from "../scenario-helpers";

// Market alt branch: with stone in inventory, the player may sell 1
// stone for 2 coin instead of taking the default +3 coin payout. To
// exercise the "no stone" rejection without two apprentices on the same
// space, seat(1) reaches the market via master override after their
// apprentice plays elsewhere.
export default defineScenario({
  id: "market-sell-stone",
  description:
    "Market alt branch: with stone, sell-stone yields -1 stone +2 coin; without stone the alt branch rejects.",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // seat(0): exactly 1 stone so the swap zeros it.
    await setPlayerResources(game, seat0, { wood: 1, stone: 1, coin: 2 });
    // seat(1): no stone (forces NO_STONE_TO_SELL on sell-stone choice).
    await setPlayerResources(game, seat1, { wood: 1, stone: 0, coin: 3 });

    // seat(0) parks an apprentice on market → barrier raised.
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "market",
    });
    await game.submit(seat0, "chooseMarketAction", { choice: "sell-stone" });

    // seat(1) plays an apprentice elsewhere (lumberyard).
    await game.submit(seat1, "placeWorker", {
      componentId: "apprentice-p2-1",
      spaceId: "lumberyard",
    });

    // seat(0) plays an apprentice elsewhere (quarry) so seat(1) can
    // come back to market on the next round.
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-2",
      spaceId: "quarry",
    });

    // seat(1) overrides seat(0)'s apprentice on market with the master.
    await game.submit(seat1, "placeWorker", {
      componentId: "master-p2",
      spaceId: "market",
    });

    // sell-stone is rejected — seat(1) has no stone.
    await expect(async () => {
      await game.submit(seat1, "chooseMarketAction", { choice: "sell-stone" });
    }).toRejectWith({ errorCode: "NO_STONE_TO_SELL" });

    // Fall back to the default gain-coin branch.
    await game.submit(seat1, "chooseMarketAction", { choice: "gain-coin" });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    const seat0View = view(seat0);
    // seat(0): sell-stone gave -1 stone +2 coin → stone 0, coin 4.
    // Then quarry placement gave +1 stone → stone 1.
    expect(seat0View.myResources.stone).toBe(1);
    expect(seat0View.myResources.coin).toBe(4);

    const seat1View = view(seat1);
    // seat(1): gain-coin gave +3 coin → 3 + 3 = 6.
    expect(seat1View.myResources.coin).toBe(6);
    expect(seat1View.myResources.stone ?? 0).toBe(0);

    expect(seat0View.pendingMarketChoiceBy).toBeNull();
  },
});
