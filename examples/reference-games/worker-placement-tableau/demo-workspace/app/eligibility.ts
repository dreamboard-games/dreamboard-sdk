// Centralised board-eligibility helpers. Each interaction's
// `boardInput.*` collector references one of these helpers as its
// `target` so the rule lives in one place — `validate()` rejects
// unauthorised submissions while the host runtime ships the same
// predicate's projected target list to UI clients.
import {
  boardTarget,
  cardTarget,
  type TableQueriesOfState,
} from "@dreamboard-games/sdk/reducer";
import type {
  GameErrorCode,
  GameState,
  ItemId,
  WakeupPhaseState,
} from "./game-contract";
import {
  boardHelpers,
  type CardId,
  type PieceId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
} from "../shared/manifest-contract";
import {
  ITEMS,
  ORDERS,
  TRAINING_HALL_COIN_COST,
  adjacentOwnedItemCount,
  detachedWorkerIds,
  isMatCell,
  isOneShotApprenticeId,
  isOrderId,
  isPersistentApprenticeId,
  matCornerCells,
  orderRequirementMet,
  pieceTypeOfWorker,
  playerMatItems,
  workerOwner,
} from "./reducer-support";

const WAKE_UP_BOARD = "wake-up-track" as const;
const ACTION_BOARD = "action-board" as const;

function wakeupPhase(state: GameState): WakeupPhaseState | null {
  return state.phase.get("wakeup");
}

function isWakeUpSlotSpaceId(spaceId: SpaceId): boolean {
  return (
    boardHelpers.spaceIdsForType("wake-up-slot") as readonly string[]
  ).includes(spaceId);
}

/**
 * A wake-up-track space is selectable when:
 *   1. It is a `wake-up-slot` space (defensive — the collector is already
 *      scoped to `wake-up-track`).
 *   2. Wake-up phase is active.
 *   3. No player has claimed that slot yet this season.
 */
export const wakeUpSlotTarget = boardTarget
  .space<GameState, SpaceId>(WAKE_UP_BOARD)
  .where({
    id: "isSlot",
    errorCode: "NOT_A_WAKE_UP_SLOT",
    message: "Pick a wake-up-track slot.",
    test: ({ targetId }) => isWakeUpSlotSpaceId(targetId),
  })
  .where({
    id: "phaseActive",
    errorCode: "WAKEUP_NOT_ACTIVE",
    message: "Wake-up phase is not active.",
    test: ({ state }) => wakeupPhase(state) !== null,
  })
  .where({
    id: "unclaimed",
    errorCode: "SLOT_ALREADY_TAKEN",
    message: "That wake-up slot is already taken.",
    test: ({ state, targetId }) => {
      const slotIndexBySpaceId: Record<string, string> = {
        "wake-up-1": "1",
        "wake-up-2": "2",
        "wake-up-3": "3",
        "wake-up-4": "4",
      };
      const slotKey = slotIndexBySpaceId[targetId];
      if (!slotKey) return false;
      return state.publicState.wakeUpSelections[slotKey] == null;
    },
  })
  .build();

// ── Placement helpers ─────────────────────────────────────────────────────

/**
 * Spaces eligible to receive a worker placement. We do not yet narrow by
 * the chosen worker's piece type (apprentice vs master) — that distinction
 * is checked in the reducer body. Eligibility here is the universal gate:
 *   • space is one of `publicState.enabledActionSpaces`
 *   • space is on the action-board (defensive)
 *
 * Per-worker rules (apprentice unoccupied, master overrides, training-hall
 * affordability) are validated in the placement reducer where it can read
 * the selected `componentId`. The host runtime still gets a helpful target
 * list because placements always start from this set.
 */
