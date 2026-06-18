import { Board, Interaction, UI, Zone } from "#dreamboard/ui-contract";

export const useArtisansSurfaces = UI.defineSurfaces({
  actionBoard: Board.surface("action-board"),
  wakeupTrack: Board.surface("wake-up-track"),
  workshopMat: Board.surface("workshop-mat"),
  orderHand: Zone.hand("order-hand", {
    role: "primary",
    label: "Orders",
  }),
  apprenticeHand: Zone.hand("apprentice-hand", {
    role: "auxiliary",
    label: "Apprentices",
  }),
  placeWorkerForm: Interaction.form("placement.placeWorker"),
  craftAtWorkshopForm: Interaction.form("placement.craftAtWorkshop"),
  chooseMarketActionForm: Interaction.form("placement.chooseMarketAction"),
  chooseTradePostExchangeForm: Interaction.form(
    "placement.chooseTradePostExchange",
  ),
  chooseLibraryDiscardForm: Interaction.form("placement.chooseLibraryDiscard"),
  recallWorkerForm: Interaction.form("placement.recallWorker"),
  reassignForm: Interaction.form("placement.reassign"),
});

export type ArtisansSurfaces = ReturnType<typeof useArtisansSurfaces>;
