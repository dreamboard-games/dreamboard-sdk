import { defineScenario } from "../testing-types.ts";
import {
  COMPLETE_GAME_COMMANDS,
  reject,
} from "../scenario-commands.ts";

export const affordableTradePrefix = COMPLETE_GAME_COMMANDS.slice(0, 10);

export default defineScenario({
  id: "stormtrail.bilateral-trade",
  description:
    "Player 2 makes an affordable one-opponent offer; only Player 1 may respond, and rejection returns Player 2 to the same main phase.",
  setup: { players: 3, seed: 1 },
  given: affordableTradePrefix,
  when: [reject(0)],
  then: ({ expect, state, view }) => {
    const finalState = state();
    expect(finalState.flow.currentPhase).toBe("main");
    expect(finalState.flow.activePlayers).toEqual(["player-2"]);
    expect(finalState.publicState.currentTrade).toBeNull();
    expect(finalState.publicState.tradeHistory).toEqual([
      {
        offerorPlayerId: "player-2",
        targetPlayerId: "player-1",
        give: { provisions: 1 },
        want: { brick: 1 },
        result: "rejected",
      },
    ]);
    expect(view({ seat: 0 }).mySupplies).toEqual({
      brick: 1,
      provisions: 0,
      timber: 2,
    });
    expect(view({ seat: 1 }).mySupplies).toEqual({
      brick: 0,
      provisions: 2,
      timber: 1,
    });
  },
});
