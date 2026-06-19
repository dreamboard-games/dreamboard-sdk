import { setup } from "./setup";
import { drafting } from "./drafting";
import { gameOver } from "./game-over";
import type { GameContract } from "../game-contract";
import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";

export const phases = {
  setup,
  drafting,
  gameOver,
} satisfies PhaseMapOf<GameContract>;
