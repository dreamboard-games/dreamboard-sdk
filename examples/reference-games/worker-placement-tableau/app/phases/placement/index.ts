import { definePhase } from "@dreamboard-games/sdk/reducer";
import {
  placementPhaseStateSchema,
  type GameContract,
} from "../../game-contract";
import { playApprenticeCard } from "./apprentices";
import { craftAtWorkshop } from "./crafting";
import { chooseMarketAction } from "./market";
import { fulfillOrder } from "./orders";
import { passPlacement } from "./pass-submit";
import { reassign } from "./reassign";
import {
  initialPlacementState,
  placementActor,
  resetPlacementState,
} from "./state";
import {
  chooseLibraryDiscard,
  chooseTradePostExchange,
  recallWorker,
} from "./variable-choices";
import { placeWorker } from "./worker-placement";

export const placement = definePhase<GameContract>()({
  kind: "player",
  state: placementPhaseStateSchema,
  initialState: initialPlacementState,
  actor: placementActor,
  enter({ state, accept }) {
    return accept(
      resetPlacementState(state as Parameters<typeof resetPlacementState>[0]),
    );
  },
  interactions: {
    placeWorker,
    craftAtWorkshop,
    fulfillOrder,
    chooseMarketAction,
    chooseTradePostExchange,
    chooseLibraryDiscard,
    recallWorker,
    playApprenticeCard,
    reassign,
    passPlacement,
  },
});
