import { usePluginGameplayFrameSelector } from "../context/PluginGameplayFrameContext.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import {
  eligibleTargetsByBoardKind,
  hasBoardTargetInput,
} from "../utils/interaction-inputs.js";

/** Available interactions grouped by their input surface. */
export interface SeatInbox {
  /** Interactions grouped by derived UI bucket id. */
  bySurface: Record<string, readonly InteractionDescriptor[]>;
  /** Flat list of all available interactions (ungrouped). */
  all: readonly InteractionDescriptor[];
}

/** Uses the authoritative descriptors projected for the controlling seat. */
export function useSeatInbox(): SeatInbox {
  const interactions = usePluginGameplayFrameSelector(
    (frame) =>
      (frame.availableInteractions ??
        []) as ReadonlyArray<InteractionDescriptor>,
  );

  const bySurface: Record<string, InteractionDescriptor[]> = {};
  for (const descriptor of interactions) {
    const surface = bucketForDescriptor(descriptor);
    (bySurface[surface] ??= []).push(descriptor);
  }

  return {
    bySurface,
    all: interactions,
  };
}

function bucketForDescriptor(descriptor: InteractionDescriptor): string {
  if (descriptor.zoneId) return "hand";
  if (hasBoardTargetInput(descriptor)) {
    const byKind = eligibleTargetsByBoardKind(descriptor);
    if (byKind.vertex) return "board-vertex";
    if (byKind.edge) return "board-edge";
    if (byKind.tile) return "board-tile";
    if (byKind.space) return "board-space";
  }
  return "panel";
}
