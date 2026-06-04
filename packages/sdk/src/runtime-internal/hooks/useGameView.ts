import type { GameView } from "#dreamboard/ui-contract";
import { useGameSelector } from "./useGameSelector.js";

/**
 * Hook to access the current seat-projected reducer-native view.
 */
export function useGameView(): GameView {
  return useGameSelector((view) => view);
}
