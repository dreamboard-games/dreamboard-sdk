import {
  Board,
  Game,
  UI,
  type BoardSurface,
  type GameView,
} from "../shared/generated/ui-contract";
import type { PlayerId, SpaceId } from "../shared/manifest-contract";
import { MosaicInteractionRoutes } from "./interaction-routes";
import "./style.css";

const useMosaicSurfaces = UI.defineSurfaces({
  actionBoard: Board.surface("action-board"),
});

const ACTION_SPACES = [
  { id: "timberYard", label: "Timber Yard", effect: "+2 wood", icon: "▥" },
  { id: "stoneYard", label: "Stone Yard", effect: "+2 stone", icon: "◆" },
  { id: "patronSquare", label: "Patron Square", effect: "+3 coin", icon: "●" },
  {
    id: "exchangeHouse",
    label: "Exchange House",
    effect: "Trade 1 or 2",
    icon: "⇄",
  },
  {
    id: "mosaicBench",
    label: "Mosaic Bench",
    effect: "Craft one item",
    icon: "✦",
  },
] as const;

const CELLS = [
  "cell-r0-c0",
  "cell-r0-c1",
  "cell-r0-c2",
  "cell-r1-c0",
  "cell-r1-c1",
  "cell-r1-c2",
] as const satisfies readonly SpaceId[];

const ITEM_LABELS = {
  timberFrame: { label: "Timber Frame", icon: "▥", prestige: 2 },
  stoneRelief: { label: "Stone Relief", icon: "◆", prestige: 3 },
  joinedMosaic: { label: "Joined Mosaic", icon: "✦", prestige: 4 },
} as const;

function seatLabel(playerId: PlayerId) {
  return playerId === "player-1" ? "Indigo Workshop" : "Saffron Workshop";
}

function WorkerToken({ workerId }: { workerId: string }) {
  const master = workerId.startsWith("master-");
  const playerTwo = workerId.includes("p2");
  return (
    <span
      className={`worker-token ${master ? "worker-master" : "worker-ordinary"} ${playerTwo ? "worker-saffron" : "worker-indigo"}`}
      title={workerId}
    >
      {master ? "M" : "W"}
    </span>
  );
}

function ActionBoard({
  view,
  surface,
}: {
  view: GameView;
  surface: BoardSurface<"action-board">;
}) {
  return (
    <surface.Root>
      <div className="action-board" data-mosaic-action-board="action-board">
        {ACTION_SPACES.map((space) => (
          <surface.Space
            key={space.id}
            value={space.id}
            className="action-space"
            data-action-space={space.id}
          >
            <span className="space-icon" aria-hidden="true">
              {space.icon}
            </span>
            <strong>{space.label}</strong>
            <span>{space.effect}</span>
            <span className="occupants" aria-label={`${space.label} workers`}>
              {(view.occupantsBySpace[space.id] ?? []).map((workerId) => (
                <WorkerToken key={workerId} workerId={workerId} />
              ))}
            </span>
          </surface.Space>
        ))}
      </div>
    </surface.Root>
  );
}

