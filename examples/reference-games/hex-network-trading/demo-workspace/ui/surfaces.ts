import { Board, Interaction, UI, Zone } from "#dreamboard/ui-contract";

export const useFrontierSurfaces = UI.defineSurfaces({
  frontierBoard: Board.surface("frontier"),
  charterHand: Zone.hand("charter-hand", {
    role: "auxiliary",
    label: "Charter cards",
  }),
  discardCardsForm: Interaction.form("playerTurn.discardCards"),
  moveStormForm: Interaction.form("playerTurn.moveStorm"),
  tradeWithBankForm: Interaction.form("playerTurn.tradeWithBank"),
  offerTradeForm: Interaction.form("playerTurn.offerTrade"),
  respondToTradeForm: Interaction.form("playerTurn.respondToTrade"),
  confirmTradeForm: Interaction.form("playerTurn.confirmTrade"),
  playScoutForm: Interaction.form("playerTurn.playScout"),
  playSurveyGrantForm: Interaction.form("playerTurn.playSurveyGrant"),
  playClaimMarkerForm: Interaction.form("playerTurn.playClaimMarker"),
});

export type FrontierSurfaces = ReturnType<typeof useFrontierSurfaces>;
