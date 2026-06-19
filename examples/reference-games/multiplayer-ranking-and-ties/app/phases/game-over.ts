import { z } from "zod";
import { definePhase } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../game-contract";

export const gameOver = definePhase<GameContract>()({
  kind: "auto",
  state: z.object({}),
  initialState: () => ({}),
});
