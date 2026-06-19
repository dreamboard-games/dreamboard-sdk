import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../game-contract";
import { gameOver } from "./game-over";
import { humanTurn } from "./human-turn";
import { setup } from "./setup";

export const phases = {
  setup,
  humanTurn,
  gameOver,
} satisfies PhaseMapOf<GameContract>;
