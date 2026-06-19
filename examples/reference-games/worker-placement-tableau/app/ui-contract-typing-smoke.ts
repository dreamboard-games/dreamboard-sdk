import { Board, Interaction } from "../shared/generated/ui-contract.ts";

if (false) {
  const actionBoard = Board.useSurface("actionBoard", {
    board: "action-board",
  });
  const workshopMat = Board.useSurface("workshopMat", {
    board: "workshop-mat",
  });
  const wakeupTrack = Board.useSurface("wakeupTrack", {
    board: "wake-up-track",
  });
  // @ts-expect-error board surfaces must reference reducer-authored board base ids.
  Board.useSurface("missingBoard", { board: "missing-board" });
  // @ts-expect-error action-board surfaces only accept action-board spaces.
  actionBoard.Space({ value: "wake-up-1" });
  // @ts-expect-error interaction keys must come from the reducer contract.
  Interaction.useForm("placement.placeXXX");
  const placeWorkerForm = Interaction.useForm("placement.placeWorker");
  const craftAtWorkshopForm = Interaction.useForm("placement.craftAtWorkshop");
  // @ts-expect-error board inputs are not exposed on form slots.
  placeWorkerForm.slot.spaceId;

  Interaction.Routes({
    // @ts-expect-error generated Interaction.Routes requires every interaction collector route.
    routes: {
      "wakeup.selectWakeUpSlot": {
        collect: { spaceId: wakeupTrack.slot.space },
      },
      "placement.placeWorker": {
        collect: {
          componentId: placeWorkerForm.slot.componentId,
          spaceId: actionBoard.slot.space,
        },
      },
      "placement.craftAtWorkshop": {
        collect: {
          itemId: craftAtWorkshopForm.slot.itemId,
          cell: workshopMat.slot.playerSpace,
        },
      },
    },
  });
}
