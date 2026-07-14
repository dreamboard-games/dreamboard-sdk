import { definePhase } from "@dreamboard-games/sdk/reducer";
import {
  sketchbookPhaseStateSchema,
  type GameContract,
} from "../game-contract";
import { FRESH_TURN } from "./player-turn/state";

export const gameOver = definePhase<GameContract>()({
  kind: "auto",
  state: sketchbookPhaseStateSchema,
  initialState: () => ({ ...FRESH_TURN }),
});
