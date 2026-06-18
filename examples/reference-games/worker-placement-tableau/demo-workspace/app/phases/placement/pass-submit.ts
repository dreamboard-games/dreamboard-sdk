import {
  boardInput,
  cardInput,
  defineInputs,
  defineInteraction,
  formInput,
  type PlayerBoardSpaceTarget,
} from "@dreamboard-games/sdk/reducer";
import {
  placementPhaseStateSchema,
  type GameContract,
  type GameState,
  type ItemId,
} from "../../game-contract";
import {
  craftCellTarget,
  craftAtWorkshopEligibility,
  effectiveItemCost,
  evaluateFulfillOrder,
  evaluatePlacement,
  fulfillableOrderTarget,
  placementSpaceTarget,
  playableApprenticeTarget,
} from "../../eligibility";
import {
  ITEMS,
  ORDERS,
  PERSISTENT_HOOKS,
  PERSISTENT_HOOK_ORDER,
  TRAINING_HALL_COIN_COST,
  detachedWorkerIds,
  edit,
  isOneShotApprenticeId,
  isOrderId,
  isPersistentApprenticeId,
  persistentCardsFor,
  pieceTypeOfWorker,
} from "../../reducer-support";
import {
  type ApprenticeCardsCardId,
  type CardId,
  type PieceId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
} from "../../../shared/manifest-contract";
import { advanceAfterPlayerAction } from "./turn-advance";
import {
  ACTION_BOARD_SPACE_IDS,
  ITEM_IDS,
  type ActionBoardSpaceId,
  type MarketChoice,
  anyBarrierActive,
  fixedActionFromSpaceId,
  hasCraftOptionRule,
  hasFulfillableOrderRule,
  hasPlaceableWorkerRule,
  hasPlayableApprenticeRule,
  hasReassignOptionRule,
  noPendingChoiceRule,
  pendingApothecaryRule,
  pendingLibraryRule,
  pendingMarketRule,
  pendingTradeRule,
} from "./rules";

// ── Pass placement ────────────────────────────────────────────────────────
export const passPlacement = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [noPendingChoiceRule],
  inputs: {},
  reduce({ state, input, accept, reject, fx }) {
    if (anyBarrierActive(state.phase)) {
      return reject(
        "PENDING_CHOICE_REQUIRED",
        "Resolve the pending choice first.",
      );
    }
    const playerId = input.playerId;
    const order = state.publicState.turnOrderThisSeason;
    const finalPassed = [
      ...new Set([...state.phase.passedPlayerIds, playerId]),
    ];
    const remaining = order.filter((pid) => !finalPassed.includes(pid));

    if (remaining.length === 0) {
      const tx = edit(state);
      tx.patchPhaseState({ passedPlayerIds: finalPassed });
      return accept(tx.state, [fx.transition("cleanup")]);
    }

    const currentIdx = order.indexOf(playerId);
    let nextIdx = (currentIdx + 1) % order.length;
    let safety = order.length;
    while (safety-- > 0 && finalPassed.includes(order[nextIdx]!)) {
      nextIdx = (nextIdx + 1) % order.length;
    }
    const nextPlayer = order[nextIdx]!;

    const tx = edit(state);
    tx.patchPhaseState({
      activePlayerIndex: nextIdx,
      passedPlayerIds: finalPassed,
    });
    tx.setActivePlayers([nextPlayer]);
    return accept(tx.state);
  },
});
