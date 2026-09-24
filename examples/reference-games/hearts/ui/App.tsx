import { useGame } from "./game";
import { HandRow } from "./components/hand-row";
import { TrickArea } from "./components/trick-area";
import { Players } from "./components/dreamboard/players";
import { Standings } from "./components/dreamboard/standings";

export default function App() {
  const game = useGame();
  const { view, me, phase, turn, players } = game;
  if (!view || !me)
    return <main aria-live="polite">Connecting to Hearts…</main>;
  const playerName = (id: typeof me.id | null) =>
    id ? (players.get(id)?.name ?? id) : "the table";
  const recipient = players.next(me.id);
  const passing = game.interactions.get("passing.submit");
  const phaseLabel = phase.switch({
    setup: () => "Shuffling and dealing",
    passing: () => "Sealed pass left",
    playing: () => (view.isFirstTrick ? "Opening trick" : "Trick play"),
    scoreHand: () => "Scoring the hand",
    gameOver: () => "Hand complete",
  });
  const status = phase.is("passing")
    ? passing?.getIsAvailable()
      ? `Select three cards for ${recipient?.name ?? "the next player"}.`
      : "Your three cards are sealed while the table finishes."
    : phase.is("playing")
      ? turn.isMine
        ? "Choose one highlighted legal card."
        : `Waiting for ${playerName(turn.currentPlayerId)}.`
      : view.moonShooter
        ? `${playerName(view.moonShooter)} shot the moon.`
        : "The lowest penalty score wins this one-hand game.";
  return (
    <div className="mx-auto grid min-h-dvh max-w-6xl content-start gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <header className="flex flex-wrap items-end justify-between gap-3 lg:col-span-2">
        <div>
          <h1 className="m-0 text-3xl font-black">Hearts</h1>
          <p role="status">{status}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>{phaseLabel}</span>
          <span>{view.tricksCompleted}/13 tricks</span>
          <span>
            {view.heartsBroken ? "♥ Hearts broken" : "♥ Hearts unbroken"}
          </span>
        </div>
      </header>
      <main className="flex min-w-0 flex-col justify-between gap-6 rounded-3xl border-2 border-slate-900 bg-[#fdfaf3] p-4 sm:p-6">
        {phase.is("playing") ? (
          <TrickArea trick={view.currentTrick} />
        ) : view.outcome ? (
          <Standings
            caption="Final standings"
            scoreLabel="Penalty points"
            standings={view.outcome.standings.map((standing) => ({
              id: standing.playerId,
              rank: standing.rank,
              name: playerName(standing.playerId),
              score: `${standing.score} · ${standing.result}`,
            }))}
          />
        ) : (
          <p className="text-center">
            Selections remain private until all four players commit.
          </p>
        )}
        {(phase.is("passing") || phase.is("playing")) && (
          <HandRow recipientName={recipient?.name ?? "the next player"} />
        )}
      </main>
      <aside className="grid content-start gap-4">
        <section className="rounded-2xl border border-slate-300 bg-white p-3">
          <h2 className="text-lg font-bold">Table</h2>
          <Players
            players={players.getAll().map((player) => ({
              id: player.id,
              name: `${player.name}${player.isMe ? " (you)" : ""}`,
              seat: (player.index + 1) as 1 | 2 | 3 | 4,
              status: phase.is("passing")
                ? turn.activePlayerIds.includes(player.id)
                  ? "choosing pass"
                  : "pass sealed"
                : `${view.tricksWonByPlayer[player.id]} tricks`,
              detail: (
                <span>
                  {view.handCountByPlayer[player.id]} cards ·{" "}
                  {view.completed
                    ? view.pointsByPlayer[player.id]
                    : (view.capturedHeartsByPlayer[player.id] ?? 0) +
                      (view.queenOfSpadesCapturedBy === player.id
                        ? 13
                        : 0)}{" "}
                  pts
                </span>
              ),
            }))}
          />
        </section>
        <section className="rounded-2xl border border-slate-300 bg-white p-3">
          <h2 className="text-lg font-bold">Recent tricks</h2>
          {view.trickHistory.length ? (
            <ol>
              {view.trickHistory
                .slice(-3)
                .reverse()
                .map((trick) => (
                  <li key={trick.number}>
                    Trick {trick.number}: {playerName(trick.winnerPlayerId)} ·{" "}
                    {trick.heartsCaptured} hearts
                    {trick.queenOfSpadesCaptured ? " + Q♠" : ""}
                  </li>
                ))}
            </ol>
          ) : (
            <p>No completed tricks yet.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
