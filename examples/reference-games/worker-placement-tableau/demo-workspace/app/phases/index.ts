import { setup } from "./setup";
import { wakeup } from "./wakeup";
import { placement } from "./placement";
import { cleanup } from "./cleanup";
import { scoring } from "./scoring";
import { gameOver } from "./game-over";
import type { GameContract } from "../game-contract";
import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";

// `as const satisfies` (rather than a type annotation) preserves the literal
// per-phase state shapes so generated UI contracts can narrow correctly,
// matching the frontier-trails convention.
export const phases = {
  setup,
  wakeup,
  placement,
  cleanup,
  scoring,
  gameOver,
} as const satisfies PhaseMapOf<GameContract>;
