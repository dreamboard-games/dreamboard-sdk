import { advanceCountdown } from "./advance-countdown";
import { gameOver } from "./game-over";
import { playerTurn } from "./player-turn";
import { resolveWeather } from "./resolve-weather";
import { setup } from "./setup";
import type { GameContract } from "../game-contract";
import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";

export const phases = {
  setup,
  playerTurn,
  resolveWeather,
  advanceCountdown,
  gameOver,
} satisfies PhaseMapOf<GameContract>;
