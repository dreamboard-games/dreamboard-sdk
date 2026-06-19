import { defineInteractionRule } from "@dreamboard-games/sdk/reducer";
import {
  placementPhaseStateSchema,
  type GameContract,
  type GameState,
  type ItemId,
} from "../../game-contract";
import {
  evaluatePlacement,
  fulfillableOrdersFor,
  hasCraftOption,
} from "../../eligibility";
import {
  ITEMS,
  detachedWorkerIds,
  isOneShotApprenticeId,
  isPersistentApprenticeId,
  pieceTypeOfWorker,
  workerOwner,
} from "../../reducer-support";
import {
  boardHelpers,
  type PlayerId,
  type SpaceId,
} from "../../../shared/manifest-contract";

type FixedActionId =
  | "lumberyard"
  | "quarry"
  | "market"
  | "guild-hall"
  | "training-hall"
  | "workshop";

const FIXED_ACTION_IDS: ReadonlySet<string> = new Set<FixedActionId>([
  "lumberyard",
  "quarry",
  "market",
  "guild-hall",
  "training-hall",
  "workshop",
]);

export function fixedActionFromSpaceId(spaceId: SpaceId): FixedActionId | null {
  return FIXED_ACTION_IDS.has(spaceId) ? (spaceId as FixedActionId) : null;
}

const ACTION_BOARD_SPACES = boardHelpers.spaceIds("action-board");
export type ActionBoardSpaceId = (typeof ACTION_BOARD_SPACES)[number];
export const ACTION_BOARD_SPACE_IDS = new Set<string>(ACTION_BOARD_SPACES);

export const ITEM_IDS: readonly ItemId[] = Object.keys(ITEMS) as ItemId[];
export const MARKET_CHOICES = ["gain-coin", "sell-stone"] as const;
export type MarketChoice = (typeof MARKET_CHOICES)[number];

export function anyBarrierActive(phase: {
  pendingCraftBy: unknown;
  pendingMarketChoiceBy: unknown;
  pendingTradeChoiceBy: unknown;
  pendingApothecaryChoiceBy: unknown;
  pendingLibraryDraw: Record<string, readonly string[] | null>;
}): boolean {
  if (phase.pendingCraftBy != null) return true;
  if (phase.pendingMarketChoiceBy != null) return true;
  if (phase.pendingTradeChoiceBy != null) return true;
  if (phase.pendingApothecaryChoiceBy != null) return true;
  for (const drawn of Object.values(phase.pendingLibraryDraw)) {
    if (drawn != null && drawn.length > 0) return true;
  }
  return false;
}

const placementRule = defineInteractionRule<
  GameContract,
  typeof placementPhaseStateSchema
>();

export const noPendingChoiceRule = placementRule({
  id: "no-pending-choice",
  errorCode: "PENDING_CHOICE_REQUIRED",
  message: "Resolve the pending choice first.",
  available: ({ state }) => !anyBarrierActive(state.phase),
});

export const hasPlaceableWorkerRule = placementRule({
  id: "has-placeable-worker",
  errorCode: "NO_PLACEABLE_WORKER",
  message: "You have no worker that can be placed.",
  available: ({ state, input }) => {
    const playerId = input.playerId;
    const spareHandsActive = state.phase.spareHandsActiveBy.includes(playerId);
    const extraApprentices = spareHandsActive ? 1 : 0;
    return detachedWorkerIds(state, playerId, { extraApprentices }).some(
      (pieceId) =>
        state.publicState.enabledActionSpaces.some(
          (spaceId) =>
            evaluatePlacement(state, playerId, pieceId, spaceId, {
              extraApprentices,
            }).ok,
        ),
    );
  },
});

export const hasCraftOptionRule = placementRule({
  id: "has-craft-option",
  errorCode: "NO_PENDING_CRAFT",
  message: "You don't have a pending workshop craft.",
  available: ({ state, input }) => {
    const playerId = input.playerId;
    const isPendingCraftWorker = state.phase.pendingCraftBy === playerId;
    const isInspirationCraft = state.phase.inspirationActiveBy === playerId;
    const isForgeCraft = state.phase.forgeActiveBy === playerId;
    if (!isPendingCraftWorker && !isInspirationCraft && !isForgeCraft) {
      return false;
    }
    const woodDiscount = isInspirationCraft ? 1 : 0;
    const stoneDiscount = isForgeCraft ? 1 : 0;
    return hasCraftOption(state, playerId, { woodDiscount, stoneDiscount });
  },
});

export const pendingMarketRule = placementRule({
  id: "pending-market-choice",
  errorCode: "NO_PENDING_MARKET",
  message: "You don't have a pending market choice.",
  available: ({ state, input }) =>
    state.phase.pendingMarketChoiceBy === input.playerId,
});

export const pendingTradeRule = placementRule({
  id: "pending-trade-choice",
  errorCode: "NO_PENDING_TRADE",
  message: "You don't have a pending trade-post choice.",
  available: ({ state, input }) =>
    state.phase.pendingTradeChoiceBy === input.playerId,
});

export const pendingLibraryRule = placementRule({
  id: "pending-library-discard",
  errorCode: "NO_PENDING_LIBRARY",
  message: "You don't have a pending library discard.",
  available: ({ state, input }) => {
    const drawn = state.phase.pendingLibraryDraw[input.playerId] ?? null;
    return drawn != null && drawn.length > 0;
  },
});

export const pendingApothecaryRule = placementRule({
  id: "pending-apothecary-recall",
  errorCode: "NO_PENDING_APOTHECARY",
  message: "You don't have a pending apothecary recall.",
  available: ({ state, input }) =>
    state.phase.pendingApothecaryChoiceBy === input.playerId,
});

export const hasFulfillableOrderRule = placementRule({
  id: "has-fulfillable-order",
  errorCode: "NO_FULFILLABLE_ORDER",
  message: "You have no order that can be fulfilled.",
  available: ({ state, input, q }) =>
    fulfillableOrdersFor(state, q, input.playerId).length > 0,
});

export const hasPlayableApprenticeRule = placementRule({
  id: "has-playable-apprentice",
  errorCode: "NO_PLAYABLE_APPRENTICE",
  message: "You have no apprentice card that can be played.",
  available: ({ state, input, q }) => {
    const playerId = input.playerId;
    const tableau =
      state.publicState.playedPersistentApprentices[playerId] ?? [];
    return q.zone.playerCards(playerId, "apprentice-hand").some((cardId) => {
      if (cardId === "reassign") return false;
      if (isOneShotApprenticeId(cardId)) return true;
      return isPersistentApprenticeId(cardId) && !tableau.includes(cardId);
    });
  },
});

export const hasReassignOptionRule = placementRule({
  id: "has-reassign-option",
  errorCode: "NO_REASSIGN_OPTION",
  message: "You cannot reassign a worker.",
  available: ({ state, input, q }) => {
    const playerId = input.playerId;
    if (!q.zone.playerCards(playerId, "apprentice-hand").includes("reassign")) {
      return false;
    }
    return Object.entries(state.publicState.workerLocations).some(
      ([pieceId, location]) =>
        location != null && workerOwner(pieceId) === playerId,
    );
  },
});
