import {
  boardInput,
  defineInteraction,
  definePhase,
} from "@dreamboard-games/sdk/reducer";
import {
  wakeupPhaseStateSchema,
  type GameContract,
  type GameState,
} from "../game-contract";
import { wakeUpSlotTarget } from "../eligibility";
import type {
  PlayerId,
  ResourceId,
  SpaceId,
} from "../../shared/manifest-contract";
import { edit } from "../reducer-support";

// ── Slot ↔ side-table ─────────────────────────────────────────────────────
//
// We hard-code the 4-slot table from rule.md §wake-up bonuses rather than
// re-deriving it from the manifest field map at every call site. Single
// source of truth for: (a) the eligibility predicate, (b) the bonus
// dispatcher, (c) the turn-order derivation, (d) UI labels later.
const SLOT_SPACE_IDS = [
  "wake-up-1",
  "wake-up-2",
  "wake-up-3",
  "wake-up-4",
] as const satisfies readonly SpaceId[];

type SlotSpaceId = (typeof SLOT_SPACE_IDS)[number];

const SLOT_INDEX_BY_SPACE_ID: Readonly<
  Record<SlotSpaceId, "1" | "2" | "3" | "4">
> = {
  "wake-up-1": "1",
  "wake-up-2": "2",
  "wake-up-3": "3",
  "wake-up-4": "4",
};

// ── Selection interaction ─────────────────────────────────────────────────
const selectWakeUpSlot = defineInteraction<
  GameContract,
  typeof wakeupPhaseStateSchema
>()({
  inputs: {
    spaceId: boardInput.space<GameState, SpaceId>({
      target: wakeUpSlotTarget,
    }),
  },
  reduce({ state, input, accept, fx }) {
    const { spaceId } = input.params;
    const slotSpaceId = spaceId as SlotSpaceId;
    const slotKey = SLOT_INDEX_BY_SPACE_ID[slotSpaceId];
    const playerId = input.playerId;

    // Apply the slot's bonus immediately (rule.md §wake-up bonuses).
    const tx = edit(state);
    if (slotSpaceId === "wake-up-2") {
      const grant: Partial<Record<ResourceId, number>> = { coin: 1 };
      tx.addResources({ playerId, amounts: grant });
    } else if (slotSpaceId === "wake-up-3") {
      tx.dealCardsToPlayerZone({
        fromZoneId: "apprentice-deck",
        playerId,
        toZoneId: "apprentice-hand",
        count: 1,
      });
    } else if (slotSpaceId === "wake-up-4") {
      const grant: Partial<Record<ResourceId, number>> = { wood: 1, stone: 1 };
      tx.addResources({ playerId, amounts: grant });
    }
    // wake-up-1 has no bonus.

    // Mark the slot as claimed by writing a fresh wakeUpSelections map.
    const nextSelections = {
      ...state.publicState.wakeUpSelections,
      [slotKey]: playerId,
    };

    // Drop this player from the pending list.
    const nextPending = state.phase.pendingPlayerIds.filter(
      (pid) => pid !== playerId,
    );

    const isLastPick = nextPending.length === 0;

    if (!isLastPick) {
      const nextActor = nextPending[0]!;
      tx.patchPublicState({ wakeUpSelections: nextSelections });
      tx.patchPhaseState({ pendingPlayerIds: nextPending });
      tx.setActivePlayers([nextActor]);
      return accept(tx.state);
    }

    // All players have selected. Derive the new turn order from the slot
    // ordering: lower-numbered slots act first. Slots without an
    // occupant (e.g. 2-player game with only 2 picks) are skipped.
    const orderedSlotKeys: ("1" | "2" | "3" | "4")[] = ["1", "2", "3", "4"];
    const nextTurnOrder: PlayerId[] = [];
    for (const slot of orderedSlotKeys) {
      const occupant = nextSelections[slot];
      if (occupant) nextTurnOrder.push(occupant as PlayerId);
    }
    // Defensive: if every player was somehow filtered out, fall back to
    // the existing order so downstream phases never see an empty turn
    // order.
    const finalTurnOrder =
      nextTurnOrder.length > 0
        ? nextTurnOrder
        : [...state.publicState.turnOrderThisSeason];

    tx.patchPublicState({
      wakeUpSelections: nextSelections,
      turnOrderThisSeason: finalTurnOrder,
    });
    tx.patchPhaseState({ pendingPlayerIds: [] });
    tx.setActivePlayers([finalTurnOrder[0]!]);
    return accept(tx.state, { instructions: [fx.transition("placement")] });
  },
});

// ── Phase ─────────────────────────────────────────────────────────────────
export const wakeup = definePhase<GameContract>()({
  kind: "player",
  state: wakeupPhaseStateSchema,
  initialState: () => ({
    step: "select-slot" as const,
    pendingPlayerIds: [],
  }),
  actor: ({ state }) => state.phase.pendingPlayerIds[0] ?? null,
  enter({ state, accept }) {
    // Seed the pending queue from the (just-set-by-setup) season turn order.
    // Reset wakeUpSelections so a re-entry between seasons starts clean.
    const turnOrder = state.publicState.turnOrderThisSeason;
    const firstActor = turnOrder[0] ?? null;
    const tx = edit(state);
    tx.patchPublicState({ wakeUpSelections: {} });
    tx.patchPhaseState({
      step: "select-slot" as const,
      pendingPlayerIds: [...turnOrder],
    });
    if (firstActor) {
      tx.setActivePlayers([firstActor]);
    }
    return accept(tx.state);
  },
  interactions: {
    selectWakeUpSlot,
  },
});