export const placementSpaceTarget = boardTarget
  .space<GameState, SpaceId>(ACTION_BOARD)
  .where({
    id: "enabled",
    errorCode: "SPACE_NOT_ENABLED",
    message: "That action space is not active this game.",
    test: ({ state, targetId }) =>
      state.publicState.enabledActionSpaces.includes(targetId),
  })
  .where({
    id: "selectedWorkerCanPlace",
    errorCode: "WORKER_CANNOT_PLACE_THERE",
    message: "That worker cannot be placed on that action space.",
    test: ({ state, playerId, targetId, values }) => {
      const componentId = values?.componentId;
      const placement = state.phase.get("placement");
      const extraApprentices = placement?.spareHandsActiveBy.includes(playerId)
        ? 1
        : 0;
      if (typeof componentId !== "string") {
        const candidates = [
          ...detachedWorkerIds(state, playerId, { extraApprentices }),
        ];
        const pendingMasterId = pendingTirelessMasterIdForTarget(
          state,
          playerId,
        );
        if (pendingMasterId) candidates.push(pendingMasterId);
        return candidates.some((pieceId) => {
          const placementState =
            stateWithPendingTirelessMasterRecalledForTarget(
              state,
              playerId,
              pieceId,
            );
          return evaluatePlacement(
            placementState,
            playerId,
            pieceId,
            targetId,
            {
              extraApprentices,
            },
          ).ok;
        });
      }
      const placementState = stateWithPendingTirelessMasterRecalledForTarget(
        state,
        playerId,
        componentId as PieceId,
      );
      return evaluatePlacement(
        placementState,
        playerId,
        componentId as PieceId,
        targetId,
        { extraApprentices },
      ).ok;
    },
  })
  .build();

export type ReassignDestinationDecision =
  | { ok: true }
  | { ok: false; errorCode: GameErrorCode; message: string };

export function reassignableWorkerChoicesForPlayer(
  state: GameState,
  playerId: PlayerId,
): readonly PieceId[] {
  return Object.entries(state.publicState.workerLocations)
    .filter(
      ([pieceId, location]) =>
        location != null && workerOwner(pieceId) === playerId,
    )
    .map(([pieceId]) => pieceId as PieceId);
}

export function evaluateReassignDestination(
  state: GameState,
  playerId: PlayerId,
  pieceId: PieceId,
  toSpaceId: SpaceId,
): ReassignDestinationDecision {
  if (workerOwner(pieceId) !== playerId) {
    return {
      ok: false,
      errorCode: "NOT_YOUR_WORKER",
      message: "You can only reassign your own workers.",
    };
  }
  const fromSpaceId = state.publicState.workerLocations[pieceId] ?? null;
  if (fromSpaceId == null) {
    return {
      ok: false,
      errorCode: "WORKER_NOT_PLACED",
      message: "Choose one of your workers already on the action board.",
    };
  }
  if (fromSpaceId === toSpaceId) {
    return {
      ok: false,
      errorCode: "REASSIGN_SAME_SPACE",
      message: "Choose a different destination space.",
    };
  }
  if (!state.publicState.enabledActionSpaces.includes(toSpaceId)) {
    return {
      ok: false,
      errorCode: "SPACE_NOT_ENABLED",
      message: "That action space is not active this game.",
    };
  }
  const isApprentice = pieceTypeOfWorker(pieceId) === "apprentice";
  const occupant = findWorkerAt(state, toSpaceId);
  if (isApprentice && occupant != null && occupant !== pieceId) {
    return {
      ok: false,
      errorCode: "SPACE_OCCUPIED",
      message: "That space already has a worker; only a master can override.",
    };
  }
  return { ok: true };
}

export const reassignDestinationTarget = boardTarget
  .space<GameState, SpaceId>(ACTION_BOARD)
  .where({
    id: "selectedWorkerCanReassign",
    errorCode: "WORKER_CANNOT_REASSIGN_THERE",
    message: "That worker cannot be reassigned to that action space.",
    test: ({ state, playerId, targetId, values }) => {
      const pieceId = values?.pieceId;
      if (typeof pieceId !== "string") return false;
      return evaluateReassignDestination(
        state,
        playerId,
        pieceId as PieceId,
        targetId,
      ).ok;
    },
  })
  .build();

export const craftCellTarget = boardTarget
  .playerSpace<GameState, "workshop-mat", SpaceId>("workshop-mat")
  .where({
    id: "craftableCell",
    errorCode: "CELL_NOT_CRAFTABLE",
    message: "You cannot craft that item on that mat cell.",
    test: ({ state, playerId, target, values }) => {
      if (target.playerId !== playerId) return false;
      return (
        isMatCell(target.spaceId) &&
        !cellOccupiedByPlayer(state, playerId, target.spaceId)
      );
    },
  })
  .build();

/**
 * Returns the active player's detached worker piece ids — both apprentices
 * (covered by `apprenticeRosterSize`) and the implicit master.
 */
export function detachedWorkerChoicesForPlayer(
  state: GameState,
  playerId: PlayerId,
): readonly PieceId[] {
  return detachedWorkerIds(state, playerId);
}

/**
 * Reducer-side gate combining the per-worker rules. Returns either
 * `{ ok: true }` or `{ ok: false, errorCode, message }` so the placement
 * reducer can route to `accept` or `reject` without rebuilding the
 * predicate.
 */
