import { PlayerRoster } from "#dreamboard/ui-contract";
import { SushiGoInteractionRoutes } from "../interaction-routes";
import type { SushiGoLayoutProps } from "../types";
import {
  OpponentPlayedCards,
  PlayedRow,
  STAMP_CLASS,
  SushiCardContent,
} from "./surfaces";

const PHASE_LABELS = {
  setup: "Dealing hands",
  drafting: "Pick a card",
  scoreRound: "Scoring round",
  gameOver: "Game over",
} as const;

export function GameUI({
  view,
  players,
  turn,
  me,
  phase,
  hand,
  draftingForm,
}: SushiGoLayoutProps) {
  const waitingFor =
    !turn.isMine && turn.currentPlayerId
      ? (players.byId.get(turn.currentPlayerId)?.name ?? turn.currentPlayerId)
      : undefined;
  const phaseLabel =
    phase === "drafting"
      ? `Round ${view.round} - ${PHASE_LABELS[phase]}`
      : PHASE_LABELS[phase];
  const tip =
    phase === "drafting"
      ? view.canUseChopsticks
        ? "Pick cards, or use chopsticks to take two."
        : "Choose one card to keep, then pass the rest left."
      : phase === "gameOver"
        ? view.winnerPlayerIds.length > 0
          ? `Winner: ${view.winnerPlayerIds.map((id) => players.byId.get(id)?.name ?? id).join(", ")}`
          : "Final scores are in."
        : waitingFor
          ? `Waiting for ${waitingFor}.`
          : undefined;

  return (
    <main className="min-h-screen bg-[#fff7ed] pb-[260px] text-[#2d2d2d] sm:pb-[280px] lg:pb-6">
      <header className="sticky top-0 z-30 border-b-2 border-[#2d2d2d] bg-[#fff7ed]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">
              Draft Feast
            </h1>
            <span className={STAMP_CLASS}>{phaseLabel}</span>
          </div>
          <PlayerRoster.Root
            order="self-first"
            score={(playerId) => view.totalScoreByPlayer[playerId] ?? 0}
            scoreLabel="PTS"
          >
            <PlayerRoster.List className="flex flex-wrap gap-2">
              {(player) => (
                <div
                  key={player.playerId}
                  className={`rounded-full border-2 px-3 py-1 text-sm ${
                    player.isActive
                      ? "border-[#2d2d2d] bg-[#fff9c4]"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <PlayerRoster.Name player={player} />:{" "}
                  <PlayerRoster.Score player={player} />
                </div>
              )}
            </PlayerRoster.List>
          </PlayerRoster.Root>
        </div>
        {tip ? (
          <div className="mx-auto max-w-[1180px] border-t border-dashed border-[#2d2d2d]/30 px-4 py-2 text-sm text-slate-700">
            {tip}
          </div>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex flex-col gap-4">
          <PlayedRow cards={view.played} label="Your played cards" />
          <PlayedRow cards={view.pudding} label="Your puddings" />
        </section>

        <aside className="flex flex-col gap-3">
          {turn.order.map((playerId) => {
            if (playerId === me.playerId) return null;
            return (
              <OpponentPlayedCards
                key={playerId}
                name={players.byId.get(playerId)?.name ?? playerId}
                played={view.playedByPlayer[playerId] ?? []}
                pudding={view.puddingByPlayer[playerId] ?? []}
              />
            );
          })}
        </aside>
      </div>

      {phase === "drafting" ? (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-[#2d2d2d] bg-[#fff7ed]/95 backdrop-blur-sm shadow-[0_-3px_0_#2d2d2d]"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 22px)" }}
        >
          <div className="mx-auto grid max-w-[1180px] gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="min-w-0">
              <div className="mb-1 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                Your hand - {view.handCount} cards
              </div>
              <hand.Hand className="flex min-h-[108px] flex-nowrap items-end gap-1.5 overflow-x-auto px-2 pb-2 sm:gap-2">
                <hand.Cards>
                  {(card) =>
                    card.hidden ? (
                      <div className="shrink-0">
                        <hand.Card card={card} />
                      </div>
                    ) : (
                      <div className="shrink-0">
                        <hand.Card
                          card={card}
                          className="relative border-0 bg-transparent p-0 transition-transform enabled:cursor-pointer enabled:hover:-translate-y-2 data-[selected=true]:-translate-y-3 data-[selected=true]:ring-2 data-[selected=true]:ring-[#ff4d4d] data-[eligible=false]:opacity-40 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Select ${card.name ?? card.id}`}
                        >
                          <SushiCardContent card={card} />
                        </hand.Card>
                      </div>
                    )
                  }
                </hand.Cards>
              </hand.Hand>
            </section>
            <div className="flex items-end">
              <SushiGoInteractionRoutes
                hand={hand}
                draftingForm={draftingForm}
                canUseChopsticks={view.canUseChopsticks}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[1180px] px-4">
          <SushiGoInteractionRoutes
            hand={hand}
            draftingForm={draftingForm}
            canUseChopsticks={view.canUseChopsticks}
          />
        </div>
      )}
    </main>
  );
}
