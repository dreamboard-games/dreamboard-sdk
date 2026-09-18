import { appendHistory, systemEvent } from "../reducer-support";
import { stormtrail } from "../game-model";

const pendingTrade = stormtrail.phase("pendingTrade");

const acceptTrade = pendingTrade.interaction({
  to: ({ state }) => state.publicState.currentTrade?.targetPlayerId,
  visibility: "actorsOnly",
  inputs: {},
  rules: [
    {
      id: "target-can-pay",
      errorCode: "TRADE_TARGET_CANNOT_PAY",
      available: ({ state, q }) => {
        const trade = state.publicState.currentTrade;
        return !!trade && q.player.canAfford(trade.targetPlayerId, trade.want);
      },
      validate: ({ state, q }) => {
        const trade = state.publicState.currentTrade;
        return trade && q.player.canAfford(trade.targetPlayerId, trade.want)
          ? null
          : { errorCode: "TRADE_TARGET_CANNOT_PAY" };
      },
    },
    {
      id: "offeror-still-can-pay",
      errorCode: "TRADE_OFFER_STALE",
      validate: ({ state, q }) => {
        const trade = state.publicState.currentTrade;
        return trade && q.player.canAfford(trade.offerorPlayerId, trade.give)
          ? null
          : { errorCode: "TRADE_OFFER_STALE" };
      },
    },
  ],
  reduce({ state, tx }) {
    const trade = state.publicState.currentTrade;
    if (!trade) throw new Error("Trade response requires a pending offer.");
    tx.transferResources({
      fromPlayerId: trade.offerorPlayerId,
      toPlayerId: trade.targetPlayerId,
      amounts: trade.give,
    });
    tx.transferResources({
      fromPlayerId: trade.targetPlayerId,
      toPlayerId: trade.offerorPlayerId,
      amounts: trade.want,
    });
    tx.patchPublicState((publicState) => ({
      ...publicState,
      currentTrade: null,
      tradeHistory: [
        ...publicState.tradeHistory,
        { ...trade, result: "accepted" },
      ],
    }));
    tx.setActivePlayers([trade.offerorPlayerId]);
    appendHistory(tx, {
      kind: "tradeAccepted",
      actorPlayerId: trade.targetPlayerId,
      summary: `${trade.targetPlayerId} accepted ${trade.offerorPlayerId}'s trade.`,
    });
    tx.emit(
      systemEvent({
        procedureId: "stormtrail-trade",
        title: "Trade accepted",
        summary: `${trade.offerorPlayerId} and ${trade.targetPlayerId} exchanged supplies.`,
      }),
    );
    return tx.transition("main");
  },
});

const rejectTrade = pendingTrade.interaction({
  to: ({ state }) => state.publicState.currentTrade?.targetPlayerId,
  visibility: "actorsOnly",
  inputs: {},
  reduce({ state, tx }) {
    const trade = state.publicState.currentTrade;
    if (!trade) throw new Error("Trade response requires a pending offer.");
    tx.patchPublicState((publicState) => ({
      ...publicState,
      currentTrade: null,
      tradeHistory: [
        ...publicState.tradeHistory,
        { ...trade, result: "rejected" },
      ],
    }));
    tx.setActivePlayers([trade.offerorPlayerId]);
    appendHistory(tx, {
      kind: "tradeRejected",
      actorPlayerId: trade.targetPlayerId,
      summary: `${trade.targetPlayerId} rejected ${trade.offerorPlayerId}'s trade.`,
    });
    tx.emit(
      systemEvent({
        procedureId: "stormtrail-trade",
        title: "Trade rejected",
        summary: `${trade.targetPlayerId} declined the offer.`,
      }),
    );
    return tx.transition("main");
  },
});

export default pendingTrade.define({
  kind: "player",
  initialState: () => ({}),
  enter({ state, tx }) {
    const offerorPlayerId = state.publicState.currentTrade?.offerorPlayerId;
    if (!offerorPlayerId) throw new Error("Pending trade phase has no offer.");
    tx.setActivePlayers([offerorPlayerId]);
  },
  interactions: { acceptTrade, rejectTrade },
});