export function evaluatePlacement(
  state: GameState,
  playerId: PlayerId,
  componentId: PieceId,
  spaceId: SpaceId,
  options: { extraApprentices?: number } = {},
): { ok: true } | { ok: false; errorCode: GameErrorCode; message: string } {
  if (!state.publicState.enabledActionSpaces.includes(spaceId)) {
    return {
      ok: false,
      errorCode: "SPACE_NOT_ENABLED",
      message: "That action space is not active this game.",
    };
  }
  if (workerOwner(componentId) !== playerId) {
    return {
      ok: false,
      errorCode: "NOT_YOUR_WORKER",
      message: "You can only place your own workers.",
    };
  }
  if (state.publicState.workerLocations[componentId] != null) {
    return {
      ok: false,
      errorCode: "WORKER_ALREADY_PLACED",
      message: "That worker is already on the board.",
    };
  }
  // The remaining apprentice roster cap: apprenticeRosterSize counts the
  // pieces the player has actually trained. Untrained apprentices are
  // detached but not yet "available". For T070 the initial roster is 2
  // apprentices + 1 master, and Training Hall (T080+) bumps the cap.
  const isApprentice = pieceTypeOfWorker(componentId) === "apprentice";
  if (isApprentice) {
    const used = countPlacedApprentices(state, playerId);
    const cap =
      (state.publicState.apprenticeRosterSize[playerId] ?? 0) +
      (options.extraApprentices ?? 0);
    if (used >= cap) {
      return {
        ok: false,
        errorCode: "ROSTER_EXHAUSTED",
        message: "All of your trained apprentices are already placed.",
      };
    }
  }

  // Apprentice / master occupancy rules.
  const occupant = findWorkerAt(state, spaceId);
  if (isApprentice && occupant != null) {
    return {
      ok: false,
      errorCode: "SPACE_OCCUPIED",
      message: "That space already has a worker; only a master can override.",
    };
  }

  // Training Hall affordability gate (rule.md §Training Hall: pay 3 coin).
  // We require coin to be on hand before placing so callers can't park a
  // worker on an action that fails to resolve.
  if (spaceId === "training-hall") {
    const coin = state.table.resources.entries.find(
      ([pid]) => pid === playerId,
    )?.[1].coin;
    if ((coin ?? 0) < TRAINING_HALL_COIN_COST) {
      return {
        ok: false,
        errorCode: "INSUFFICIENT_COIN_FOR_TRAINING_HALL",
        message: `Training Hall costs ${TRAINING_HALL_COIN_COST} coin.`,
      };
    }
  }
  if (spaceId === "workshop" && !hasCraftOption(state, playerId)) {
    return {
      ok: false,
      errorCode: "NO_CRAFT_OPTION",
      message: "You cannot craft any item right now.",
    };
  }

  return { ok: true };
}

function countPlacedApprentices(state: GameState, playerId: PlayerId): number {
  let placed = 0;
  for (const [pieceId, spaceId] of Object.entries(
    state.publicState.workerLocations,
  )) {
    if (spaceId == null) continue;
    if (workerOwner(pieceId) !== playerId) continue;
    if (pieceTypeOfWorker(pieceId) === "apprentice") placed++;
  }
  return placed;
}

function findWorkerAt(state: GameState, spaceId: SpaceId): PieceId | null {
  for (const [pieceId, location] of Object.entries(
    state.publicState.workerLocations,
  )) {
    if (location === spaceId) return pieceId as PieceId;
  }
  return null;
}

function stateWithPendingTirelessMasterRecalledForTarget(
  state: GameState,
  playerId: PlayerId,
  componentId: PieceId,
): GameState {
  const masterId = playerId === "player-1" ? "master-p1" : "master-p2";
  if (componentId !== masterId) return state;
  const placement = state.phase.get("placement");
  const recallSpace = placement?.tirelessMasterPendingRecall[playerId] ?? null;
  if (recallSpace == null) return state;
  if (state.publicState.workerLocations[componentId] !== recallSpace) {
    return state;
  }
  return {
    ...state,
    publicState: {
      ...state.publicState,
      workerLocations: {
        ...state.publicState.workerLocations,
        [componentId]: null,
      },
    },
  };
}

