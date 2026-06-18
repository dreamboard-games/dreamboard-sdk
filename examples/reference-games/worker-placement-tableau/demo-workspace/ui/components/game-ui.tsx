import { GameEndDisplay } from "@dreamboard-games/sdk/ui";
import {
  Game,
  PlayerRoster,
  type GameView,
  type PhaseName,
} from "#dreamboard/ui-contract";
import { ArtisansInteractionRoutes } from "../interaction-routes";
import {
  PAGE_BG,
  ACTION_BUTTON_CLASS,
  PANEL_CLASS,
  SECTION_HEADING_CLASS,
  STAMP_CLASS,
} from "../styles";
import {
  ActionBoard,
  HandPanel,
  ResourcesPanel,
  RosterPanel,
  ScoreBoard,
  SeasonIndicator,
  TableauPanel,
  WakeUpTrack,
  WorkshopMat,
} from "./surfaces";
import type { ArtisansLayoutProps } from "../types";
import { literals, type PlayerId } from "../../shared/manifest-contract";

export function ArtisansLayout({
  view,
  players,
  me,
  turn,
  phase,
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
}: ArtisansLayoutProps) {
  const otherPlayerId = literals.playerIds.find(
    (pid) => pid !== me.playerId,
  ) as PlayerId | undefined;
  const titleSub = phaseSubtitle(phase, view, turn, players);

  return (
    <>
      <main className={`flex min-h-screen flex-col ${PAGE_BG}`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2d2d2d] bg-white px-4 py-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Artisans' guild
            </h1>
            <p className="text-sm text-slate-600">{titleSub}</p>
            <Game.Chrome>
              {({ activeAction, cancel }) =>
                activeAction ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-bold text-[#2d2d2d]">
                      {activeAction.pendingInput?.title ?? activeAction.title}
                    </span>
                    <span className="text-slate-500">{activeAction.title}</span>
                    {cancel ? (
                      <button
                        type="button"
                        className={`${ACTION_BUTTON_CLASS} max-w-fit px-3 py-1 text-xs`}
                        onClick={cancel}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                ) : null
              }
            </Game.Chrome>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={STAMP_CLASS}>{phase}</span>
            <SeasonIndicator season={view.seasonNumber} />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            <reassignForm.State unavailable={null}>
              {(state) => (
                <ActionBoard
                  view={view}
                  board={actionBoard}
                  reassignCue={
                    state.available &&
                    (state.handle.isArmed || state.draft.cardId === "reassign")
                      ? {
                          pieceId:
                            typeof state.draft.pieceId === "string"
                              ? state.draft.pieceId
                              : null,
                        }
                      : null
                  }
                />
              )}
            </reassignForm.State>
            <WakeUpTrack view={view} track={wakeupTrack} />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <WorkshopMat
                view={view}
                playerId={me.playerId}
                label="You"
                board={workshopMat}
                interactive
              />
              {otherPlayerId ? (
                <WorkshopMat
                  view={view}
                  playerId={otherPlayerId}
                  label="Opponent"
                />
              ) : null}
            </div>
            <HandPanel orderHand={orderHand} apprenticeHand={apprenticeHand} />
            <TableauPanel view={view} />
          </div>

          <aside className="flex min-h-0 flex-col gap-4">
            <PlayerRoster.Root
              score={(playerId) => view.playerVPByPlayerId[playerId] ?? 0}
              scoreLabel="VP"
              badges={(playerId) => [
                view.winnerPlayerId === playerId
                  ? {
                      key: "winner",
                      icon: "Winner",
                      tooltip: "Winner",
                    }
                  : null,
              ]}
            >
              <section className={PANEL_CLASS}>
                <h2 className={SECTION_HEADING_CLASS}>Players</h2>
                <PlayerRoster.List className="mt-2 flex flex-col gap-2">
                  {(player) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between rounded-md border-2 border-[#2d2d2d] bg-[#fdfbf7] px-2 py-1 text-left text-sm font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <PlayerRoster.Name player={player} />
                        {player.isActive ? (
                          <span className="text-xs text-[#ff4d4d]">active</span>
                        ) : null}
                      </span>
                      <PlayerRoster.Score player={player} />
                    </div>
                  )}
                </PlayerRoster.List>
              </section>
            </PlayerRoster.Root>

            <ResourcesPanel view={view} />
            <RosterPanel view={view} playerId={me.playerId} />
            <ScoreBoard view={view} />

            <section
              aria-label="Actions"
              className={`${PANEL_CLASS} flex flex-col gap-2`}
            >
              <h2 className={SECTION_HEADING_CLASS}>Actions</h2>
              <ArtisansInteractionRoutes
                actionBoard={actionBoard}
                wakeupTrack={wakeupTrack}
                workshopMat={workshopMat}
                orderHand={orderHand}
                apprenticeHand={apprenticeHand}
                placeWorkerForm={placeWorkerForm}
                craftAtWorkshopForm={craftAtWorkshopForm}
                chooseMarketActionForm={chooseMarketActionForm}
                chooseTradePostExchangeForm={chooseTradePostExchangeForm}
                chooseLibraryDiscardForm={chooseLibraryDiscardForm}
                recallWorkerForm={recallWorkerForm}
                reassignForm={reassignForm}
              />
            </section>
          </aside>
        </div>
      </main>

      <GameEndDisplay
        isGameOver={!!view.winnerPlayerId}
        scores={turn.order.map((playerId) => ({
          playerId,
          name: players.byId.get(playerId)?.name ?? playerId,
          score:
            (view.finalVPByPlayerId ?? view.playerVPByPlayerId)[playerId] ?? 0,
          isWinner: playerId === view.winnerPlayerId,
        }))}
        winnerMessage="The guild's master crafter is named."
      />
    </>
  );
}

function phaseSubtitle(
  phase: PhaseName,
  view: GameView,
  turn: { isMine: boolean; currentPlayerId: PlayerId | null },
  players: { byId: ReadonlyMap<PlayerId, { name: string }> },
): string {
  if (view.winnerPlayerId) return "Game over.";
  switch (phase) {
    case "setup":
      return "Setting up the season.";
    case "wakeup":
      return turn.isMine
        ? "Pick a wake-up slot."
        : `Waiting on ${
            turn.currentPlayerId
              ? (players.byId.get(turn.currentPlayerId)?.name ??
                turn.currentPlayerId)
              : "another player"
          }.`;
    case "placement":
      if (view.pendingCraftBy === turn.currentPlayerId) {
        return turn.isMine
          ? "Pick a mat cell and item."
          : "Opponent is crafting.";
      }
      if (view.pendingMarketChoiceBy === turn.currentPlayerId) {
        return turn.isMine
          ? "Choose a market action."
          : "Opponent is at the market.";
      }
      return turn.isMine
        ? "Place a worker, fulfill an order, or pass."
        : "Opponent is acting.";
    case "cleanup":
      return "Resolving the season.";
    case "scoring":
      return "Tallying final scores.";
    case "gameOver":
      return "Game over.";
    default:
      return "";
  }
}
