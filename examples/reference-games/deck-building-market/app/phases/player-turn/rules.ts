import type { GameState } from "../../game-contract";
import type { ValidationIssue } from "@dreamboard-games/sdk/reducer";

export function notYourTurn(
  state: GameState,
  playerId: string,
): ValidationIssue<"NOT_YOUR_TURN"> | null {
  if (state.flow.activePlayers[0] !== playerId) {
    return { errorCode: "NOT_YOUR_TURN", message: "Not your turn." };
  }
  return null;
}

export function treasureCoins(card: {
  properties: Record<string, unknown>;
}): number | null {
  return typeof card.properties.coins === "number"
    ? card.properties.coins
    : null;
}
