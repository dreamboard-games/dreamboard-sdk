import { definePhase } from "@dreamboard-games/sdk/reducer";
import { gameOverPhaseStateSchema, type GameContract } from "../game-contract";

export const gameOver = definePhase<GameContract>()({
  kind: "auto",
  state: gameOverPhaseStateSchema,
  initialState: () => ({}),
});
