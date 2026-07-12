import type { ValidationIssue } from "@dreamboard-games/sdk/reducer";
import type { GameState } from "../../game-contract";

export function notYourTurn(
  state: GameState,
  playerId: string,
): ValidationIssue<"NOT_YOUR_TURN"> | null {
  return state.flow.activePlayers[0] === playerId
    ? null
    : { errorCode: "NOT_YOUR_TURN" };
}
