import { z } from "zod";
import type { GameContract } from "../game-contract";
import { definePhase } from "@dreamboard-games/sdk/reducer";

// Wave-2 terminal phase. Multi-round play (loop until someone hits 100)
// is wave 3.
export const gameOver = definePhase<GameContract>()({
  kind: "auto",
  state: z.object({}),
  initialState: () => ({}),
});
