import { DiceRoller } from "@dreamboard-games/sdk/ui";
import type { WorkspaceInteractionFormDialogProps } from "@dreamboard-games/sdk/runtime/workspace-contract";
import {
  Dice,
  Interaction,
  type InteractionRoutes,
} from "#dreamboard/ui-contract";
import type { ReactNode } from "react";
import {
  FrontierResourceCounter,
  resourceCounts,
} from "./components/resource-counter";
import { ACTION_BUTTON_CLASS, PRIMARY_ACTION_BUTTON_CLASS } from "./styles";
import type { FrontierInteractionContext, FrontierSurfaces } from "./types";

type ActionPanelProps = {
  title: string;
  detail?: string;
  children: ReactNode;
};

function ActionPanel({ title, detail, children }: ActionPanelProps) {
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

function TrailDialog({
  DialogSurface,
  title,
  description,
  trigger,
  defaultOpen = false,
  children,
}: {
  DialogSurface: (props: WorkspaceInteractionFormDialogProps) => ReactNode;
  title: string;
  description: string;
  trigger: ReactNode;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  return (
    <DialogSurface
      defaultOpen={defaultOpen}
      title={title}
      description={description}
      trigger={trigger}
      contentClassName="grid max-h-[min(640px,calc(100vh-2rem))] w-[min(520px,calc(100vw-2rem))] max-w-[min(520px,calc(100vw-2rem))] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden border-2 border-slate-900 p-5 shadow-[4px_4px_0_#111] sm:max-w-[min(520px,calc(100vw-2rem))]"
    >
      <div className="grid min-h-0 gap-3 overflow-y-auto pr-1 pb-1 [&>button:last-child]:sticky [&>button:last-child]:bottom-0 [&>button:last-child]:z-10">
        {children}
      </div>
    </DialogSurface>
  );
}

function TradePromptBody({
  pendingTrade,
}: Pick<FrontierInteractionContext, "pendingTrade">) {
  if (!pendingTrade) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800">
      <div className="font-bold">
        {pendingTrade.offeredBy} is offering a trade.
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 text-xs font-bold uppercase text-slate-600">
            You give
          </div>
          <FrontierResourceCounter
            counts={resourceCounts(pendingTrade.want)}
            showZero={false}
            compact
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold uppercase text-slate-600">
            You receive
          </div>
          <FrontierResourceCounter
            counts={resourceCounts(pendingTrade.give)}
            showZero={false}
            compact
          />
        </div>
      </div>
    </div>
  );
}

function draftString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function draftArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function FrontierInteractionRoutes({
  frontierBoard,
  charterHand,
  discardCardsForm,
  moveStormForm,
  tradeWithBankForm,
  offerTradeForm,
  respondToTradeForm,
  confirmTradeForm,
  playScoutForm,
  playSurveyGrantForm,
  playClaimMarkerForm,
  diceValues,
  pendingTrade,
}: FrontierSurfaces & FrontierInteractionContext) {
  const placeSetupCampForm = Interaction.useForm("setup.placeSetupCamp");
  const placeSetupTrailForm = Interaction.useForm("setup.placeSetupTrail");
  const setupSubmitForm = Interaction.useForm("setup.submit");
  const playerTurnSubmitForm = Interaction.useForm("playerTurn.submit");
  const rollDiceForm = Interaction.useForm("playerTurn.rollDice");
  const buildTrailForm = Interaction.useForm("playerTurn.buildTrail");
  const buildCampForm = Interaction.useForm("playerTurn.buildCamp");
  const upgradeToTownForm = Interaction.useForm("playerTurn.upgradeToTown");
  const buyCharterCardForm = Interaction.useForm("playerTurn.buyCharterCard");
  const cancelTradeForm = Interaction.useForm("playerTurn.cancelTrade");
  const endTurnForm = Interaction.useForm("playerTurn.endTurn");
  const playLandmarkForm = Interaction.useForm("playerTurn.playLandmark");
  const playShortcutForm = Interaction.useForm("playerTurn.playShortcut");
  const checkGameEndForm = Interaction.useForm("checkGameEnd.submit");
  const gameOverForm = Interaction.useForm("gameOver.submit");

  const routes = {
    "setup.placeSetupCamp": {
      collect: {
        vertexId: frontierBoard.slot.vertex,
      },
    },
    "setup.placeSetupTrail": {
      collect: {
        edgeId: frontierBoard.slot.edge,
      },
    },
    "setup.submit": {
      collect: {},
    },
    "playerTurn.submit": {
      collect: {},
    },
    "playerTurn.rollDice": {
      collect: {},
    },
    "playerTurn.discardCards": {
      collect: {
        toDiscard: discardCardsForm.slot.toDiscard,
      },
    },
    "playerTurn.moveStorm": {
      collect: {
        spaceId: frontierBoard.slot.space,
        stealFromPlayerId: moveStormForm.slot.stealFromPlayerId,
      },
    },
    "playerTurn.buildTrail": {
      collect: {
        edgeId: frontierBoard.slot.edge,
      },
    },
    "playerTurn.buildCamp": {
      collect: {
        vertexId: frontierBoard.slot.vertex,
      },
    },
    "playerTurn.upgradeToTown": {
      collect: {
        vertexId: frontierBoard.slot.vertex,
      },
    },
    "playerTurn.buyCharterCard": {
      collect: {},
    },
    "playerTurn.tradeWithBank": {
      collect: {
        giveResource: tradeWithBankForm.slot.giveResource,
        receiveResource: tradeWithBankForm.slot.receiveResource,
      },
    },
    "playerTurn.offerTrade": {
      collect: {
        give: offerTradeForm.slot.give,
        want: offerTradeForm.slot.want,
        targetPlayerIds: offerTradeForm.slot.targetPlayerIds,
      },
    },
    "playerTurn.respondToTrade": {
      collect: {
        response: respondToTradeForm.slot.response,
      },
    },
    "playerTurn.confirmTrade": {
      collect: {
        partnerId: confirmTradeForm.slot.partnerId,
      },
    },
    "playerTurn.cancelTrade": {
      collect: {},
    },
    "playerTurn.endTurn": {
      collect: {},
    },
    "playerTurn.playLandmark": {
      collect: {
        cardId: charterHand.slot.card,
      },
    },
    "playerTurn.playScout": {
      collect: {
        cardId: charterHand.slot.card,
        stormSpaceId: frontierBoard.slot.space,
        stealFromPlayerId: playScoutForm.slot.stealFromPlayerId,
      },
    },
    "playerTurn.playSurveyGrant": {
      collect: {
        cardId: charterHand.slot.card,
        resource1: playSurveyGrantForm.slot.resource1,
        resource2: playSurveyGrantForm.slot.resource2,
      },
    },
    "playerTurn.playClaimMarker": {
      collect: {
        cardId: charterHand.slot.card,
        resource: playClaimMarkerForm.slot.resource,
      },
    },
    "playerTurn.playShortcut": {
      collect: {
        cardId: charterHand.slot.card,
        edgeIds: frontierBoard.slot.edge,
      },
    },
    "checkGameEnd.submit": {
      collect: {},
    },
    "gameOver.submit": {
      collect: {},
    },
  } satisfies InteractionRoutes;

  return (
    <>
      <Interaction.Routes routes={routes} />
      <placeSetupCampForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <placeSetupCampForm.Arm className={ACTION_BUTTON_CLASS}>
              Place setup camp
            </placeSetupCampForm.Arm>
          ) : null
        }
      </placeSetupCampForm.State>
      <placeSetupTrailForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <placeSetupTrailForm.Arm className={ACTION_BUTTON_CLASS}>
              Place setup trail
            </placeSetupTrailForm.Arm>
          ) : null
        }
      </placeSetupTrailForm.State>
      <setupSubmitForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <setupSubmitForm.Submit className={ACTION_BUTTON_CLASS}>
              Continue
            </setupSubmitForm.Submit>
          ) : null
        }
      </setupSubmitForm.State>
      <playerTurnSubmitForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <playerTurnSubmitForm.Submit className={ACTION_BUTTON_CLASS}>
              Continue
            </playerTurnSubmitForm.Submit>
          ) : null
        }
      </playerTurnSubmitForm.State>
      <rollDiceForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionPanel title="Roll dice">
              <Dice.Root values={diceValues} count={2}>
                <Dice.Values>
                  {(dice) => (
                    <DiceRoller
                      values={dice.values}
                      diceCount={dice.diceCount}
                    />
                  )}
                </Dice.Values>
              </Dice.Root>
              <rollDiceForm.Submit
                className={`${ACTION_BUTTON_CLASS} text-center`}
              >
                Roll dice
              </rollDiceForm.Submit>
            </ActionPanel>
          ) : null
        }
      </rollDiceForm.State>
      <discardCardsForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionPanel
              title="Discard resources"
              detail="Choose the resources the storm makes you discard."
            >
              <discardCardsForm.slot.toDiscard.Field />
              <discardCardsForm.Submit className={ACTION_BUTTON_CLASS}>
                Discard
              </discardCardsForm.Submit>
            </ActionPanel>
          ) : null
        }
      </discardCardsForm.State>
      <moveStormForm.State unavailable={null}>
        {(state) => {
          if (!state.available) return null;
          const selectedSpaceId = draftString(state.draft.spaceId);
          if (!selectedSpaceId) {
            return (
              <ActionPanel
                title="Move storm"
                detail="Choose the storm space on the board."
              >
                <moveStormForm.Arm className={ACTION_BUTTON_CLASS}>
                  Move storm
                </moveStormForm.Arm>
              </ActionPanel>
            );
          }
          return (
            <TrailDialog
              DialogSurface={moveStormForm.Dialog}
              title="Choose steal target"
              description={`Storm destination: ${selectedSpaceId}. Choose who the storm steals from.`}
              trigger={
                <moveStormForm.Arm className={ACTION_BUTTON_CLASS}>
                  Choose steal target
                </moveStormForm.Arm>
              }
              defaultOpen
            >
              <moveStormForm.slot.stealFromPlayerId.Field />
              <moveStormForm.Submit
                className={`${ACTION_BUTTON_CLASS} mt-2 w-full text-center`}
              >
                Move storm
              </moveStormForm.Submit>
            </TrailDialog>
          );
        }}
      </moveStormForm.State>
      <buildTrailForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <buildTrailForm.Arm className={ACTION_BUTTON_CLASS}>
              Build trail
            </buildTrailForm.Arm>
          ) : null
        }
      </buildTrailForm.State>
      <buildCampForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <buildCampForm.Arm className={ACTION_BUTTON_CLASS}>
              Build camp
            </buildCampForm.Arm>
          ) : null
        }
      </buildCampForm.State>
      <upgradeToTownForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <upgradeToTownForm.Arm className={ACTION_BUTTON_CLASS}>
              Upgrade town
            </upgradeToTownForm.Arm>
          ) : null
        }
      </upgradeToTownForm.State>
      <buyCharterCardForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <buyCharterCardForm.Submit className={ACTION_BUTTON_CLASS}>
              Buy charter card
            </buyCharterCardForm.Submit>
          ) : null
        }
      </buyCharterCardForm.State>
      <tradeWithBankForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionPanel title="Trade with bank">
              <tradeWithBankForm.slot.giveResource.Field />
              <tradeWithBankForm.slot.receiveResource.Field />
              <tradeWithBankForm.Submit className={ACTION_BUTTON_CLASS}>
                Trade
              </tradeWithBankForm.Submit>
            </ActionPanel>
          ) : null
        }
      </tradeWithBankForm.State>
      <offerTradeForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <TrailDialog
              DialogSurface={offerTradeForm.Dialog}
              title="Offer trade"
              description="Choose resources to give, resources to request, and the captains who receive the offer."
              trigger={
                <offerTradeForm.Arm className={ACTION_BUTTON_CLASS}>
                  Offer trade
                </offerTradeForm.Arm>
              }
            >
              <offerTradeForm.slot.give.Field />
              <offerTradeForm.slot.want.Field />
              <offerTradeForm.slot.targetPlayerIds.Field />
              <offerTradeForm.Submit className={ACTION_BUTTON_CLASS}>
                Offer trade
              </offerTradeForm.Submit>
            </TrailDialog>
          ) : null
        }
      </offerTradeForm.State>
      <respondToTradeForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <div className="fixed bottom-4 right-4 z-[60] grid w-[min(520px,calc(100vw-2rem))] gap-3 rounded-lg border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#111]">
              <TradePromptBody pendingTrade={pendingTrade} />
              <respondToTradeForm.slot.response.Field />
              <respondToTradeForm.Submit
                className={`${ACTION_BUTTON_CLASS} text-center`}
              >
                Submit response
              </respondToTradeForm.Submit>
            </div>
          ) : null
        }
      </respondToTradeForm.State>
      <confirmTradeForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionPanel title="Confirm trade">
              <confirmTradeForm.slot.partnerId.Field />
              <confirmTradeForm.Submit className={ACTION_BUTTON_CLASS}>
                Confirm trade
              </confirmTradeForm.Submit>
            </ActionPanel>
          ) : null
        }
      </confirmTradeForm.State>
      <cancelTradeForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <cancelTradeForm.Submit className={ACTION_BUTTON_CLASS}>
              Cancel trade
            </cancelTradeForm.Submit>
          ) : null
        }
      </cancelTradeForm.State>
      <endTurnForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <endTurnForm.Submit className={PRIMARY_ACTION_BUTTON_CLASS}>
              End turn
            </endTurnForm.Submit>
          ) : null
        }
      </endTurnForm.State>
      <playLandmarkForm.State unavailable={null}>
        {(state) => {
          if (!state.available) return null;
          const selectedCardId = draftString(state.draft.cardId);
          return (
            <ActionPanel
              title="Landmark"
              detail={
                selectedCardId
                  ? `Selected ${selectedCardId}.`
                  : "Choose a landmark card from your hand."
              }
            >
              {!selectedCardId ? (
                <playLandmarkForm.Arm className={ACTION_BUTTON_CLASS}>
                  Play landmark
                </playLandmarkForm.Arm>
              ) : (
                <playLandmarkForm.Submit className={ACTION_BUTTON_CLASS}>
                  Play landmark
                </playLandmarkForm.Submit>
              )}
            </ActionPanel>
          );
        }}
      </playLandmarkForm.State>
      <playScoutForm.State unavailable={null}>
        {(state) => {
          if (!state.available) return null;
          const selectedCardId = draftString(state.draft.cardId);
          const selectedStormSpaceId = draftString(state.draft.stormSpaceId);
          if (!selectedCardId || !selectedStormSpaceId) {
            return (
              <ActionPanel
                title="Play scout"
                detail={
                  selectedCardId
                    ? "Choose a storm space on the board."
                    : "Choose a scout card from your hand."
                }
              >
                <playScoutForm.Arm className={ACTION_BUTTON_CLASS}>
                  Play scout
                </playScoutForm.Arm>
              </ActionPanel>
            );
          }
          return (
            <TrailDialog
              DialogSurface={playScoutForm.Dialog}
              title="Choose steal target"
              description={`Scout ${selectedCardId} moves the storm to ${selectedStormSpaceId}. Choose who it steals from.`}
              trigger={
                <playScoutForm.Arm className={ACTION_BUTTON_CLASS}>
                  Choose steal target
                </playScoutForm.Arm>
              }
              defaultOpen
            >
              <playScoutForm.slot.stealFromPlayerId.Field />
              <playScoutForm.Submit
                className={`${ACTION_BUTTON_CLASS} mt-2 w-full text-center`}
              >
                Play scout
              </playScoutForm.Submit>
            </TrailDialog>
          );
        }}
      </playScoutForm.State>
      <playSurveyGrantForm.State unavailable={null}>
        {(state) => {
          if (!state.available) return null;
          const selectedCardId = draftString(state.draft.cardId);
          if (!selectedCardId) {
            return (
              <ActionPanel
                title="Play survey grant"
                detail="Choose a survey grant card from your hand."
              >
                <playSurveyGrantForm.Arm className={ACTION_BUTTON_CLASS}>
                  Play survey grant
                </playSurveyGrantForm.Arm>
              </ActionPanel>
            );
          }
          return (
            <TrailDialog
              DialogSurface={playSurveyGrantForm.Dialog}
              title="Claim supplies"
              description={`Survey grant ${selectedCardId} is selected. Choose two resources.`}
              trigger={
                <playSurveyGrantForm.Arm className={ACTION_BUTTON_CLASS}>
                  Claim supplies
                </playSurveyGrantForm.Arm>
              }
              defaultOpen
            >
              <playSurveyGrantForm.slot.resource1.Field />
              <playSurveyGrantForm.slot.resource2.Field />
              <playSurveyGrantForm.Submit
                className={`${ACTION_BUTTON_CLASS} mt-2 w-full text-center`}
              >
                Claim supplies
              </playSurveyGrantForm.Submit>
            </TrailDialog>
          );
        }}
      </playSurveyGrantForm.State>
      <playClaimMarkerForm.State unavailable={null}>
        {(state) => {
          if (!state.available) return null;
          const selectedCardId = draftString(state.draft.cardId);
          if (!selectedCardId) {
            return (
              <ActionPanel
                title="Play claim marker"
                detail="Choose a claim marker card from your hand."
              >
                <playClaimMarkerForm.Arm className={ACTION_BUTTON_CLASS}>
                  Play claim marker
                </playClaimMarkerForm.Arm>
              </ActionPanel>
            );
          }
          return (
            <TrailDialog
              DialogSurface={playClaimMarkerForm.Dialog}
              title="Claim resource"
              description={`Claim marker ${selectedCardId} is selected. Choose a resource.`}
              trigger={
                <playClaimMarkerForm.Arm className={ACTION_BUTTON_CLASS}>
                  Claim resource
                </playClaimMarkerForm.Arm>
              }
              defaultOpen
            >
              <playClaimMarkerForm.slot.resource.Field />
              <playClaimMarkerForm.Submit
                className={`${ACTION_BUTTON_CLASS} mt-2 w-full text-center`}
              >
                Claim resource
              </playClaimMarkerForm.Submit>
            </TrailDialog>
          );
        }}
      </playClaimMarkerForm.State>
      <playShortcutForm.State unavailable={null}>
        {(state) => {
          if (!state.available) return null;
          const selectedCardId = draftString(state.draft.cardId);
          const selectedEdgeIds = draftArray(state.draft.edgeIds);
          return (
            <ActionPanel
              title="Play shortcut"
              detail={
                !selectedCardId
                  ? "Choose a shortcut card from your hand."
                  : selectedEdgeIds.length < 2
                    ? "Choose two trail edges on the board."
                    : "Confirm the shortcut trails."
              }
            >
              <div className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                {selectedEdgeIds.length > 0
                  ? `${selectedEdgeIds.length} of 2 trail edges selected.`
                  : selectedCardId
                    ? "No trail edges selected."
                    : "No shortcut card selected."}
              </div>
              {selectedCardId && selectedEdgeIds.length >= 2 ? (
                <playShortcutForm.Submit className={ACTION_BUTTON_CLASS}>
                  Build trails
                </playShortcutForm.Submit>
              ) : (
                <playShortcutForm.Arm className={ACTION_BUTTON_CLASS}>
                  Play shortcut
                </playShortcutForm.Arm>
              )}
            </ActionPanel>
          );
        }}
      </playShortcutForm.State>
      <checkGameEndForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <checkGameEndForm.Submit className={ACTION_BUTTON_CLASS}>
              Continue
            </checkGameEndForm.Submit>
          ) : null
        }
      </checkGameEndForm.State>
      <gameOverForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <gameOverForm.Submit className={PRIMARY_ACTION_BUTTON_CLASS}>
              Finish
            </gameOverForm.Submit>
          ) : null
        }
      </gameOverForm.State>
    </>
  );
}
