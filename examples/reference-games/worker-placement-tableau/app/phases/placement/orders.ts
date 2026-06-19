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

// ── Fulfill an Order card ─────────────────────────────────────────────────
//
// Per rule.md the player may fulfil an Order on their turn at any
// point — no worker required. We gate on barrier-clear + own-turn and
// trust `evaluateFulfillOrder` for the requirement check. After the
// reward, the same player resumes their turn (no advance).
export const fulfillOrder = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [noPendingChoiceRule, hasFulfillableOrderRule],
  inputs: {
    cardId: cardInput<GameState, CardId, readonly ["order-hand"]>({
      target: fulfillableOrderTarget,
    }),
  },
  reduce({ state, input, accept, reject, q }) {
    const playerId = input.playerId;
    if (anyBarrierActive(state.phase)) {
      return reject(
        "PENDING_CHOICE_REQUIRED",
        "Resolve the pending choice first.",
      );
    }
    const cardId = input.params.cardId;
    const decision = evaluateFulfillOrder(state, q, playerId, cardId);
    if (!decision.ok) {
      return reject(decision.errorCode, decision.message);
    }
    if (!isOrderId(cardId)) {
      // Unreachable after `evaluateFulfillOrder`; the type narrow keeps
      // ORDERS lookup safe.
      return reject("NOT_AN_ORDER_CARD", "That card is not an Order card.");
    }
    const order = ORDERS[cardId];

    const tx = edit(state);
    tx.moveCardFromPlayerZoneToSharedZone({
      playerId,
      fromZoneId: "order-hand",
      toZoneId: "order-discard",
      cardId,
    });
    tx.patchPublicState({
      playerVP: {
        ...state.publicState.playerVP,
        [playerId]:
          (state.publicState.playerVP[playerId] ?? 0) + order.rewardVP,
      },
    });
    if (order.rewardCoin > 0) {
      tx.addResources({ playerId, amounts: { coin: order.rewardCoin } });
    }
    // No turn advance: rule.md "may fulfil at any time on your turn".
    return accept(tx.state);
  },
});
