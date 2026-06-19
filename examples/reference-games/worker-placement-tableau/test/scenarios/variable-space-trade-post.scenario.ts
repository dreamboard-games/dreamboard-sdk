import { defineScenario } from "../testing-types.ts";
import {
  chooseTradePostExchange,
  ensureVariableSpaceEnabled,
  passPlacement,
  pickSlot,
  placeApprentice,
  setPlayerResources,
} from "../scenario-helpers.ts";

// Trade-post: exchange 2 resources for 2 different resources.
// Like-for-like (a resource appearing on both sides) is rejected.
export default defineScenario({
  id: "variable-space-trade-post",
  description:
    "Trade-post swaps 2 wood for 2 stone; like-for-like (wood↔wood) is rejected.",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await pickSlot(game, seat0, 1);
    await pickSlot(game, seat1, 4);

    await ensureVariableSpaceEnabled(game, "trade-post");
    await setPlayerResources(game, seat0, { wood: 4, stone: 0, coin: 2 });

    await placeApprentice(game, seat0, 1, "trade-post"); // raise barrier

    // Like-for-like: wood:1+stone:1 vs wood:1+stone:1 → wood appears
    // on both sides → reject.
    await expect(async () => {
      await chooseTradePostExchange(
        game,
        seat0,
        { wood: 1, stone: 1 },
        { wood: 1, stone: 1 },
      );
    }).toRejectWith({ errorCode: "TRADE_POST_LIKE_FOR_LIKE" });

    // Totals != 2 → reject.
    await expect(async () => {
      await chooseTradePostExchange(game, seat0, { wood: 1 }, { stone: 2 });
    }).toRejectWith({ errorCode: "TRADE_POST_TOTALS" });

    // Valid: 2 wood → 2 stone.
    await chooseTradePostExchange(game, seat0, { wood: 2 }, { stone: 2 });

    await passPlacement(game, seat1);
    await passPlacement(game, seat0);
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // 4 wood - 2 = 2; 0 stone + 2 = 2; coin unchanged.
    expect(v.myResources.wood).toBe(2);
    expect(v.myResources.stone).toBe(2);
    expect(v.myResources.coin).toBe(2);
  },
});
