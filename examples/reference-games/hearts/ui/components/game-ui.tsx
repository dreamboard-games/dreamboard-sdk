import React, { useState } from "react";
import {
  Interaction,
  PlayerRoster,
  type GameRootState,
  type PhaseName,
} from "../../shared/generated/ui-contract.ts";
import { HandRow } from "./hand-row";
import { TrickArea } from "./trick-area";
import { HeartsInteractionRoutes, PRIMARY_BUTTON } from "../interaction-routes";
import type { HeartsSurfaces as HeartsSurfaceBindings } from "../surfaces";

const PANEL_CLASS =
  "rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[3px_3px_0_#111]";
const SECTION_HEADING_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500";
const TIP_CLASS = "m-0 text-sm text-slate-600";

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
  const isMyTurn = turn.isMine;
  const turnOrder = players.order;
  const activePlayerId = turn.currentPlayerId;
  const controllingPlayerId = me.playerId;

  // Passing is a simultaneous phase, so `me.canAct` / `turn.isMine` are not the
  // right signal for "have I passed yet?". We read the passing form's
  // availability instead (available = still my turn to choose).
  const passingForm = Interaction.useForm("passing.submit");

  type PlayerKey = Parameters<typeof players.byId.get>[0];
  const playerName = (id: PlayerKey | null | undefined) =>
    id ? (players.byId.get(id)?.name ?? id) : null;

  const recipientId = (() => {
    if (!controllingPlayerId) return null;
    const idx = turnOrder.indexOf(controllingPlayerId);
    if (idx < 0) return null;
    return turnOrder[(idx + 1) % turnOrder.length] ?? null;
  })();
  const recipientName = playerName(recipientId) ?? "the next seat";

  // ── HUD status copy ─────────────────────────────────────────────────
  const phaseLabel = {
    setup: "Dealing",
    passing: "Pass three cards",
    playing: view.isFirstTrick ? "Opening trick" : "Trick play",
    scoreHand: "Scoring",
    gameOver: "Game complete",
  } satisfies Record<PhaseName, string>;

  // Tips for the non-simultaneous phases. Passing renders through the form
  // state below so it always reflects whether this seat still owes a pass.
  const staticTip = {
    setup: "Dealing hands…",
    playing:
      view.isFirstTrick && view.currentTrick.length === 0
        ? isMyTurn
          ? "Lead with the 2 of clubs."
          : "Waiting for the 2♣ holder to lead."
        : isMyTurn
          ? "Your turn — play a card from your hand."
          : `Waiting on ${playerName(activePlayerId) ?? "the active player"}.`,
    scoreHand: "Tallying penalty cards…",
    gameOver: view.moonShooter
      ? `${playerName(view.moonShooter)} shot the moon.`
      : "A player reached 100 points.",
  } satisfies Record<Exclude<PhaseName, "passing">, string>;

  const statusTip =
    phase === "passing" ? (
      <passingForm.State
        unavailable={
          <p className={TIP_CLASS}>
            Pass submitted — waiting on the rest of the table.
          </p>
        }
      >
        {() => (
          <p className={TIP_CLASS}>
            Choose three cards to pass to {recipientName}.
          </p>
        )}
      </passingForm.State>
    ) : (
      <p className={TIP_CLASS}>{staticTip[phase]}</p>
    );

  // ── Chrome resources: hearts-broken / first-trick indicators ──
  const chromeResources =
    phase === "playing" || phase === "scoreHand" ? (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full border px-2 py-0.5 font-semibold ${
            view.heartsBroken
              ? "border-rose-300 bg-rose-50 text-rose-700"
              : "border-slate-300 bg-white text-slate-500"
          }`}
        >
          {view.heartsBroken ? "♥ Hearts broken" : "♥ Hearts unbroken"}
        </span>
        {view.isFirstTrick ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
            First trick — no penalties
          </span>
        ) : null}
      </div>
    ) : null;

  // ── Board layout ────────────────────────────────────────────────────
  // The trick only makes sense mid-play. Other phases get a short note in the
  // middle of the felt so the table never shows four empty placeholder slots.
  const centerNote = {
    setup: "Shuffling and dealing…",
    passing: "Cards you pass stay hidden until everyone has chosen.",
    playing: null,
    scoreHand: "Hand complete — tallying penalties.",
    gameOver: view.moonShooter
      ? `${playerName(view.moonShooter)} shot the moon! 🌙`
      : "Final scores are in — thanks for playing.",
  } satisfies Record<PhaseName, string | null>;

  const handMode: "passing" | "playing" | "view" =
    phase === "passing" ? "passing" : phase === "playing" ? "playing" : "view";

  // The pass commit renders inside the hand summary so it travels with the
  // hand into the mobile drawer (where a felt-anchored button would be trapped
  // behind the drawer scrim). The header copy already covers the post-submit
  // "waiting" state, so we render nothing once the form is no longer available.
  const passAction =
    phase === "passing" ? (
      <passingForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <passingForm.Submit className={PRIMARY_BUTTON}>
              Pass selected cards
            </passingForm.Submit>
          ) : null
        }
      </passingForm.State>
    ) : null;

  // On mobile the sidebar would push the game table down. We hide it by
  // default and let users toggle it via a compact strip at the top.
  const [showPlayers, setShowPlayers] = useState(false);

  const playerList = (
    <PlayerRoster.Root
      order="self-first"
      score={(playerId) => view.totalPointsByPlayer[playerId] ?? 0}
      scoreLabel="PTS"
      badges={(playerId) => [
        view.moonShooter === playerId
          ? { key: "moon", icon: "🌙", tooltip: "Shot the moon" }
          : null,
      ]}
      metadata={(playerId) => ({
        hand: view.pointsThisHand[playerId] ?? 0,
        tricks: view.tricksWonByPlayer[playerId] ?? 0,
      })}
    >
      {/* ── Compact score strip — always visible on mobile ────────────── */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowPlayers((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border-2 border-slate-900 bg-white px-3 py-2 shadow-[3px_3px_0_#111]"
        >
          <PlayerRoster.List className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {(player) => (
              <span
                key={player.playerId}
                className="flex shrink-0 flex-col items-center"
                title={
                  typeof player.metadata?.hand === "number"
                    ? `${player.metadata.hand} pts this hand`
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full border border-slate-900"
                  style={{ background: player.color ?? "#94a3b8" }}
                />
                <span className="text-[10px] font-bold tabular-nums text-slate-700">
                  <PlayerRoster.Score player={player} />
                </span>
              </span>
            )}
          </PlayerRoster.List>
          <span className="shrink-0 text-[11px] font-semibold text-slate-500">
            {showPlayers ? "Hide" : "Scores"}
          </span>
        </button>
        {showPlayers && (
          <section className={`mt-2 ${PANEL_CLASS}`}>
            <PlayerRoster.List className="flex flex-col gap-2">
              {(player) => {
                const handPts =
                  typeof player.metadata?.hand === "number"
                    ? player.metadata.hand
                    : 0;
                const tricks =
                  typeof player.metadata?.tricks === "number"
                    ? player.metadata.tricks
                    : 0;
                return (
                  <div
                    key={player.playerId}
                    className={`flex w-full flex-col gap-0.5 rounded-xl border-2 border-l-[6px] border-slate-900 px-2.5 py-1.5 text-left transition-colors ${
                      player.isActive
                        ? "bg-amber-50"
                        : player.isCurrentPlayer
                          ? "bg-[#fdfbf7]"
                          : "bg-white"
                    }`}
                    style={{ borderLeftColor: player.color ?? "#94a3b8" }}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900">
                        <span className="truncate">
                          <PlayerRoster.Name player={player} />
                        </span>
                        <PlayerRoster.Badges
                          player={player}
                          className="flex shrink-0 items-center gap-0.5 text-xs"
                        />
                        {player.isCurrentPlayer && (
                          <span className="shrink-0 rounded bg-slate-800 px-1 py-px text-[10px] font-bold uppercase tracking-wide text-white">
                            you
                          </span>
                        )}
                        {player.isActive && (
                          <span className="shrink-0 rounded bg-amber-400 px-1 py-px text-[10px] font-bold uppercase tracking-wide text-amber-900">
                            turn
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-slate-800">
                        <PlayerRoster.Score player={player} />
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {handPts} pts this hand · {tricks}{" "}
                      {tricks === 1 ? "trick" : "tricks"}
                    </span>
                  </div>
                );
              }}
            </PlayerRoster.List>
          </section>
        )}
      </div>

      {/* ── Full sidebar panel — desktop only ─────────────────────────── */}
      <section className={`hidden lg:block ${PANEL_CLASS}`}>
        <h2 className={SECTION_HEADING_CLASS}>Players</h2>
        <PlayerRoster.List className="mt-2 flex flex-col gap-2">
          {(player) => {
            const handPts =
              typeof player.metadata?.hand === "number"
                ? player.metadata.hand
                : 0;
            const tricks =
              typeof player.metadata?.tricks === "number"
                ? player.metadata.tricks
                : 0;
            return (
              <div
                key={player.playerId}
                className={`flex w-full flex-col gap-0.5 rounded-xl border-2 border-l-[6px] border-slate-900 px-2.5 py-1.5 text-left transition-colors ${
                  player.isActive
                    ? "bg-amber-50"
                    : player.isCurrentPlayer
                      ? "bg-[#fdfbf7]"
                      : "bg-white"
                }`}
                style={{ borderLeftColor: player.color ?? "#94a3b8" }}
              >
                {/* Name row */}
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900">
                    <span className="truncate">
                      <PlayerRoster.Name player={player} />
                    </span>
                    <PlayerRoster.Badges
                      player={player}
                      className="flex shrink-0 items-center gap-0.5 text-xs"
                    />
                    {player.isCurrentPlayer && (
                      <span className="shrink-0 rounded bg-slate-800 px-1 py-px text-[10px] font-bold uppercase tracking-wide text-white">
                        you
                      </span>
                    )}
                    {player.isActive && (
                      <span className="shrink-0 rounded bg-amber-400 px-1 py-px text-[10px] font-bold uppercase tracking-wide text-amber-900">
                        turn
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-slate-800">
                    <PlayerRoster.Score player={player} />
                  </span>
                </span>
                {/* Meta row */}
                <span className="text-[11px] text-slate-500">
                  {handPts} pts this hand · {tricks}{" "}
                  {tricks === 1 ? "trick" : "tricks"}
                </span>
              </div>
            );
          }}
        </PlayerRoster.List>
      </section>
    </PlayerRoster.Root>
  );

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[min(1120px,calc(100vw-20px))] flex-col gap-3 p-3 pb-44 sm:gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[auto_minmax(0,1fr)] lg:items-stretch lg:pb-3">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-1.5 lg:col-span-full">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="m-0 text-3xl font-bold leading-none">Hearts</h1>
          <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-sm font-semibold text-slate-600">
            Round {view.roundNumber}
          </span>
          <span className="text-sm font-semibold text-slate-800">
            {phaseLabel[phase]}
          </span>
        </div>
        {statusTip}
        {chromeResources}
      </header>

      {/* ── Game board / table ─────────────────────────────────────────── */}
      {/* Trick sits in the middle of the felt; your hand hugs the bottom edge
          like real cards in front of you. */}
      <section className="flex flex-col items-center gap-4 rounded-3xl border-2 border-slate-900 bg-gradient-to-b from-[#fdfaf3] to-[#f6efe2] p-4 shadow-[5px_5px_0_#111] sm:p-6">
        <div className="flex w-full flex-1 items-center justify-center py-2">
          {phase === "playing" ? (
            <TrickArea trick={view.currentTrick} />
          ) : (
            <p className="max-w-[16rem] text-center text-sm italic text-slate-400">
              {centerNote[phase]}
            </p>
          )}
        </div>
        <div className="flex w-full max-w-full flex-col items-center gap-4">
          {phase === "passing" ? (
            <passingForm.Root>
              <HandRow
                handSurface={handSurface}
                hand={view.hand}
                mode={handMode}
                isMyTurn={isMyTurn}
                recipientName={recipientName}
                passAction={passAction}
              />
              <HeartsInteractionRoutes handSurface={handSurface} />
            </passingForm.Root>
          ) : (
            <>
              <HandRow
                handSurface={handSurface}
                hand={view.hand}
                mode={handMode}
                isMyTurn={isMyTurn}
                recipientName={recipientName}
                passAction={passAction}
              />
              <HeartsInteractionRoutes handSurface={handSurface} />
            </>
          )}
        </div>
      </section>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="flex flex-col gap-3">{playerList}</aside>
    </div>
  );
}
