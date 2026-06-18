import type { ValidationIssue } from "@dreamboard-games/sdk/reducer";
import type { PlayerId } from "../../shared/manifest-contract";
import type {
  GameErrorCode,
  GameState,
  PlayerTurnPhaseState,
} from "../game-contract";

// Validation common to every action card. Action cards can only be
// played during the action phase, only on your own turn, and only
// while you still have at least one action.
export function validateActionPlay(
  state: GameState & { phase: PlayerTurnPhaseState },
  playerId: PlayerId,
): ValidationIssue<GameErrorCode> | null {
  if (state.flow.activePlayers[0] !== playerId) {
    return { errorCode: "NOT_YOUR_TURN", message: "Not your turn." };
  }
  if (state.flow.currentPhase !== "playerTurn") {
    return { errorCode: "WRONG_PHASE", message: "Not in player turn phase." };
  }
  if (state.phase.actionsLeft <= 0) {
    return { errorCode: "NO_ACTIONS", message: "No actions left." };
  }
  return null;
}
