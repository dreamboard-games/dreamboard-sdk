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

// ── Play a one-shot apprentice card ──────────────────────────────────────
//
// Each card resolves a small dispatch: resource grants discard
// immediately and end the interaction; Spare Hands / Inspiration /
// Reassign instead set phase flags or perform a recall+place. None of
// the one-shots advance the turn — same player resumes their placement
// turn, same as `fulfillOrder`.
export const playApprenticeCard = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [noPendingChoiceRule, hasPlayableApprenticeRule],
  inputs: {
    cardId: cardInput<GameState, CardId, readonly ["apprentice-hand"]>({
      target: playableApprenticeTarget,
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
    const hand = q.zone.playerCards(playerId, "apprentice-hand");
    if (!(hand as readonly string[]).includes(cardId)) {
      return reject(
        "APPRENTICE_NOT_IN_HAND",
        "You do not hold that apprentice card.",
      );
    }

    // Persistent cards branch off here: move to the player's tableau
    // (NOT discard) and append to publicState.playedPersistentApprentices.
    // Effects are dispatched lazily by `placeWorker`'s onPlaceWorker
    // hook + cleanup's onSeasonEnd hook — nothing to do at play time
    // beyond bookkeeping.
    if (isPersistentApprenticeId(cardId)) {
      const tableau =
        state.publicState.playedPersistentApprentices[playerId] ?? [];
      if (tableau.includes(cardId)) {
        return reject(
          "PERSISTENT_ALREADY_IN_TABLEAU",
          "You have already played that persistent card.",
        );
      }
      const tx = edit(state);
      tx.moveCardBetweenPlayerZones({
        playerId,
        fromZoneId: "apprentice-hand",
        toZoneId: "apprentice-tableau",
        cardId,
      });
      tx.patchPublicState({
        playedPersistentApprentices: {
          ...state.publicState.playedPersistentApprentices,
          [playerId]: [...tableau, cardId],
        },
      });
      return accept(tx.state);
    }

    if (!isOneShotApprenticeId(cardId)) {
      return reject(
        "NOT_A_PLAYABLE_APPRENTICE_CARD",
        "That card has no play resolution.",
      );
    }

    const tx = edit(state);
    const discardOneShot = () =>
      tx.moveCardFromPlayerZoneToSharedZone({
        playerId,
        fromZoneId: "apprentice-hand",
        toZoneId: "apprentice-discard",
        cardId,
      });

    switch (cardId) {
      case "quick-delivery":
        discardOneShot();
        tx.addResources({ playerId, amounts: { coin: 3 } });
        return accept(tx.state);
      case "lumber-stash":
        discardOneShot();
        tx.addResources({ playerId, amounts: { wood: 3 } });
        return accept(tx.state);
      case "stone-cache":
        discardOneShot();
        tx.addResources({ playerId, amounts: { stone: 2 } });
        return accept(tx.state);
      case "spare-hands": {
        if (state.phase.spareHandsActiveBy.includes(playerId)) {
          return reject(
            "SPARE_HANDS_ALREADY_ACTIVE",
            "Spare Hands is already active this season.",
          );
        }
        discardOneShot();
        tx.patchPhaseState({
          spareHandsActiveBy: [...state.phase.spareHandsActiveBy, playerId],
        });
        return accept(tx.state);
      }
      case "inspiration": {
        if (state.phase.inspirationActiveBy === playerId) {
          return reject(
            "INSPIRATION_ALREADY_ACTIVE",
            "Inspiration is already pending; resolve it first.",
          );
        }
        if (state.phase.inspirationActiveBy != null) {
          return reject(
            "INSPIRATION_ALREADY_ACTIVE",
            "Another player is already mid-Inspiration.",
          );
        }
        discardOneShot();
        tx.patchPhaseState({ inspirationActiveBy: playerId });
        return accept(tx.state);
      }
      case "reassign":
        // Reassign needs from-/to-space inputs that this card-play
        // surface doesn't carry. The player triggers the dedicated
        // `reassign` interaction directly; there is no "pending-reassign"
        // barrier — eligibility checks the card is still in hand. We
        // refuse to discard here and direct callers to `reassign`.
        return reject(
          "USE_REASSIGN_INTERACTION",
          "Submit `reassign` with the worker and destination space.",
        );
      default: {
        const _exhaustive: never = cardId;
        void _exhaustive;
        return reject("UNHANDLED_APPRENTICE_CARD", "Unknown apprentice card.");
      }
    }
  },
});
