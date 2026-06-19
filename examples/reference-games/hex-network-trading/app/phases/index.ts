import { setup } from "./setup";
import { playerTurn } from "./player-turn";
import { checkGameEnd } from "./check-game-end";
import { gameOver } from "./game-over";
import type { GameContract } from "../game-contract";
import type { PhaseMapOf } from "@dreamboard-games/sdk/reducer";

// NOTE: we use `satisfies` rather than a type annotation so that TypeScript
// *preserves* the literal-typed flow shape (e.g. the `"accept" | "reject"`
// option ids on `trade-offer`). An annotation like `: PhaseMapOf<GameContract>`
// would widen the flow types, which then propagates into the generated
// ui-contract and breaks `useChoicePrompt<"trade-offer">`'s ability to infer
// the response type.
export const phases = {
  setup,
  playerTurn,
  checkGameEnd,
  gameOver,
} as const satisfies PhaseMapOf<GameContract>;
