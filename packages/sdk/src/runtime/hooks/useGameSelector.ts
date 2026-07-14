import type { GameView } from "#dreamboard/ui-contract";
import type { PluginGameplayFrame } from "@dreamboard-games/plugin-runtime-contract";
import { usePluginGameplayFrameSelector } from "../context/PluginGameplayFrameContext.js";
import {
  defaultRuntimeSnapshotEquality,
  type EqualityFn,
} from "./useRuntimeSnapshotSelector.js";

function requireProjectedView(
  frame: PluginGameplayFrame | null | undefined,
  message: string,
): GameView {
  const view = frame?.view;
  if (view === null || typeof view === "undefined") {
    throw new Error(message);
  }
  return view as GameView;
}

/**
 * Hook to select a derived value from the projected reducer view.
 * Only re-renders when the selected slice changes according to the equalityFn.
 *
 * @param selector - Function to extract data from the projected view
 * @param equalityFn - Optional equality function for selected slice comparison
 * @returns Selected value from the current projected view
 */
export function useGameSelector<T>(
  selector: (state: GameView) => T,
  equalityFn: EqualityFn<T> = defaultRuntimeSnapshotEquality,
): T {
  const message =
    "useGameSelector: Projected view not available. Ensure the reducer-native host payload is initialized.";

  return usePluginGameplayFrameSelector(
    (frame) => selector(requireProjectedView(frame, message)),
    equalityFn,
  );
}