function pendingTirelessMasterIdForTarget(
  state: GameState,
  playerId: PlayerId,
): PieceId | null {
  const masterId = playerId === "player-1" ? "master-p1" : "master-p2";
  const placement = state.phase.get("placement");
  const recallSpace = placement?.tirelessMasterPendingRecall[playerId] ?? null;
  if (recallSpace == null) return null;
  return state.publicState.workerLocations[masterId] === recallSpace
    ? masterId
    : null;
}

// ── Workshop crafting eligibility ─────────────────────────────────────────

function getPlayerCoin(
  state: GameState,
  playerId: PlayerId,
  resourceId: ResourceId,
): number {
  const entry = state.table.resources.entries.find(([pid]) => pid === playerId);
  return entry?.[1][resourceId] ?? 0;
}

/**
 * Resolve the effective per-resource cost of crafting an item with
 * optional discount applied (Inspiration: wood −1; Forge: stone −1).
 * Pure helper shared by the eligibility predicate and the reducer that
 * performs the spend so they can never disagree.
 */
export function effectiveItemCost(
  itemId: ItemId,
  options: { woodDiscount?: number; stoneDiscount?: number } = {},
): Partial<Record<ResourceId, number>> {
  const woodDiscount = options.woodDiscount ?? 0;
  const stoneDiscount = options.stoneDiscount ?? 0;
  const cost = ITEMS[itemId].cost;
  if (woodDiscount === 0 && stoneDiscount === 0) return cost;
  const next: Partial<Record<ResourceId, number>> = { ...cost };
  if (woodDiscount > 0 && "wood" in next) {
    next.wood = Math.max(0, (next.wood ?? 0) - woodDiscount);
  }
  if (stoneDiscount > 0 && "stone" in next) {
    next.stone = Math.max(0, (next.stone ?? 0) - stoneDiscount);
  }
  return next;
}

function canAffordItem(
  state: GameState,
  playerId: PlayerId,
  itemId: ItemId,
  options: { woodDiscount?: number; stoneDiscount?: number } = {},
): boolean {
  const cost = effectiveItemCost(itemId, options);
  for (const [resourceId, amount] of Object.entries(cost)) {
    const have = getPlayerCoin(state, playerId, resourceId as ResourceId);
    if (have < (amount ?? 0)) return false;
  }
  return true;
}

/**
 * Does this player already have an item on `cellSpaceId`?
 */
function cellOccupiedByPlayer(
  state: GameState,
  playerId: PlayerId,
  cellSpaceId: SpaceId,
): boolean {
  return playerMatItems(state, playerId)[cellSpaceId] != null;
}

export type CraftAtWorkshopDecision =
  | { ok: true }
  | { ok: false; errorCode: GameErrorCode; message: string };

export function hasCraftOption(
  state: GameState,
  playerId: PlayerId,
  options: { woodDiscount?: number; stoneDiscount?: number } = {},
): boolean {
  return (Object.keys(ITEMS) as ItemId[]).some((itemId) =>
    Array.from({ length: 3 }).some((_, row) =>
      Array.from({ length: 4 }).some(
        (_, col) =>
          craftAtWorkshopEligibility(
            state,
            playerId,
            `cell-r${row}-c${col}` as SpaceId,
            itemId,
            options,
          ).ok,
      ),
    ),
  );
}

/**
 * Reducer-side gate for `craftAtWorkshop`. Pure function so call sites
 * can assert eligibility without mutating state. Returns the same
 * accept/reject shape as `evaluatePlacement`.
 */
export function craftAtWorkshopEligibility(
  state: GameState,
  playerId: PlayerId,
  cellSpaceId: SpaceId,
  itemId: ItemId,
  options: { woodDiscount?: number; stoneDiscount?: number } = {},
): CraftAtWorkshopDecision {
  if (!isMatCell(cellSpaceId)) {
    return {
      ok: false,
      errorCode: "NOT_A_MAT_CELL",
      message: "You can only craft on workshop-mat cells.",
    };
  }
  if (cellOccupiedByPlayer(state, playerId, cellSpaceId)) {
    return {
      ok: false,
      errorCode: "CELL_OCCUPIED",
      message: "That mat cell already holds an item.",
    };
  }
  if (!canAffordItem(state, playerId, itemId, options)) {
    return {
      ok: false,
      errorCode: "CANNOT_AFFORD_ITEM",
      message: `You cannot afford a ${ITEMS[itemId].name}.`,
    };
  }
  const rule = ITEMS[itemId].placementRule;
  if (rule === "corner-only") {
    if (!matCornerCells().has(cellSpaceId)) {
      return {
        ok: false,
        errorCode: "MUST_BE_CORNER",
        message: "This item must go on a corner cell.",
      };
    }
  } else if (rule === "touch-one") {
    if (adjacentOwnedItemCount(state, playerId, cellSpaceId) < 1) {
      return {
        ok: false,
        errorCode: "MUST_TOUCH_ONE",
        message: "This item must touch at least one other item you own.",
      };
    }
  } else if (rule === "touch-two") {
    if (adjacentOwnedItemCount(state, playerId, cellSpaceId) < 2) {
      return {
        ok: false,
        errorCode: "MUST_TOUCH_TWO",
        message: "This item must touch at least two other items you own.",
      };
    }
  }
  return { ok: true };
}

