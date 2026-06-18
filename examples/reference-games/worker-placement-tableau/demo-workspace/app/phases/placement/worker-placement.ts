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

// ── Place a worker ────────────────────────────────────────────────────────
export const placeWorker = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [noPendingChoiceRule, hasPlaceableWorkerRule],
  inputs: defineInputs((input) => {
    const spaceId = input.add(
      "spaceId",
      boardInput.space<GameState, SpaceId>({
        target: placementSpaceTarget,
      }),
    );
    const componentId = input.add(
      "componentId",
      formInput.choice<PieceId, GameState, readonly [typeof spaceId]>({
        dependsOn: [spaceId],
        choices: ({ state, playerId, values }) => {
          const placement = state.phase.get("placement");
          const extraApprentices = placement?.spareHandsActiveBy.includes(
            playerId,
          )
            ? 1
            : 0;
          const detached = detachedWorkerIds(state, playerId, {
            extraApprentices,
          });
          return detached
            .filter(
              (pieceId) =>
                evaluatePlacement(state, playerId, pieceId, values.spaceId, {
                  extraApprentices,
                }).ok,
            )
            .map((pieceId) => ({
              value: pieceId,
              label: pieceId,
            }));
        },
        defaultValue: ({ choices }) => choices[0]?.value,
      }),
    );
    return {
      spaceId,
      componentId,
    };
  }),
  reduce({ state, input, accept, reject, fx, q }) {
    // Disallow placement while a barrier is pending.
    if (anyBarrierActive(state.phase)) {
      return reject(
        "PENDING_CHOICE_REQUIRED",
        "Resolve the pending choice first.",
      );
    }

    const componentId = input.params.componentId;
    const spaceId = input.params.spaceId;
    const playerId = input.playerId;
    const spareHandsActive = state.phase.spareHandsActiveBy.includes(playerId);
    const extraApprentices = spareHandsActive ? 1 : 0;

    // Tireless Master: at the start of this player's placement turn, if
    // their master is parked from a previous Tireless Master placement,
    // vacate it. The recall is automatic and lets the player use this
    // turn's action to re-place the master.
    const tx = edit(state);
    const recallSpace =
      state.phase.tirelessMasterPendingRecall[playerId] ?? null;
    if (recallSpace != null) {
      const masterId = playerId === "player-1" ? "master-p1" : "master-p2";
      if (state.publicState.workerLocations[masterId] === recallSpace) {
        tx.moveComponentToDetached({ componentId: masterId });
        tx.patchPublicState({
          workerLocations: {
            ...state.publicState.workerLocations,
            [masterId]: null,
          },
        });
        tx.patchPhaseState({
          tirelessMasterPendingRecall: {
            ...state.phase.tirelessMasterPendingRecall,
            [playerId]: null,
          },
        });
      } else {
        // Master was already moved (e.g. via Reassign) — just clear the
        // bookkeeping so it doesn't dangle.
        tx.patchPhaseState({
          tirelessMasterPendingRecall: {
            ...state.phase.tirelessMasterPendingRecall,
            [playerId]: null,
          },
        });
      }
    }

    const workingState = tx.state;
    const decision = evaluatePlacement(
      workingState,
      playerId,
      componentId,
      spaceId,
      { extraApprentices },
    );
    if (!decision.ok) {
      return reject(decision.errorCode, decision.message);
    }
    if (!ACTION_BOARD_SPACE_IDS.has(spaceId)) {
      return reject(
        "SPACE_NOT_ON_ACTION_BOARD",
        "Workers can only be placed on the action board.",
      );
    }
    const actionBoardSpaceId = spaceId as ActionBoardSpaceId;

    tx.moveComponentToSpace({
      componentId,
      boardId: "action-board",
      spaceId: actionBoardSpaceId,
    });
    const workerLocationsAfterPlacement = {
      ...workingState.publicState.workerLocations,
      [componentId]: spaceId,
    };
    tx.patchPublicState({
      workerLocations: {
        ...workerLocationsAfterPlacement,
      },
    });

    const actionId = fixedActionFromSpaceId(spaceId);

    // ── Persistent-card onPlaceWorker hooks ────────────────────────────
    //
    // Iterate the active player's tableau in PERSISTENT_HOOK_ORDER so
    // multi-card fires are deterministic. Each hook returns plain
    // effect descriptors which we map into typed transaction calls
    // here. We also collect a Tireless-Master pending-recall update so
    // the schema stays consistent.
    const persistent = persistentCardsFor(workingState, playerId);
    const orderedPersistent = PERSISTENT_HOOK_ORDER.filter((id) =>
      persistent.includes(id),
    );
    let nextTirelessRecall = workingState.phase.tirelessMasterPendingRecall;
    const placementPieceType = pieceTypeOfWorker(componentId);
    for (const cardId of orderedPersistent) {
      const hook = PERSISTENT_HOOKS[cardId].onPlaceWorker;
      if (!hook) continue;
      const effects = hook({
        playerId,
        spaceId,
        actionId,
        pieceTypeId: placementPieceType,
      });
      for (const effect of effects) {
        if (effect.kind === "addResources") {
          tx.addResources({ playerId, amounts: effect.amounts });
        } else if (effect.kind === "drawApprenticeCard") {
          tx.dealCardsToPlayerZone({
            fromZoneId: "apprentice-deck",
            playerId,
            toZoneId: "apprentice-hand",
            count: 1,
          });
        } else if (effect.kind === "trackTirelessMaster") {
          nextTirelessRecall = {
            ...nextTirelessRecall,
            [playerId]: effect.spaceId,
          };
        }
      }
    }
    if (nextTirelessRecall !== workingState.phase.tirelessMasterPendingRecall) {
      tx.patchPhaseState({
        tirelessMasterPendingRecall: nextTirelessRecall,
      });
    }

    // Multi-step actions raise a barrier and return early; turn does
    // not advance until the routed choice resolves.
    if (spaceId === "workshop") {
      tx.patchPhaseState({ pendingCraftBy: playerId });
      return accept(tx.state);
    }
    if (spaceId === "market") {
      tx.patchPhaseState({ pendingMarketChoiceBy: playerId });
      return accept(tx.state);
    }
    // Variable-pool barrier raisers (T210). Each parks the turn until
    // the routed interaction resolves.
    if (spaceId === "trade-post") {
      tx.patchPhaseState({ pendingTradeChoiceBy: playerId });
      return accept(tx.state);
    }
    if (spaceId === "forge") {
      tx.patchPhaseState({ forgeActiveBy: playerId });
      return accept(tx.state);
    }
    if (spaceId === "library") {
      // Read the top 2 apprentice-deck cards. These will be dealt to
      // hand, and `pendingLibraryDraw` records which 2 the player owes
      // a discard choice on.
      const deck = q.zone.sharedCards("apprentice-deck");
      const drawn = deck.slice(0, 2);
      if (drawn.length < 2) {
        return reject(
          "DECK_TOO_SHALLOW",
          "Not enough apprentice cards to draw two.",
        );
      }
      tx.dealCardsToPlayerZone({
        fromZoneId: "apprentice-deck",
        playerId,
        toZoneId: "apprentice-hand",
        count: 2,
      });
      tx.patchPhaseState({
        pendingLibraryDraw: {
          ...workingState.phase.pendingLibraryDraw,
          [playerId]: drawn,
        },
      });
      return accept(tx.state);
    }
    if (spaceId === "apothecary") {
      tx.patchPhaseState({ pendingApothecaryChoiceBy: playerId });
      return accept(tx.state);
    }

    // Single-step resolvers.
    switch (actionId) {
      case "lumberyard":
        tx.addResources({ playerId, amounts: { wood: 2 } });
        break;
      case "quarry":
        tx.addResources({ playerId, amounts: { stone: 1 } });
        break;
      case "guild-hall":
        tx.dealCardsToPlayerZone({
          fromZoneId: "order-deck",
          playerId,
          toZoneId: "order-hand",
          count: 1,
        });
        tx.dealCardsToPlayerZone({
          fromZoneId: "apprentice-deck",
          playerId,
          toZoneId: "apprentice-hand",
          count: 1,
        });
        break;
      case "training-hall":
        tx.spendResources({
          playerId,
          amounts: { coin: TRAINING_HALL_COIN_COST },
        });
        tx.patchPublicState({
          pendingApprenticeBuysByPlayer: {
            ...workingState.publicState.pendingApprenticeBuysByPlayer,
            [playerId]:
              (workingState.publicState.pendingApprenticeBuysByPlayer[
                playerId
              ] ?? 0) + 1,
          },
        });
        break;
      default:
        // Variable-pool single-step resolvers (T210).
        if (spaceId === "masons-lodge") {
          tx.addResources({ playerId, amounts: { wood: 1, stone: 1 } });
        } else if (spaceId === "patrons-estate") {
          tx.addResources({ playerId, amounts: { coin: 2 } });
          tx.dealCardsToPlayerZone({
            fromZoneId: "order-deck",
            playerId,
            toZoneId: "order-hand",
            count: 1,
          });
        }
        break;
    }

    const result = advanceAfterPlayerAction(
      workingState.publicState,
      workingState.phase.passedPlayerIds,
      {
        workerLocations: workerLocationsAfterPlacement,
      },
      playerId,
    );
    // Consume the spare-hands flag now that an apprentice landed on the
    // board. (For a master placement the flag stays set — Spare Hands
    // can't be used by master.)
    const isApprenticePlacement =
      pieceTypeOfWorker(componentId) === "apprentice";
    const nextSpareHandsActiveBy =
      spareHandsActive && isApprenticePlacement
        ? workingState.phase.spareHandsActiveBy.filter(
            (pid) => pid !== playerId,
          )
        : workingState.phase.spareHandsActiveBy;

    if (result.kind === "transition") {
      tx.patchPhaseState({
        passedPlayerIds: result.finalPassed,
        spareHandsActiveBy: nextSpareHandsActiveBy,
      });
      return accept(tx.state, [fx.transition("cleanup")]);
    }
    tx.patchPhaseState({
      activePlayerIndex: result.nextIndex,
      passedPlayerIds: result.finalPassed,
      spareHandsActiveBy: nextSpareHandsActiveBy,
    });
    tx.setActivePlayers([result.nextPlayer]);
    return accept(tx.state);
  },
});
