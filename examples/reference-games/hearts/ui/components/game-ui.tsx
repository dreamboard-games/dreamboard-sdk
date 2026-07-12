import {
  Interaction,
  type GameRootState,
  type PhaseName,
} from "../../shared/generated/ui-contract";
import { HandRow } from "./hand-row";
import { TrickArea } from "./trick-area";
import { HeartsInteractionRoutes, PRIMARY_BUTTON } from "../interaction-routes";
import type { HeartsSurfaces as HeartsSurfaceBindings } from "../surfaces";

const PANEL =
  "rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[3px_3px_0_#111]";

export function HeartsSurfaces({
  handSurface,
  phase,
  state,
}: {
  handSurface: HeartsSurfaceBindings["handSurface"];
  phase: PhaseName;
  state: GameRootState;
}) {
  const { view, players, turn, me } = state;
  const passingForm = Interaction.useForm("passing.submit");
  type PlayerKey = Parameters<typeof players.byId.get>[0];
  const playerName = (playerId: PlayerKey | null | undefined) =>
    playerId
      ? (players.byId.get(playerId)?.name ?? playerId)
      : "Unknown player";
  const recipientId = me.playerId
    ? players.order[
        (players.order.indexOf(me.playerId) + 1) % players.order.length
      ]
    : null;

  const phaseLabel: Record<PhaseName, string> = {
    setup: "Shuffling and dealing",
    passing: "Sealed pass left",
    playing: view.isFirstTrick ? "Opening trick" : "Trick play",
    scoreHand: "Scoring the hand",
    gameOver: "Hand complete",
  };
  const status =
    phase === "passing" ? (
      <passingForm.State
        unavailable={
          <span>Your three cards are sealed while the table finishes.</span>
        }
      >
        {() => <span>Select three cards for {playerName(recipientId)}.</span>}
      </passingForm.State>
    ) : phase === "playing" ? (
      turn.isMine ? (
        <span>Choose one highlighted legal card.</span>
      ) : (
        <span>Waiting for {playerName(turn.currentPlayerId)}.</span>
      )
    ) : phase === "gameOver" ? (
      view.moonShooter ? (
        <span>{playerName(view.moonShooter)} shot the moon.</span>
      ) : (
        <span>The lowest penalty score wins this one-hand game.</span>
      )
    ) : (
      <span>Automatic procedure in progress.</span>
    );

  const passAction =
    phase === "passing" ? (
      <passingForm.State unavailable={null}>
        {(form) =>
          form.available ? (
            <passingForm.Submit className={PRIMARY_BUTTON}>
              Seal three cards
            </passingForm.Submit>
          ) : null
        }
      </passingForm.State>
    ) : null;

  const hand = (
    <HandRow
      handSurface={handSurface}
      hand={view.hand}
      mode={
        phase === "passing"
          ? "passing"
          : phase === "playing"
            ? "playing"
            : "view"
      }
      isMyTurn={turn.isMine}
      recipientName={playerName(recipientId)}
      passAction={passAction}
    />
  );

  return (
    <div className="mx-auto grid min-h-[100dvh] w-full max-w-6xl gap-4 p-3 pb-44 lg:grid-cols-[minmax(0,1fr)_19rem] lg:pb-3">
      <header className="flex flex-wrap items-end justify-between gap-3 lg:col-span-2">
        <div>
          <h1 className="m-0 text-3xl font-black tracking-tight">Hearts</h1>
          <p className="m-0 mt-1 text-sm text-slate-600">{status}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1">
            {phaseLabel[phase]}
          </span>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1">
            {view.tricksCompleted}/13 tricks
          </span>
          <span
            className={`rounded-full border px-3 py-1 ${
              view.heartsBroken
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-300 bg-white text-slate-500"
            }`}
          >
            {view.heartsBroken ? "♥ Hearts broken" : "♥ Hearts unbroken"}
          </span>
        </div>
      </header>

      <main className="flex min-h-[34rem] flex-col justify-between gap-6 rounded-3xl border-2 border-slate-900 bg-gradient-to-b from-[#fdfaf3] to-[#f3eadb] p-4 shadow-[5px_5px_0_#111] sm:p-6">
        <div className="flex flex-1 items-center justify-center">
          {phase === "playing" ? (
            <TrickArea trick={view.currentTrick} />
          ) : phase === "gameOver" && view.outcome ? (
            <section className="w-full max-w-lg rounded-2xl border-2 border-slate-900 bg-white p-5 text-center shadow-[4px_4px_0_#111]">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Final standings
              </p>
              <ol className="mt-4 grid gap-2 p-0">
                {view.outcome.standings.map((standing) => (
                  <li
                    key={standing.playerId}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left"
                  >
                    <span className="font-bold">
                      {standing.rank}. {playerName(standing.playerId)}
                    </span>
                    <span className="text-sm">
                      {standing.score} points · {standing.result}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <p className="max-w-sm text-center text-sm italic text-slate-500">
              {phase === "passing"
                ? "Selections remain private until all four players commit."
                : "The trusted game engine is resolving the automatic procedure."}
            </p>
          )}
        </div>
        {phase === "passing" ? (
          <passingForm.Root>
            {hand}
            <HeartsInteractionRoutes handSurface={handSurface} />
          </passingForm.Root>
        ) : (
          <>
            {(phase === "playing" || view.hand.length > 0) && hand}
            <HeartsInteractionRoutes handSurface={handSurface} />
          </>
        )}
      </main>

      <aside className="flex flex-col gap-3">
        <section className={PANEL}>
          <h2 className="m-0 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Table
          </h2>
          <div className="mt-3 grid gap-2">
            {players.order.map((playerId) => {
              const finalScore = view.pointsByPlayer[playerId] ?? 0;
              const livePenalty =
                (view.capturedHeartsByPlayer[playerId] ?? 0) +
                (view.queenOfSpadesCapturedBy === playerId ? 13 : 0);
              const pendingPass =
                phase === "passing" && turn.activePlayerIds.includes(playerId);
              const committedPass = phase === "passing" && !pendingPass;
              return (
                <div
                  key={playerId}
                  className={`rounded-xl border-2 px-3 py-2 ${
                    turn.activePlayerIds.includes(playerId)
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">
                      {playerName(playerId)}{" "}
                      {playerId === me.playerId ? "(you)" : ""}
                    </span>
                    <span className="font-black tabular-nums">
                      {view.completed ? finalScore : livePenalty} pts
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>{view.handCountByPlayer[playerId] ?? 0} cards</span>
                    <span>
                      {committedPass
                        ? "pass sealed"
                        : pendingPass
                          ? "choosing pass"
                          : `${view.tricksWonByPlayer[playerId] ?? 0} tricks`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={PANEL}>
          <h2 className="m-0 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Recent tricks
          </h2>
          {view.trickHistory.length === 0 ? (
            <p className="mb-0 text-sm text-slate-500">
              No completed tricks yet.
            </p>
          ) : (
            <ol className="mb-0 mt-3 grid gap-2 p-0 text-sm">
              {view.trickHistory
                .slice(-3)
                .reverse()
                .map((trick) => (
                  <li
                    key={trick.number}
                    className="rounded-lg bg-slate-50 px-2 py-1.5"
                  >
                    <span className="font-bold">Trick {trick.number}</span>
                    <span className="block text-xs text-slate-500">
                      {playerName(trick.winnerPlayerId)} ·{" "}
                      {trick.heartsCaptured} hearts
                      {trick.queenOfSpadesCaptured ? " + Q♠" : ""}
                    </span>
                  </li>
                ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}
