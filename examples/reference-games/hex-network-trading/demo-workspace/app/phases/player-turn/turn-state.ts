import { z } from "zod";
import {
  playerTurnPhaseStateSchema,
  type GameState,
  type PlayerTurnPhaseState,
} from "../../game-contract";

export type PlayerTurnState = Omit<GameState, "phase"> & {
  phase: PlayerTurnPhaseState;
};

// Fresh phase state for a new turn. Used to reset `state.phase` via
// `tx.patchPhaseState` at the end of each turn — cheaper than re-
// entering the phase via `fx.transition`, which would also fire the
// `enter` hook.
export const FRESH_TURN: z.infer<typeof playerTurnPhaseStateSchema> = {
  step: "roll",
  diceRolled: false,
  diceValues: null,
  charterCardBoughtThisTurn: false,
  charterCardPlayedThisTurn: false,
  stormPending: false,
  discardPending: [],
  pendingTrade: null,
};
