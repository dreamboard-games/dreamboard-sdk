import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../game-contract";
import { setup } from "./setup";
import { playerTurn } from "./player-turn";
import { checkGameEnd } from "./check-game-end";
import { gameOver } from "./game-over";

export const phases = {
  setup,
  playerTurn,
  checkGameEnd,
  gameOver,
} satisfies PhaseMapOf<GameContract>;
