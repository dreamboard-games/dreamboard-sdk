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

// ── Variable-pool routed interactions (T210) ──────────────────────────────

// Trade-post: the player commits 2 resources to give and 2 to receive.
// Like-for-like swaps are rejected (they'd be a no-op). Same-resource
// give/want pairs are merged into the totals so e.g. give:{wood:2} +
// want:{wood:1, stone:1} reduces to net give:{wood:1} want:{stone:1}
// — that variant is also rejected; the user must pick distinct resource
// sets.
export const chooseTradePostExchange = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [pendingTradeRule],
  inputs: {
    giveWood: formInput.number<GameState>({ min: 0, max: 2, defaultValue: 0 }),
    giveStone: formInput.number<GameState>({
      min: 0,
      max: 2,
      defaultValue: 0,
    }),
    giveCoin: formInput.number<GameState>({ min: 0, max: 2, defaultValue: 0 }),
    wantWood: formInput.number<GameState>({ min: 0, max: 2, defaultValue: 0 }),
    wantStone: formInput.number<GameState>({
      min: 0,
      max: 2,
      defaultValue: 0,
    }),
    wantCoin: formInput.number<GameState>({ min: 0, max: 2, defaultValue: 0 }),
  },
  reduce({ state, input, accept, reject, fx }) {
    const playerId = input.playerId;
    if (state.phase.pendingTradeChoiceBy !== playerId) {
      return reject(
        "NO_PENDING_TRADE",
        "You don't have a pending trade-post choice.",
      );
    }
    const giveAmounts = {
      wood: input.params.giveWood,
      stone: input.params.giveStone,
      coin: input.params.giveCoin,
    };
    const wantAmounts = {
      wood: input.params.wantWood,
      stone: input.params.wantStone,
      coin: input.params.wantCoin,
    };
    const giveTotal = giveAmounts.wood + giveAmounts.stone + giveAmounts.coin;
    const wantTotal = wantAmounts.wood + wantAmounts.stone + wantAmounts.coin;
    if (giveTotal !== 2 || wantTotal !== 2) {
      return reject(
        "TRADE_POST_TOTALS",
        "Give and want must each total exactly 2 resources.",
      );
    }
    // Like-for-like rejection: any resource appearing in both sides
    // is a no-op (or partial no-op) — disallow.
    for (const r of ["wood", "stone", "coin"] as const) {
      if (giveAmounts[r] > 0 && wantAmounts[r] > 0) {
        return reject(
          "TRADE_POST_LIKE_FOR_LIKE",
          "Trade-post forbids exchanging a resource for itself.",
        );
      }
    }

    const tx = edit(state);
    tx.spendResources({ playerId, amounts: giveAmounts });
    tx.addResources({ playerId, amounts: wantAmounts });

    const result = advanceAfterPlayerAction(
      state.publicState,
      state.phase.passedPlayerIds,
      {},
      playerId,
    );
    if (result.kind === "transition") {
      tx.patchPhaseState({
        pendingTradeChoiceBy: null,
        passedPlayerIds: result.finalPassed,
      });
      return accept(tx.state, { instructions: [fx.transition("cleanup")] });
    }
    tx.patchPhaseState({
      pendingTradeChoiceBy: null,
      activePlayerIndex: result.nextIndex,
      passedPlayerIds: result.finalPassed,
    });
    tx.setActivePlayers([result.nextPlayer]);
    return accept(tx.state);
  },
});

