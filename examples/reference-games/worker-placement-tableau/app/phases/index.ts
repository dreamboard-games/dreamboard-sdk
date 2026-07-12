import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../game-contract";
import { cleanup } from "./cleanup";
import { gameOver } from "./game-over";
import { placement } from "./placement";
import { scoring } from "./scoring";
import { setup } from "./setup";

export const phases = {
  setup,
  placement,
  cleanup,
  scoring,
  gameOver,
} as const satisfies PhaseMapOf<GameContract>;
