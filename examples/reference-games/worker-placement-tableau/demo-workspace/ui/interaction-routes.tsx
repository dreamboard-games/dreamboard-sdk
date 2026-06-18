import { Interaction, type InteractionRoutes } from "#dreamboard/ui-contract";
import type { WorkspaceInteractionFormDialogProps } from "@dreamboard-games/sdk/runtime/workspace-contract";
import type { ReactNode } from "react";
import { ACTION_BUTTON_CLASS, ACTION_SPACE_LABEL } from "./styles";
import type { ArtisansSurfaces } from "./types";

function ActionPanel({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 rounded-lg border-2 border-[#2d2d2d] bg-[#fdfbf7] p-2">
      <div>
        <div className="text-sm font-bold">{title}</div>
        {detail ? (
          <div className="text-[11px] text-slate-500">{detail}</div>
        ) : null}
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function ActionDialog({
  DialogSurface,
  title,
  detail,
  trigger,
  defaultOpen = false,
  children,
}: {
  DialogSurface: (props: WorkspaceInteractionFormDialogProps) => ReactNode;
  title: string;
  detail?: string;
  trigger: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <DialogSurface
      defaultOpen={defaultOpen}
      title={title}
      description={detail}
      trigger={trigger}
      contentClassName="rounded-2xl border border-[#2d2d2d]/20 bg-[#fdfbf7] p-4 shadow-[0_24px_60px_-12px_rgba(45,45,45,0.28),0_8px_20px_-8px_rgba(45,45,45,0.18)] sm:max-w-md"
    >
      <div className="grid gap-3 pt-2">{children}</div>
    </DialogSurface>
  );
}

export function ArtisansInteractionRoutes({
  actionBoard,
  wakeupTrack,
  workshopMat,
  orderHand,
  apprenticeHand,
  placeWorkerForm,
  craftAtWorkshopForm,
  chooseMarketActionForm,
  chooseTradePostExchangeForm,
  chooseLibraryDiscardForm,
  recallWorkerForm,
  reassignForm,
}: ArtisansSurfaces) {
  const setupForm = Interaction.useForm("setup.submit");
  const wakeupSubmitForm = Interaction.useForm("wakeup.submit");
  const placementSubmitForm = Interaction.useForm("placement.submit");
  const passPlacementForm = Interaction.useForm("placement.passPlacement");
  const cleanupForm = Interaction.useForm("cleanup.submit");
  const scoringForm = Interaction.useForm("scoring.submit");
  const gameOverForm = Interaction.useForm("gameOver.submit");

  const routes = {
    "setup.submit": {
      collect: {},
    },
    "wakeup.selectWakeUpSlot": {
      collect: {
        spaceId: wakeupTrack.slot.space,
      },
    },
    "wakeup.submit": {
      collect: {},
    },
    "placement.submit": {
      collect: {},
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
    "placement.fulfillOrder": {
      collect: {
        cardId: orderHand.slot.card,
      },
    },
    "placement.chooseMarketAction": {
      collect: {
        choice: chooseMarketActionForm.slot.choice,
      },
    },
    "placement.chooseTradePostExchange": {
      collect: {
        giveWood: chooseTradePostExchangeForm.slot.giveWood,
        giveStone: chooseTradePostExchangeForm.slot.giveStone,
        giveCoin: chooseTradePostExchangeForm.slot.giveCoin,
        wantWood: chooseTradePostExchangeForm.slot.wantWood,
        wantStone: chooseTradePostExchangeForm.slot.wantStone,
        wantCoin: chooseTradePostExchangeForm.slot.wantCoin,
      },
    },
    "placement.chooseLibraryDiscard": {
      collect: {
        cardId: chooseLibraryDiscardForm.slot.cardId,
      },
    },
    "placement.playApprenticeCard": {
      collect: {
        cardId: apprenticeHand.slot.card,
      },
    },
    "placement.recallWorker": {
      collect: {
        pieceId: recallWorkerForm.slot.pieceId,
      },
    },
    "placement.reassign": {
      collect: {
        cardId: apprenticeHand.slot.card,
        pieceId: reassignForm.slot.pieceId,
        toSpaceId: actionBoard.slot.space,
      },
    },
    "placement.passPlacement": {
      collect: {},
    },
    "cleanup.submit": {
      collect: {},
    },
    "scoring.submit": {
      collect: {},
    },
    "gameOver.submit": {
      collect: {},
    },
  } satisfies InteractionRoutes;

  return (
    <>
      <Interaction.Routes routes={routes} />
      <setupForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <setupForm.Submit className={ACTION_BUTTON_CLASS}>
              Start
            </setupForm.Submit>
          ) : null
        }
      </setupForm.State>
      <wakeupSubmitForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <wakeupSubmitForm.Submit className={ACTION_BUTTON_CLASS}>
              Continue
            </wakeupSubmitForm.Submit>
          ) : null
        }
      </wakeupSubmitForm.State>
      <placementSubmitForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <placementSubmitForm.Submit className={ACTION_BUTTON_CLASS}>
              Continue
            </placementSubmitForm.Submit>
          ) : null
        }
      </placementSubmitForm.State>
      <reassignForm.State unavailable={null}>
        {(reassignState) => {
          const reassignActive =
            reassignState.available &&
            (reassignState.handle.isArmed ||
              reassignState.draft.cardId === "reassign");
          return (
            <placeWorkerForm.State unavailable={null}>
              {(state) => {
                if (!state.available || reassignActive) return null;
                const selectedSpace =
                  typeof state.draft.spaceId === "string"
                    ? state.draft.spaceId
                    : null;
                if (!selectedSpace) {
                  return (
                    <ActionPanel
                      title="Place worker"
                      detail="Click an eligible action-board space."
                    >
                      <span className="text-sm text-slate-600">
                        Pick a highlighted space on the board to choose which
                        worker to send there.
                      </span>
                    </ActionPanel>
                  );
                }
                return (
                  <ActionDialog
                    DialogSurface={placeWorkerForm.Dialog}
                    title="Choose worker"
                    detail={`Sending a worker to ${
                      ACTION_SPACE_LABEL[selectedSpace] ?? selectedSpace
                    }.`}
                    trigger={
                      <placeWorkerForm.Arm className={ACTION_BUTTON_CLASS}>
                        Choose worker
                      </placeWorkerForm.Arm>
                    }
                  >
                    <placeWorkerForm.slot.componentId.Field />
                    <placeWorkerForm.Submit className={ACTION_BUTTON_CLASS}>
                      Place worker
                    </placeWorkerForm.Submit>
                  </ActionDialog>
                );
              }}
            </placeWorkerForm.State>
          );
        }}
      </reassignForm.State>
      <craftAtWorkshopForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionPanel
              title="Craft an item"
              detail="Choose an empty workshop cell and the item to craft."
            >
              <craftAtWorkshopForm.slot.itemId.Field />
              <craftAtWorkshopForm.Submit className={ACTION_BUTTON_CLASS}>
                Craft
              </craftAtWorkshopForm.Submit>
            </ActionPanel>
          ) : null
        }
      </craftAtWorkshopForm.State>
      <chooseMarketActionForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionDialog
              DialogSurface={chooseMarketActionForm.Dialog}
              title="Resolve market"
              defaultOpen
              trigger={
                <chooseMarketActionForm.Arm className={ACTION_BUTTON_CLASS}>
                  Resolve market
                </chooseMarketActionForm.Arm>
              }
            >
              <chooseMarketActionForm.slot.choice.Field />
              <chooseMarketActionForm.Submit className={ACTION_BUTTON_CLASS}>
                Resolve market
              </chooseMarketActionForm.Submit>
            </ActionDialog>
          ) : null
        }
      </chooseMarketActionForm.State>
      <chooseTradePostExchangeForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionDialog
              DialogSurface={chooseTradePostExchangeForm.Dialog}
              title="Resolve trade post"
              defaultOpen
              trigger={
                <chooseTradePostExchangeForm.Arm
                  className={ACTION_BUTTON_CLASS}
                >
                  Resolve trade post
                </chooseTradePostExchangeForm.Arm>
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <chooseTradePostExchangeForm.slot.giveWood.Field />
                <chooseTradePostExchangeForm.slot.wantWood.Field />
                <chooseTradePostExchangeForm.slot.giveStone.Field />
                <chooseTradePostExchangeForm.slot.wantStone.Field />
                <chooseTradePostExchangeForm.slot.giveCoin.Field />
                <chooseTradePostExchangeForm.slot.wantCoin.Field />
              </div>
              <chooseTradePostExchangeForm.Submit
                className={ACTION_BUTTON_CLASS}
              >
                Trade
              </chooseTradePostExchangeForm.Submit>
            </ActionDialog>
          ) : null
        }
      </chooseTradePostExchangeForm.State>
      <chooseLibraryDiscardForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionDialog
              DialogSurface={chooseLibraryDiscardForm.Dialog}
              title="Discard library card"
              defaultOpen
              trigger={
                <chooseLibraryDiscardForm.Arm className={ACTION_BUTTON_CLASS}>
                  Discard library card
                </chooseLibraryDiscardForm.Arm>
              }
            >
              <chooseLibraryDiscardForm.slot.cardId.Field />
              <chooseLibraryDiscardForm.Submit className={ACTION_BUTTON_CLASS}>
                Discard
              </chooseLibraryDiscardForm.Submit>
            </ActionDialog>
          ) : null
        }
      </chooseLibraryDiscardForm.State>
      <recallWorkerForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionDialog
              DialogSurface={recallWorkerForm.Dialog}
              title="Recall worker"
              defaultOpen
              trigger={
                <recallWorkerForm.Arm className={ACTION_BUTTON_CLASS}>
                  Recall worker
                </recallWorkerForm.Arm>
              }
            >
              <recallWorkerForm.slot.pieceId.Field />
              <recallWorkerForm.Submit className={ACTION_BUTTON_CLASS}>
                Recall
              </recallWorkerForm.Submit>
            </ActionDialog>
          ) : null
        }
      </recallWorkerForm.State>
      <reassignForm.State unavailable={null}>
        {(state) => {
          const active =
            state.available &&
            (state.handle.isArmed || state.draft.cardId === "reassign");
          if (!active) return null;
          const selectedWorker =
            typeof state.draft.pieceId === "string"
              ? state.draft.pieceId
              : null;
          const selectedDestination =
            typeof state.draft.toSpaceId === "string"
              ? state.draft.toSpaceId
              : null;

          return (
            <>
              <reassignForm.Dialog
                defaultOpen={!selectedWorker}
                title="Choose worker"
                description="Pick one of your placed workers, then choose its new action-board space."
                trigger={
                  <reassignForm.Arm className={ACTION_BUTTON_CLASS}>
                    {selectedWorker ? "Change worker" : "Choose worker"}
                  </reassignForm.Arm>
                }
                contentClassName="rounded-2xl border border-[#2d2d2d]/20 bg-[#fdfbf7] p-4 shadow-[0_24px_60px_-12px_rgba(45,45,45,0.28),0_8px_20px_-8px_rgba(45,45,45,0.18)] sm:max-w-md"
              >
                <div className="grid gap-3 pt-2">
                  <reassignForm.slot.pieceId.Field />
                </div>
              </reassignForm.Dialog>
              {selectedWorker ? (
                <ActionPanel
                  title="Reassign destination"
                  detail={`Move ${selectedWorker} to a highlighted action-board space.`}
                >
                  <span className="text-sm text-slate-600">
                    The action board is in Reassign mode. Pick a highlighted
                    destination, then confirm the move.
                  </span>
                  <reassignForm.Submit className={ACTION_BUTTON_CLASS}>
                    {selectedDestination ? "Reassign" : "Choose destination"}
                  </reassignForm.Submit>
                </ActionPanel>
              ) : null}
            </>
          );
        }}
      </reassignForm.State>
      <passPlacementForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <passPlacementForm.Submit className={ACTION_BUTTON_CLASS}>
              Pass
            </passPlacementForm.Submit>
          ) : null
        }
      </passPlacementForm.State>
      <cleanupForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <cleanupForm.Submit className={ACTION_BUTTON_CLASS}>
              Continue
            </cleanupForm.Submit>
          ) : null
        }
      </cleanupForm.State>
      <scoringForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <scoringForm.Submit className={ACTION_BUTTON_CLASS}>
              Score
            </scoringForm.Submit>
          ) : null
        }
      </scoringForm.State>
      <gameOverForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <gameOverForm.Submit className={ACTION_BUTTON_CLASS}>
              Finish
            </gameOverForm.Submit>
          ) : null
        }
      </gameOverForm.State>
    </>
  );
}