// ── Order fulfillment ─────────────────────────────────────────────────────

type Q = TableQueriesOfState<GameState>;

/**
 * Card ids in the player's order-hand whose requirement is currently
 * satisfied by their mat occupancy. Used both by the host runtime to
 * tell the UI which order cards "glow" and by the `fulfillOrder`
 * reducer's eligibility check.
 */
export function fulfillableOrdersFor(
  state: GameState,
  q: Q,
  playerId: PlayerId,
): readonly CardId[] {
  const hand = q.zone.playerCards(playerId, "order-hand");
  const out: CardId[] = [];
  for (const cardId of hand) {
    if (!isOrderId(cardId)) continue;
    if (orderRequirementMet(state, playerId, ORDERS[cardId].requirement)) {
      out.push(cardId);
    }
  }
  return out;
}

export const fulfillableOrderTarget = cardTarget
  .zones<GameState, CardId, readonly ["order-hand"]>(["order-hand"])
  .where({
    id: "requirementMet",
    errorCode: "ORDER_REQUIREMENT_NOT_MET",
    message: "That order cannot be fulfilled yet.",
    test: ({ state, playerId, q, targetId }) =>
      evaluateFulfillOrder(state, q, playerId, targetId).ok,
  })
  .build();

export const playableApprenticeTarget = cardTarget
  .zones<GameState, CardId, readonly ["apprentice-hand"]>(["apprentice-hand"])
  .where({
    id: "playableApprentice",
    errorCode: "APPRENTICE_CARD_NOT_PLAYABLE",
    message: "That apprentice card cannot be played now.",
    test: ({ state, playerId, targetId }) => {
      if (targetId === "reassign") return false;
      if (isOneShotApprenticeId(targetId)) return true;
      if (!isPersistentApprenticeId(targetId)) return false;
      const tableau =
        state.publicState.playedPersistentApprentices[playerId] ?? [];
      return !tableau.includes(targetId);
    },
  })
  .build();

export const reassignApprenticeTarget = cardTarget
  .zones<GameState, CardId, readonly ["apprentice-hand"]>(["apprentice-hand"])
  .where({
    id: "reassignCard",
    errorCode: "NOT_REASSIGN_CARD",
    message: "Choose the Reassign apprentice card.",
    test: ({ state, playerId, targetId }) => {
      if (targetId !== "reassign") return false;
      return Object.entries(state.publicState.workerLocations).some(
        ([pieceId, location]) =>
          location != null && workerOwner(pieceId) === playerId,
      );
    },
  })
  .build();

export type FulfillOrderDecision =
  | { ok: true }
  | { ok: false; errorCode: GameErrorCode; message: string };

/**
 * Reducer-side gate for `fulfillOrder`. Verifies the card is in the
 * player's hand, is an order card, and the order's requirement is met.
 * Pending workshop / market barriers and turn ownership are checked at
 * the placement-phase boundary.
 */
export function evaluateFulfillOrder(
  state: GameState,
  q: Q,
  playerId: PlayerId,
  cardId: CardId,
): FulfillOrderDecision {
  if (!isOrderId(cardId)) {
    return {
      ok: false,
      errorCode: "NOT_AN_ORDER_CARD",
      message: "That card is not an Order card.",
    };
  }
  const hand = q.zone.playerCards(playerId, "order-hand");
  const inHand = hand.includes(cardId);
  if (!inHand) {
    return {
      ok: false,
      errorCode: "ORDER_NOT_IN_HAND",
      message: "You do not hold that order card.",
    };
  }
  if (!orderRequirementMet(state, playerId, ORDERS[cardId].requirement)) {
    return {
      ok: false,
      errorCode: "ORDER_REQUIREMENT_NOT_MET",
      message: `Your mat does not satisfy "${ORDERS[cardId].name}".`,
    };
  }
  return { ok: true };
}
