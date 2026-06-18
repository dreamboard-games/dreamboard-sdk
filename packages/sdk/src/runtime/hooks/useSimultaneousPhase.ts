import { usePluginGameplayFrameSelector } from "../context/PluginGameplayFrameContext.js";
import type { SimultaneousPhaseSnapshot } from "../types/plugin-state.js";

/**
 * Returns visibility-safe progress metadata for the active simultaneous-player
 * phase, or null when no simultaneous submission barrier is active.
 */
export function useSimultaneousPhase(): SimultaneousPhaseSnapshot | null {
  return usePluginGameplayFrameSelector(
    (frame) =>
      (frame.flow.simultaneousPhase ??
        null) as SimultaneousPhaseSnapshot | null,
  );
}