function Workshop({ view, playerId }: { view: GameView; playerId: PlayerId }) {
  const tableau = view.tableauByPlayer[playerId] ?? {};
  const resources = view.resourcesByPlayer[playerId];
  const score = view.runningScoreByPlayer[playerId];
  return (
    <article
      className={`workshop workshop-${playerId}`}
      data-workshop={playerId}
    >
      <header>
        <div>
          <p>{playerId === view.firstPlayerId ? "First player" : "Workshop"}</p>
          <h2>{seatLabel(playerId)}</h2>
        </div>
        <strong className="score-medallion">{score?.total ?? 0} PP</strong>
      </header>
      <div
        className="resources"
        aria-label={`${seatLabel(playerId)} resources`}
      >
        <span>▥ {resources?.wood ?? 0} wood</span>
        <span>◆ {resources?.stone ?? 0} stone</span>
        <span>● {resources?.coin ?? 0} coin</span>
      </div>
      <div className="tableau" aria-label={`${seatLabel(playerId)} mosaic`}>
        {CELLS.map((cellId) => {
          const item = tableau[cellId];
          return (
            <div
              className={`tableau-cell ${item ? "cell-filled" : ""}`}
              key={cellId}
              data-cell={cellId}
            >
              {item ? (
                <>
                  <span aria-hidden="true">{ITEM_LABELS[item].icon}</span>
                  <strong>{ITEM_LABELS[item].label}</strong>
                  <small>{ITEM_LABELS[item].prestige} Prestige</small>
                </>
              ) : (
                <span className="empty-cell">Empty</span>
              )}
            </div>
          );
        })}
      </div>
      <div
        className="worker-rack"
        aria-label={`${seatLabel(playerId)} workers`}
      >
        {(view.workersByPlayer[playerId] ?? []).map((worker) => (
          <span
            className={worker.location ? "worker-used" : ""}
            key={worker.id}
          >
            <WorkerToken workerId={worker.id} /> {worker.location ?? "ready"}
          </span>
        ))}
      </div>
    </article>
  );
}

function Outcome({ outcome }: { outcome: NonNullable<GameView["outcome"]> }) {
  return (
    <section className="outcome" aria-labelledby="outcome-heading">
      <p>Authoritative final scoring</p>
      <h2 id="outcome-heading">Four seasons complete</h2>
      <div className="standings">
        {outcome.standings.map((standing) => (
          <article key={standing.playerId}>
            <strong>
              Rank {standing.rank} · {standing.result}
            </strong>
            <span>
              {seatLabel(standing.playerId)} — {standing.score} Prestige
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function MosaicGame() {
  const { actionBoard } = useMosaicSurfaces();
  return (
    <Game.Root>
      {({ view }) => (
        <main
          className="mosaic-workshop"
          data-reference-game="worker-placement-tableau"
          data-reference-phase={view.currentPhase}
        >
          <header className="hero">
            <div>
              <p className="eyebrow">A four-season worker-placement duel</p>
              <h1>Mosaic Workshop</h1>
              <p>
                Gather materials, share crowded sites with masters, and join
                unlike pieces for Harmony Prestige.
              </p>
            </div>
            <div
              className="season-marker"
              aria-label={`Season ${view.season} of 4`}
            >
              <span>Season</span>
              <strong>{view.season}/4</strong>
            </div>
          </header>

          <section className="turn-banner" aria-live="polite">
            {view.activePlayerId
              ? `${seatLabel(view.activePlayerId)} places or passes.`
              : view.currentPhase === "gameOver"
                ? "Final Prestige published."
                : "The automatic workshop procedure is resolving."}
          </section>

          <div className="game-grid">
            <section className="board-panel">
              <div className="section-heading">
                <div>
                  <p>Five public sites</p>
                  <h2>Town workshop district</h2>
                </div>
                <span>
                  Ordinary workers need an empty site; masters may share one
                  ordinary.
                </span>
              </div>
              <ActionBoard view={view} surface={actionBoard} />
              <MosaicInteractionRoutes actionBoard={actionBoard} />
            </section>
            <aside className="season-log">
              <h2>Season record</h2>
              <ol>
                {view.events.length === 0 ? (
                  <li>The workshops open with four supplies each.</li>
                ) : null}
                {view.events.slice(-9).map((event, index) => (
                  <li key={`${event.kind}-${index}`}>
                    {event.kind.replace(/([A-Z])/g, " $1")}
                  </li>
                ))}
              </ol>
            </aside>
          </div>

          <section className="workshops">
            {view.playerIds.map((playerId) => (
              <Workshop key={playerId} view={view} playerId={playerId} />
            ))}
          </section>
          {view.outcome ? <Outcome outcome={view.outcome} /> : null}
        </main>
      )}
    </Game.Root>
  );
}

export default function App() {
  return (
    <UI.Root>
      <MosaicGame />
    </UI.Root>
  );
}
