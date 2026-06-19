import type { z } from "zod";
import { placementPhaseStateSchema, type GameState } from "../../game-contract";
import { edit } from "../../reducer-support";
import type { PlayerId } from "../../../shared/manifest-contract";

type PlacementPhaseState = z.infer<typeof placementPhaseStateSchema>;
type PlacementScopedState = GameState & { phase: PlacementPhaseState };

export function initialPlacementState(): PlacementPhaseState {
  return {
    activePlayerIndex: 0,
    passedPlayerIds: [],
    pendingCraftBy: null,
    pendingMarketChoiceBy: null,
    spareHandsActiveBy: [],
    inspirationActiveBy: null,
    tirelessMasterPendingRecall: {
      "player-1": null,
      "player-2": null,
    },
    pendingTradeChoiceBy: null,
    forgeActiveBy: null,
    pendingLibraryDraw: {
      "player-1": null,
      "player-2": null,
    },
    pendingApothecaryChoiceBy: null,
  };
}

export function placementActor({
  state,
}: {
  state: PlacementScopedState;
}): PlayerId | null {
  if (state.phase.pendingCraftBy) return state.phase.pendingCraftBy;
  if (state.phase.pendingMarketChoiceBy)
    return state.phase.pendingMarketChoiceBy;
  if (state.phase.pendingTradeChoiceBy) return state.phase.pendingTradeChoiceBy;
  if (state.phase.pendingApothecaryChoiceBy) {
    return state.phase.pendingApothecaryChoiceBy;
  }
  for (const [pid, drawn] of Object.entries(state.phase.pendingLibraryDraw)) {
    if (drawn != null && drawn.length > 0) {
      return pid as PlayerId;
    }
  }

  const order = state.publicState.turnOrderThisSeason;
  const passed = state.phase.passedPlayerIds;
  const idx = state.phase.activePlayerIndex;
  if (order.length === 0) return null;
  const candidate = order[idx % order.length];
  if (!candidate) return null;
  return passed.includes(candidate) ? null : candidate;
}

export function resetPlacementState(
  state: PlacementScopedState,
): PlacementScopedState {
  const order = state.publicState.turnOrderThisSeason;
  const firstActor = order[0] ?? null;
  const tx = edit(state);
  tx.patchPhaseState(initialPlacementState());
  if (firstActor) {
    tx.setActivePlayers([firstActor]);
  }
  return tx.state as PlacementScopedState;
}