// Library: discard one of the 2 just-drawn apprentice cards. The card
// is moved from the player's apprentice-hand back to the discard.
export const chooseLibraryDiscard = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [pendingLibraryRule],
  inputs: {
    cardId: formInput.choice<CardId, GameState>({
      choices: ({ state, playerId }) => {
        const placement = state.phase.get("placement");
        const drawn = placement?.pendingLibraryDraw[playerId] ?? null;
        if (drawn == null) return [];
        return drawn.map((id) => ({ value: id as CardId, label: id }));
      },
      defaultValue: ({ choices }) => choices[0]?.value,
    }),
  },
  reduce({ state, input, accept, reject, fx }) {
    const playerId = input.playerId;
    const drawn = state.phase.pendingLibraryDraw[playerId] ?? null;
    if (drawn == null || drawn.length === 0) {
      return reject(
        "NO_PENDING_LIBRARY",
        "You don't have a pending library discard.",
      );
    }
    const cardId = input.params.cardId as CardId;
    if (!drawn.includes(cardId)) {
      return reject(
        "NOT_A_DRAWN_CARD",
        "Pick one of the two cards you just drew.",
      );
    }

    const tx = edit(state);
    tx.moveCardFromPlayerZoneToSharedZone({
      playerId,
      fromZoneId: "apprentice-hand",
      toZoneId: "apprentice-discard",
      cardId: cardId as ApprenticeCardsCardId,
    });
    tx.patchPhaseState({
      pendingLibraryDraw: {
        ...state.phase.pendingLibraryDraw,
        [playerId]: null,
      },
    });

    const result = advanceAfterPlayerAction(
      state.publicState,
      state.phase.passedPlayerIds,
      {},
      playerId,
    );
    if (result.kind === "transition") {
      tx.patchPhaseState({ passedPlayerIds: result.finalPassed });
      return accept(tx.state, { instructions: [fx.transition("cleanup")] });
    }
    tx.patchPhaseState({
      activePlayerIndex: result.nextIndex,
      passedPlayerIds: result.finalPassed,
    });
    tx.setActivePlayers([result.nextPlayer]);
    return accept(tx.state);
  },
});

// Apothecary: pure recall of one of the player's already-placed
// workers. The space is vacated; no resolver fires.
export const recallWorker = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [pendingApothecaryRule],
  inputs: {
    pieceId: formInput.choice<PieceId, GameState>({
      choices: ({ state, playerId }) => {
        const out: Array<{ value: PieceId; label: string }> = [];
        for (const [pieceId, location] of Object.entries(
          state.publicState.workerLocations,
        )) {
          if (location == null) continue;
          if (pieceTypeOfWorker(pieceId) == null) continue;
          if (!pieceId.includes(playerId === "player-1" ? "p1" : "p2")) {
            continue;
          }
          out.push({ value: pieceId as PieceId, label: pieceId });
        }
        return out;
      },
      defaultValue: ({ choices }) => choices[0]?.value,
    }),
  },
  reduce({ state, input, accept, reject, fx }) {
    const playerId = input.playerId;
    if (state.phase.pendingApothecaryChoiceBy !== playerId) {
      return reject(
        "NO_PENDING_APOTHECARY",
        "You don't have a pending apothecary recall.",
      );
    }
    const pieceId = input.params.pieceId as PieceId;
    const location = state.publicState.workerLocations[pieceId];
    if (location == null) {
      return reject("WORKER_NOT_PLACED", "That worker isn't on the board.");
    }
    const owner = pieceId.startsWith("master-")
      ? pieceId === "master-p1"
        ? "player-1"
        : "player-2"
      : pieceId.startsWith("apprentice-p1-")
        ? "player-1"
        : pieceId.startsWith("apprentice-p2-")
          ? "player-2"
          : null;
    if (owner !== playerId) {
      return reject("NOT_YOUR_WORKER", "You can only recall your own workers.");
    }

    const tx = edit(state);
    tx.moveComponentToDetached({ componentId: pieceId });
    tx.patchPublicState({
      workerLocations: {
        ...state.publicState.workerLocations,
        [pieceId]: null,
      },
    });

    const result = advanceAfterPlayerAction(
      state.publicState,
      state.phase.passedPlayerIds,
      {
        workerLocations: {
          ...state.publicState.workerLocations,
          [pieceId]: null,
        },
      },
      playerId,
    );
    if (result.kind === "transition") {
      tx.patchPhaseState({
        pendingApothecaryChoiceBy: null,
        passedPlayerIds: result.finalPassed,
      });
      return accept(tx.state, { instructions: [fx.transition("cleanup")] });
    }
    tx.patchPhaseState({
      pendingApothecaryChoiceBy: null,
      activePlayerIndex: result.nextIndex,
      passedPlayerIds: result.finalPassed,
    });
    tx.setActivePlayers([result.nextPlayer]);
    return accept(tx.state);
  },
});
