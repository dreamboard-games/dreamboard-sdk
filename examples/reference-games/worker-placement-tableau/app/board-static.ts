import { defineStaticView } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "./game-contract";

// Static, session-scoped projection. Filled in alongside the player-view
// shape in T080+. For T040 we project an empty object so the view typing
// is concrete without committing to a board layout shape.
export const boardStatic = defineStaticView<GameContract>()({
  project: () => ({}) as const,
});
