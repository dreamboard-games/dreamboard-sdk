import { defineScenario } from "../testing-types";

export default defineScenario({
  id: "setup-draw-variable-spaces",
  description:
    "Setup phase deals cards/resources, draws 3 variable spaces, transitions to wakeup",
  from: "initial-turn",
  // Setup is `kind: "auto"` and runs entirely from its `onEnter` hook, so
  // there are no client interactions to submit here.
  when: async () => undefined,
  then: ({ expect, state, view, players }) => {
    // Setup auto-transitioned to wakeup.
    expect(state()).toBe("wakeup");

    const playerIds = players();
    expect(playerIds.length).toBe(2);

    const firstPlayer = playerIds[0]!;
    const firstView = view(firstPlayer);

    // 9 enabled action spaces = 6 fixed + 3 variable, with 3 variables drawn.
    expect(firstView.enabledActionSpaces.length).toBe(9);
    expect(firstView.setupVariablePoolDraw.length).toBe(3);

    // Season counter was seeded to 1 in `app/game.ts` initial public state.
    expect(firstView.seasonNumber).toBe(1);

    // Per rule.md §Setup: each player starts with 2 coin + 1 wood.
    for (const playerId of playerIds) {
      const playerView = view(playerId);
      expect(playerView.myResources.coin).toBe(2);
      expect(playerView.myResources.wood).toBe(1);
      expect(playerView.myResources.stone ?? 0).toBe(0);

      // Each player has been dealt 1 Order + 1 Apprentice card.
      expect(playerView.orderHandCountByPlayerId[playerId]).toBe(1);
      expect(playerView.apprenticeHandCountByPlayerId[playerId]).toBe(1);
    }
  },
});
