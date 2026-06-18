import { setup } from "./setup";
import { drafting } from "./drafting";
import { scoreRound } from "./scoreRound";
import { gameOver } from "./gameOver";
import type { GameContract } from "../game-contract";
import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";

export const phases = {
  setup,
  drafting,
  scoreRound,
  gameOver,
} satisfies PhaseMapOf<GameContract>;
