import type { ValidationIssue } from "@dreamboard-games/sdk/reducer";
import type { PlayerId } from "../../shared/manifest-contract";
import type {
  GameErrorCode,
  GameState,
  PlayerTurnPhaseState,
} from "../game-contract";

export function validateTechniquePlay(
  state: GameState & { phase: PlayerTurnPhaseState },
  playerId: PlayerId,
): ValidationIssue<GameErrorCode> | null {
  if (state.flow.activePlayers[0] !== playerId) {
    return { errorCode: "NOT_YOUR_TURN" };
  }
  if (state.phase.step !== "action" || state.phase.actionsLeft < 1) {
    return { errorCode: "NO_ACTIONS" };
  }
  return null;
}
