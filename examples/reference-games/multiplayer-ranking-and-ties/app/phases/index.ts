import type { GameContract } from "../game-contract";
import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";
import { drafting } from "./drafting";
import { gameOver } from "./game-over";
import { setup } from "./setup";

export const phases = {
  setup,
  drafting,
  gameOver,
} satisfies PhaseMapOf<GameContract>;
