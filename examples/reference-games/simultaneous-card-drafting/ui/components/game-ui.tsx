import type { PlayerId } from "../../shared/manifest-contract";
import {
  LanternMarketDraftingAction,
  LanternMarketInteractionRoutes,
} from "../interaction-routes";
import type { LanternMarketLayoutProps } from "../types";
import { BADGE_CLASS, CardCollection, MarketCardContent } from "./surfaces";

function playerName(
  players: LanternMarketLayoutProps["players"],
  playerId: string,
) {
  return players.byId.get(playerId as PlayerId)?.name ?? playerId;
}

function commitLabel({
  playerId,
  phase,
  activePlayerIds,
}: {
  playerId: PlayerId;
  phase: LanternMarketLayoutProps["phase"];
  activePlayerIds: readonly PlayerId[];
}) {
  if (phase === "gameOver") return "Final";
  if (phase !== "drafting") return "Resolving";
  return activePlayerIds.includes(playerId) ? "Choosing" : "Locked";
}

export function GameUI({
  view,
  players,
  turn,
  me,
  phase,
  hand,
  draftingForm,
}: LanternMarketLayoutProps) {
  const isDrafting = phase === "drafting";
  const myPlayerId = me.playerId;
  const myChoiceIsLocked =
    isDrafting &&
    myPlayerId !== null &&
    !turn.activePlayerIds.includes(myPlayerId);
  const topStandings =
    view.outcome?.standings.filter(({ rank }) => rank === 1) ?? [];

  return (
    <div
      className="min-h-screen bg-[#f6ead2] pb-[280px] text-[#40251b] lg:pb-8"
      data-reference-game="simultaneous-card-drafting"
      data-market-phase={view.currentPhase}
    >
      <header className="border-b-2 border-[#40251b] bg-[#fffaf0] shadow-[0_3px_0_#40251b]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-[#b83a2d]">
              Evening festival draft
            </p>
            <h1 className="m-0 text-3xl font-black tracking-tight sm:text-4xl">
              Lantern Market
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={BADGE_CLASS}>Round {view.round} of 2</span>
            <span className={BADGE_CLASS}>Pick {view.pick} of 6</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="grid content-start gap-4">
          <div className="rounded-2xl border-2 border-[#40251b] bg-[#fffaf0] p-4 shadow-[4px_4px_0_#40251b]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">Festival stalls</h2>
                <p className="mb-0 mt-1 max-w-2xl text-sm leading-6 text-[#76584a]">
                  Everyone locks one private card. The barrier reveals all
                  choices together, then each remaining hand passes left.
                </p>
              </div>
              {myChoiceIsLocked ? (
                <span className="rounded-full border-2 border-[#47734b] bg-[#e5f4d7] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#315636]">
                  Choice locked
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {turn.order.map((playerId) => {
              const stall = view.stallByPlayer[playerId] ?? [];
              const isMe = playerId === myPlayerId;
              return (
                <article
                  key={playerId}
                  className="rounded-2xl border-2 border-[#40251b] bg-[#fffaf0] p-4 shadow-[4px_4px_0_#40251b]"
                  data-market-player={playerId}
                  data-market-commit={commitLabel({
                    playerId,
                    phase,
                    activePlayerIds: turn.activePlayerIds,
                  })}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="m-0 text-base font-black">
                      {playerName(players, playerId)}
                      {isMe ? " (you)" : ""}
                    </h3>
                    <span className="rounded-full border border-[#40251b]/30 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                      {commitLabel({
                        playerId,
                        phase,
                        activePlayerIds: turn.activePlayerIds,
                      })}
                    </span>
                  </div>
                  <CardCollection cards={stall} compact />
                  <p className="mb-0 mt-3 text-xs font-bold text-[#76584a]">
                    {view.handCountByPlayer[playerId] ?? 0} cards still passing
                  </p>
                </article>
              );
            })}
          </div>

          {view.roundHistory.length > 0 ? (
            <section className="rounded-2xl border-2 border-[#40251b] bg-[#fffaf0] p-4 shadow-[4px_4px_0_#40251b]">
              <h2 className="m-0 text-xl font-black">Scored rounds</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {view.roundHistory.map((round) => (
                  <div
                    key={round.round}
                    className="rounded-xl border border-[#40251b]/25 bg-white/70 p-3"
                  >
                    <h3 className="m-0 text-sm font-black">
                      Round {round.round}
                    </h3>
                    <dl className="mb-0 mt-2 grid gap-1 text-sm">
                      {turn.order.map((playerId) => (
                        <div
                          key={playerId}
                          className="flex justify-between gap-3"
                        >
                          <dt>{playerName(players, playerId)}</dt>
                          <dd className="m-0 font-black">
                            {round.scoreByPlayer[playerId] ?? 0} pts
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-2xl border-2 border-[#40251b] bg-[#fffaf0] p-4 shadow-[4px_4px_0_#40251b]">
            <h2 className="m-0 text-xl font-black">Market score</h2>
            <ol className="mb-0 mt-3 grid list-none gap-2 p-0">
              {turn.order.map((playerId) => (
                <li
                  key={playerId}
                  className="flex items-center justify-between rounded-xl border border-[#40251b]/25 bg-white/70 px-3 py-2"
                >
                  <span className="font-bold">
                    {playerName(players, playerId)}
                  </span>
                  <span className="text-lg font-black">
                    {view.totalScoreByPlayer[playerId] ?? 0}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border-2 border-[#40251b] bg-[#fffaf0] p-4 shadow-[4px_4px_0_#40251b]">
            <h2 className="m-0 text-xl font-black">Scoring guide</h2>
            <ul className="mb-0 mt-3 grid list-none gap-2 p-0 text-sm">
              <li className="flex items-center justify-between rounded-lg bg-[#ffe4d6] px-3 py-2">
                <span>🏮 Lanterns</span>
                <strong>2 each</strong>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-[#e5f4d7] px-3 py-2">
                <span>🍵 Tea Cups</span>
                <strong>5 per pair</strong>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-[#e4edff] px-3 py-2">
                <span>🎏 Banners</span>
                <strong>9 per trio</strong>
              </li>
            </ul>
          </section>

          {view.outcome ? (
            <section
              className="rounded-2xl border-2 border-[#40251b] bg-[#fff4cf] p-4 shadow-[4px_4px_0_#40251b]"
              data-market-outcome={view.outcome.reason.code}
            >
              <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-[#b83a2d]">
                Market closed
              </p>
              <h2 className="mb-0 mt-1 text-2xl font-black">
                {topStandings.length > 1 ? "Shared victory" : "Top stall"}
              </h2>
              <ol className="mb-0 mt-3 grid list-none gap-2 p-0">
                {view.outcome.standings.map((standing) => (
                  <li
                    key={standing.playerId}
                    className="rounded-xl border border-[#40251b]/25 bg-white/70 p-3"
                  >
                    <div className="flex justify-between gap-3 font-black">
                      <span>
                        #{standing.rank}{" "}
                        {playerName(players, standing.playerId)}
                      </span>
                      <span>{standing.score ?? 0} pts</span>
                    </div>
                    <p className="mb-0 mt-1 text-xs capitalize text-[#76584a]">
                      {standing.result}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </aside>
      </main>

      {isDrafting ? (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-[#40251b] bg-[#fffaf0]/95 shadow-[0_-4px_0_#40251b] backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          <div className="mx-auto grid max-w-6xl gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_230px]">
            <section className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.12em] text-[#76584a]">
                <span>Your private hand</span>
                <span>{view.hand.length} cards</span>
              </div>
              <hand.Hand
                className="flex min-h-[122px] flex-nowrap items-end gap-2 overflow-x-auto px-1 pb-2"
                layout={{ desktop: "strip", mobile: "strip" }}
              >
                <hand.Actions>
                  {() => (
                    <LanternMarketDraftingAction draftingForm={draftingForm} />
                  )}
                </hand.Actions>
                <hand.Cards>
                  {(card) =>
                    card.hidden ? (
                      <hand.Card key={card.id} card={card} />
                    ) : (
                      <hand.Card
                        key={card.id}
                        card={card}
                        className="h-[104px] w-[74px] shrink-0 overflow-hidden rounded-xl border-0 bg-transparent p-0 data-[eligible=false]:opacity-40 data-[selected=true]:ring-4 data-[selected=true]:ring-[#b83a2d] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Select ${card.name ?? card.id}`}
                      >
                        <MarketCardContent card={card} />
                      </hand.Card>
                    )
                  }
                </hand.Cards>
              </hand.Hand>
            </section>
            <div className="flex items-end">
              <LanternMarketInteractionRoutes
                hand={hand}
                draftingForm={draftingForm}
                renderSubmit={false}
              />
              {myChoiceIsLocked ? (
                <div className="rounded-xl border-2 border-[#47734b] bg-[#e5f4d7] p-3 text-sm font-bold text-[#315636]">
                  Waiting for the remaining sealed choices.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
