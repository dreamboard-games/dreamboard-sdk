import { playerTurn } from "../../authoring";

// ── End Turn ─────────────────────────────────────────────────────────────────

export const endTurn = playerTurn.interaction({
  inputs: {},
  rules: [
    {
      id: "turn-can-end",
      errorCode: "MUST_ROLL_FIRST",
      validate({ state }) {
        if (!state.phase.diceRolled) {
          return {
            errorCode: "MUST_ROLL_FIRST",
            message: "Must roll dice first.",
          };
        }
        if (state.phase.stormPending) {
          return {
            errorCode: "STORM_PENDING",
            message: "Resolve the storm first.",
          };
        }
        if (state.phase.discardPending.length > 0) {
          return {
            errorCode: "DISCARDS_PENDING",
            message: "Players must discard first.",
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, accept, fx }) {
    // End-turn cleanup is complete. The auto phase owns the terminal branch
    // and, when needed, advances to the next active player before re-entering
    // `playerTurn` with fresh turn-scoped phase state.
    return accept(state, { instructions: [fx.transition("checkGameEnd")] });
  },
});
