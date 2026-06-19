import { playerTurn } from "../../authoring";
import { coloniesByVertexId, COST_CHARTER_CARD } from "../../reducer-support";
import { computeBankTradeRates, portsByVertex } from "../../derived";
import { literals } from "../../../shared/manifest-contract";

const rule = playerTurn.rule;

export const diceRolledRule = rule({
  id: "dice-rolled",
  errorCode: "MUST_ROLL_FIRST",
  message: "Roll dice first.",
  available: ({ state }) => state.phase.diceRolled,
  validate: ({ state }) => (state.phase.diceRolled ? true : "Roll dice first."),
});

export const noStormPendingRule = rule({
  id: "no-storm-pending",
  errorCode: "STORM_PENDING",
  message: "Resolve the storm first.",
  available: ({ state }) => !state.phase.stormPending,
  validate: ({ state }) =>
    state.phase.stormPending ? "Resolve the storm first." : true,
});

export const noPendingTradeRule = rule({
  id: "no-pending-trade",
  errorCode: "TRADE_ALREADY_PENDING",
  message: "A trade is already pending.",
  available: ({ state }) => !state.phase.pendingTrade,
  validate: ({ state }) =>
    state.phase.pendingTrade ? "A trade is already pending." : true,
});

export const canBuyCharterCardRule = rule({
  id: "can-buy-charter-card",
  errorCode: "INSUFFICIENT_RESOURCES",
  message: "Need 1 grain + 1 cloth + 1 iron.",
  available: ({ input, q }) =>
    q.player.canAfford(input.playerId, COST_CHARTER_CARD),
  validate: ({ input, q }) =>
    q.player.canAfford(input.playerId, COST_CHARTER_CARD)
      ? true
      : "Need 1 grain + 1 cloth + 1 iron.",
});

export const charterDeckNotEmptyRule = rule({
  id: "charter-deck-not-empty",
  errorCode: "DECK_EMPTY",
  message: "Charter card deck is empty.",
  available: ({ q }) => q.zone.sharedCards("charter-deck").length > 0,
  validate: ({ q }) =>
    q.zone.sharedCards("charter-deck").length > 0
      ? true
      : "Charter card deck is empty.",
});

export const canTradeWithBankRule = rule({
  id: "can-trade-with-bank",
  errorCode: "INSUFFICIENT_RESOURCES",
  message: "No affordable bank trade is available.",
  available: ({ state, input, q, derived }) => {
    const rates = computeBankTradeRates(
      coloniesByVertexId(state, q),
      derived(portsByVertex),
      input.playerId,
    );
    return literals.resourceIds.some(
      (resourceId) =>
        q.player.resource(input.playerId, resourceId) >= rates[resourceId],
    );
  },
  validate: ({ state, input, q, derived }) => {
    const rates = computeBankTradeRates(
      coloniesByVertexId(state, q),
      derived(portsByVertex),
      input.playerId,
    );
    return literals.resourceIds.some(
      (resourceId) =>
        q.player.resource(input.playerId, resourceId) >= rates[resourceId],
    )
      ? true
      : "No affordable bank trade is available.";
  },
});
