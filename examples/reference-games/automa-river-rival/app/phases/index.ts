import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../game-contract";
import { advanceRiverRound } from "./advance-river-round";
import { gameOver } from "./game-over";
import { humanTurn } from "./human-turn";
import { resolveRival } from "./rival-procedure";
import { setup } from "./setup";

export const phases = {
  setup,
  humanTurn,
  resolveRival,
  advanceRiverRound,
  gameOver,
} satisfies PhaseMapOf<GameContract>;
