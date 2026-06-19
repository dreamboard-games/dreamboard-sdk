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

// ── Choose market action (multi-step routed choice) ───────────────────────
export const chooseMarketAction = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [pendingMarketRule],
  inputs: {
    choice: formInput.choice<MarketChoice, GameState>({
      choices: ({ state, playerId }) => {
        const stone =
          state.table.resources.entries.find(([pid]) => pid === playerId)?.[1]
            .stone ?? 0;
        const opts: Array<{
          value: MarketChoice;
          label: string;
          disabled?: boolean;
          disabledReason?: string;
        }> = [{ value: "gain-coin", label: "Gain 3 coin" }];
        opts.push({
          value: "sell-stone",
          label: "Sell 1 stone for 2 coin",
          disabled: stone < 1,
          disabledReason: stone < 1 ? "No stone to sell." : undefined,
        });
        return opts;
      },
      defaultValue: "gain-coin",
    }),
  },
  reduce({ state, input, accept, reject, fx }) {
    const playerId = input.playerId;
    if (state.phase.pendingMarketChoiceBy !== playerId) {
      return reject(
        "NO_PENDING_MARKET",
        "You don't have a pending market choice.",
      );
    }
    const choice = input.params.choice as MarketChoice;
    const tx = edit(state);
    if (choice === "gain-coin") {
      tx.addResources({ playerId, amounts: { coin: 3 } });
    } else {
      const stone =
        state.table.resources.entries.find(([pid]) => pid === playerId)?.[1]
          .stone ?? 0;
      if (stone < 1) {
        return reject(
          "NO_STONE_TO_SELL",
          "You have no stone to sell at the market.",
        );
      }
      tx.spendResources({ playerId, amounts: { stone: 1 } });
      tx.addResources({ playerId, amounts: { coin: 2 } });
    }

    const result = advanceAfterPlayerAction(
      state.publicState,
      state.phase.passedPlayerIds,
      {},
      playerId,
    );
    if (result.kind === "transition") {
      tx.patchPhaseState({
        pendingMarketChoiceBy: null,
        passedPlayerIds: result.finalPassed,
      });
      return accept(tx.state, { instructions: [fx.transition("cleanup")] });
    }
    tx.patchPhaseState({
      pendingMarketChoiceBy: null,
      activePlayerIndex: result.nextIndex,
      passedPlayerIds: result.finalPassed,
    });
    tx.setActivePlayers([result.nextPlayer]);
    return accept(tx.state);
  },
});
