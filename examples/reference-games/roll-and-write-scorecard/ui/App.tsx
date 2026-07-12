import {
  Board,
  Game,
  PlayerRoster,
  UI,
  type BoardSurface,
  type GameView,
} from "../shared/generated/ui-contract";
import type { SurveyMark } from "../app/game-contract";
import { CloudlineInteractionRoutes } from "./interaction-routes";

const useCloudlineSurfaces = UI.defineSurfaces({
  surveyGrid: Board.surface("survey-grid"),
});

function markLabel(mark: SurveyMark | undefined) {
  if (!mark) return "";
  if (mark.kind === "surveyed") return String(mark.rolledTotal);
  return "X";
}

function Scorecard({
  view,
  surveyGrid,
  playerId,
  interactive,
}: {
  view: GameView;
  surveyGrid: BoardSurface<"survey-grid">;
  playerId: GameView["playerIds"][number];
  interactive: boolean;
}) {
  const legal = new Set(interactive ? view.legalSpaceIds : []);
  const marks = view.marksByPlayer[playerId] ?? {};

  const grid = (
    <div
      className="grid w-full max-w-[360px] grid-cols-4 gap-2"
      data-scorecard-board="survey-grid"
      data-scorecard-player={playerId}
    >
      {view.cells.map((cell) => {
        const mark = marks[cell.id];
        const eligible = legal.has(cell.id);
        const className = `min-h-11 rounded-md border-2 p-1 text-center transition ${
          eligible
            ? "border-sky-700 bg-sky-50 shadow-[2px_2px_0_#0f172a]"
            : "border-slate-300 bg-white"
        } data-[selected=true]:bg-sky-200 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-70`;
        const content = (
          <>
            <span className="block text-xs font-semibold text-slate-500">
              {cell.target}
            </span>
            <span className="mt-1 block text-xl font-black text-slate-950">
              {markLabel(mark)}
            </span>
          </>
        );
        return interactive ? (
          <surveyGrid.Space
            key={cell.id}
            value={cell.id}
            className={className}
            style={{ minHeight: 44, minWidth: 44 }}
            data-scorecard-cell={cell.id}
            data-scorecard-mark={mark?.kind ?? "empty"}
          >
            {content}
          </surveyGrid.Space>
        ) : (
          <div
            key={cell.id}
            className={className}
            style={{ minHeight: 44, minWidth: 44 }}
            data-scorecard-cell={cell.id}
            data-scorecard-mark={mark?.kind ?? "empty"}
          >
            {content}
          </div>
        );
      })}
    </div>
  );

  return interactive ? <surveyGrid.Root>{grid}</surveyGrid.Root> : grid;
}

function CloudlineGame() {
  const { surveyGrid } = useCloudlineSurfaces();

  return (
    <Game.Root>
      {(state) => (
        <div
          className="min-h-screen bg-slate-100 p-4 text-slate-950"
          data-reference-game="roll-and-write-scorecard"
        >
          <section className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_280px]">
            <div className="grid gap-4">
              <header className="rounded-md border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0_#0f172a]">
                <p className="text-sm font-bold uppercase tracking-wide text-sky-700">
                  Cloudline Survey
                </p>
                <h1 className="text-3xl font-black">Survey grid</h1>
                <p
                  className="mt-2 text-sm text-slate-600"
                  data-reference-phase={state.view.currentPhase}
                >
                  {state.view.roll
                    ? `Round ${state.view.round}: ${state.view.roll.dice.join(
                        " + ",
                      )} = ${state.view.roll.total}`
                    : "Preparing the first seeded roll."}
                </p>
              </header>

              <div className="grid gap-4 md:grid-cols-2">
                {state.view.playerIds.map((playerId) => {
                  const isMe = playerId === state.me.playerId;
                  const isActive = playerId === state.view.activePlayerId;
                  return (
                    <section
                      key={playerId}
                      className="rounded-md border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0_#0f172a]"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-black">
                          Crew {state.view.playerIds.indexOf(playerId) + 1}
                          {isMe ? " (you)" : ""}
                        </h2>
                        <span className="rounded border border-slate-300 px-2 py-1 text-xs font-bold">
                          {state.view.outcome
                            ? "Complete"
                            : isActive
                              ? "Surveying"
                              : "Waiting"}
                        </span>
                      </div>
                      <Scorecard
                        view={state.view}
                        surveyGrid={surveyGrid}
                        playerId={playerId}
                        interactive={isMe && isActive}
                      />
                    </section>
                  );
                })}
              </div>
            </div>

            <aside className="grid content-start gap-4">
              <PlayerRoster.Root
                score={(playerId) =>
                  state.view.scores?.[playerId]?.total ??
                  Object.keys(state.view.marksByPlayer[playerId] ?? {}).length
                }
                scoreLabel={state.view.scores ? "score" : "marks"}
              >
                <section className="rounded-md border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0_#0f172a]">
                  <h2 className="text-lg font-black">Players</h2>
                  <PlayerRoster.List className="mt-3 grid gap-2">
                    {(player) => (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between rounded border border-slate-300 px-2 py-1 text-sm font-bold"
                      >
                        <PlayerRoster.Name player={player} />
                        <PlayerRoster.Score player={player} />
                      </div>
                    )}
                  </PlayerRoster.List>
                </section>
              </PlayerRoster.Root>

              {!state.view.outcome ? (
                <section className="rounded-md border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0_#0f172a]">
                  <h2 className="text-lg font-black">Action</h2>
                  <p className="mb-3 mt-1 text-sm text-slate-600">
                    Choose a highlighted cell, then submit the pending mark.
                  </p>
                  <CloudlineInteractionRoutes surveyGrid={surveyGrid} />
                </section>
              ) : null}

              {state.view.outcome ? (
                <section
                  className="rounded-md border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0_#0f172a]"
                  data-cloudline-outcome={state.view.outcome.reason.code}
                >
                  <h2 className="text-lg font-black">Final survey</h2>
                  <ol className="mt-3 grid gap-3">
                    {state.view.outcome.standings.map((standing) => (
                      <li
                        key={standing.playerId}
                        className="rounded border border-slate-300 p-2 text-sm"
                      >
                        <p className="font-black">
                          #{standing.rank} Crew{" "}
                          {state.view.playerIds.indexOf(standing.playerId) + 1}
                          {` — ${standing.score ?? 0} points`}
                        </p>
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          {(standing.scoreBreakdown ?? []).map((component) => (
                            <div key={component.id} className="contents">
                              <dt>{component.label}</dt>
                              <dd className="text-right font-bold">
                                {component.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </aside>
          </section>
        </div>
      )}
    </Game.Root>
  );
}

export default function App() {
  return (
    <UI.Root>
      <CloudlineGame />
    </UI.Root>
  );
}
