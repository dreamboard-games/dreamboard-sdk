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

// ── Craft at workshop (multi-step routed choice) ──────────────────────────
export const craftAtWorkshop = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [hasCraftOptionRule],
  inputs: defineInputs((input) => {
    const itemId = input.add(
      "itemId",
      formInput.choice<ItemId, GameState>({
        choices: () =>
          ITEM_IDS.map((id) => ({ value: id, label: ITEMS[id].name })),
        defaultValue: () => undefined,
      }),
    );
    return {
      itemId,
      cell: input.add(
        "cell",
        boardInput.playerSpace<GameState, "workshop-mat", SpaceId, PlayerId>({
          target: craftCellTarget,
          dependsOn: [itemId],
        }),
      ),
    };
  }),
  reduce({ state, input, accept, reject, fx }) {
    const playerId = input.playerId;
    const isPendingCraftWorker = state.phase.pendingCraftBy === playerId;
    const isInspirationCraft = state.phase.inspirationActiveBy === playerId;
    const isForgeCraft = state.phase.forgeActiveBy === playerId;
    if (!isPendingCraftWorker && !isInspirationCraft && !isForgeCraft) {
      return reject(
        "NO_PENDING_CRAFT",
        "You don't have a pending workshop craft.",
      );
    }

    const cellTarget = input.params.cell as PlayerBoardSpaceTarget<
      "workshop-mat",
      SpaceId,
      PlayerId
    >;
    const cellSpaceId = cellTarget.spaceId;
    const itemId = input.params.itemId;

    // Inspiration grants a 1-wood discount; Forge grants a 1-stone
    // discount. They stack (combined wood-1 stone-1) when both flags
    // happen to be set on the same player at once — but the runtime
    // never sets both because each card play rejects when its
    // counterpart is already active for the player.
    const woodDiscount = isInspirationCraft ? 1 : 0;
    const stoneDiscount = isForgeCraft ? 1 : 0;
    const decision = craftAtWorkshopEligibility(
      state,
      playerId,
      cellSpaceId,
      itemId,
      { woodDiscount, stoneDiscount },
    );
    if (!decision.ok) {
      return reject(decision.errorCode, decision.message);
    }

    const cost = effectiveItemCost(itemId, {
      woodDiscount,
      stoneDiscount,
    }) as Partial<Record<ResourceId, number>>;
    const playerMat = state.publicState.matOccupancyByPlayer[playerId] ?? {};

    const tx = edit(state);
    // Spend may be { wood: 0 } / { stone: 0 }; spendResources accepts
    // a zero-amount as a no-op.
    tx.spendResources({ playerId, amounts: cost });
    tx.patchPublicState({
      matOccupancyByPlayer: {
        ...state.publicState.matOccupancyByPlayer,
        [playerId]: {
          ...playerMat,
          [cellSpaceId]: itemId,
        },
      },
    });

    // Inspiration craft does NOT consume a turn — Inspiration is a
    // card play; the player still owes a placement. Forge craft DOES
    // consume the turn — Forge is a placement-driven barrier (the
    // worker that landed on `forge` is the placement-action of the
    // turn; the craft just resolves it).
    const noTurnAdvanceCraft = isInspirationCraft && !isPendingCraftWorker;
    if (noTurnAdvanceCraft) {
      tx.patchPhaseState({ inspirationActiveBy: null });
      return accept(tx.state);
    }

    // Worker-driven craft: clear pendingCraftBy plus any inspiration /
    // forge flag, then advance turn flow.
    const result = advanceAfterPlayerAction(
      state.publicState,
      state.phase.passedPlayerIds,
      {},
      playerId,
    );
    if (result.kind === "transition") {
      tx.patchPhaseState({
        pendingCraftBy: null,
        inspirationActiveBy: null,
        forgeActiveBy: null,
        passedPlayerIds: result.finalPassed,
      });
      return accept(tx.state, [fx.transition("cleanup")]);
    }
    tx.patchPhaseState({
      pendingCraftBy: null,
      inspirationActiveBy: null,
      forgeActiveBy: null,
      activePlayerIndex: result.nextIndex,
      passedPlayerIds: result.finalPassed,
    });
    tx.setActivePlayers([result.nextPlayer]);
    return accept(tx.state);
  },
});
