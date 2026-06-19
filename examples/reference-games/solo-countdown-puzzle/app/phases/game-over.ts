import type { GameContract } from "../game-contract";
import { gameOverPhaseStateSchema } from "../game-contract";
import { definePhase } from "@dreamboard-games/sdk/reducer";

export const gameOver = definePhase<GameContract>()({
  kind: "auto",
  state: gameOverPhaseStateSchema,
  initialState: () => ({}),
});
