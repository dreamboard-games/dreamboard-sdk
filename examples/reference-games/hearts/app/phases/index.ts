import { gameOver } from "./gameOver";
import { passing } from "./passing";
import { playing } from "./playing";
import { scoreHand } from "./scoreHand";
import { setup } from "./setup";
import type { GameContract } from "../game-contract";
import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";

export const phases = {
  setup,
  passing,
  playing,
  scoreHand,
  gameOver,
} satisfies PhaseMapOf<GameContract>;
