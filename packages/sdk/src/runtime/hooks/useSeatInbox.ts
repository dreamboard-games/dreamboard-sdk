import { usePluginGameplayFrameSelector } from "../context/PluginGameplayFrameContext.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import {
  eligibleTargetsByBoardKind,
  hasBoardTargetInput,
} from "../utils/interaction-inputs.js";

/**
 * Structured inbox view of the controlling seat's available interactions.
 * Interactions are grouped into UI behavior buckets. Prompt-kind interactions
 * (authored via `promptInput(...)`) surface at `bySurface.inbox`.
 */
export interface SeatInbox {
  /** Interactions grouped by derived UI bucket id. */
  bySurface: Record<string, readonly InteractionDescriptor[]>;
  /** Prompt-kind interactions addressed to the controlling seat. */
  prompts: readonly InteractionDescriptor[];
  /** Flat list of all available interactions (ungrouped). */
  all: readonly InteractionDescriptor[];
}

/**
 * Returns the controlling seat's available interactions grouped by UI bucket.
 * Prompt-kind interactions (authored via `promptInput(...)`) appear both in
 * `bySurface.inbox` and in `prompts`. Backed by authoritative descriptors
 * from the trusted bundle — clients MUST NOT recompute availability.
 */
export function useSeatInbox(): SeatInbox {
  const interactions = usePluginGameplayFrameSelector(
    (frame) =>
      (frame.availableInteractions ??
        []) as ReadonlyArray<InteractionDescriptor>,
  );

  const bySurface: Record<string, InteractionDescriptor[]> = {};
  const prompts: InteractionDescriptor[] = [];
  for (const descriptor of interactions) {
    const surface = bucketForDescriptor(descriptor);
    (bySurface[surface] ??= []).push(descriptor);
    if (descriptor.kind === "prompt") {
      prompts.push(descriptor);
    }
  }

  return {
    bySurface,
    prompts,
    all: interactions,
  };
}

function bucketForDescriptor(descriptor: InteractionDescriptor): string {
  if (descriptor.kind === "prompt") return "inbox";
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
