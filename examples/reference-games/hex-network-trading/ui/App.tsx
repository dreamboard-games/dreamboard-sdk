import { useGame, type GameView } from "./game";
import { Resources } from "./components/dreamboard/resources";
import { Players } from "./components/dreamboard/players";
import { Standings } from "./components/dreamboard/standings";
import { BoardTargets } from "./components/dreamboard/board-targets";
import { StormtrailInteractionRoutes } from "./interaction-routes";
import "./style.css";

const PLAYER_STYLE: Record<
  string,
  { label: string; color: string; pale: string }
> = {
  "player-1": {
    label: "Northwind",
    color: "#dc2626",
    pale: "#fee2e2",
  },
  "player-2": {
    label: "Riverstone",
    color: "#2563eb",
    pale: "#dbeafe",
  },
  "player-3": {
    label: "Sunmeadow",
    color: "#ca8a04",
    pale: "#fef9c3",
  },
};

const TERRAIN_STYLE = {
  pineForest: { label: "Pine Forest", icon: "🌲", fill: "#bbd4b4" },
  clayFlats: { label: "Clay Flats", icon: "🧱", fill: "#e6b59a" },
  grainFields: { label: "Grain Fields", icon: "🌾", fill: "#eadb8d" },
  barrens: { label: "Barrens", icon: "⛰️", fill: "#c9c3b7" },
} as const;

export function StormtrailBoard({ view }: { view: GameView }) {
  const hexById = new Map<string, GameView["hexes"][number]>(
    view.hexes.map((hex) => [hex.id, hex]),
  );
  const trails = new Map(Object.entries(view.trailsByEdgeId));
  const camps = new Map(Object.entries(view.campsByIntersectionId));
  return (
    <div
      className="h-[32rem] min-h-[26rem] overflow-hidden rounded-3xl border-2 border-stone-800 bg-[#eef2e4] shadow-[0_14px_35px_-18px_rgba(28,25,23,.75)]"
      data-stormtrail-board="frontier"
    >
      <BoardTargets
        boardId="frontier"
        hexSize={74}
        className="h-full max-w-none"
        label="Stormtrail frontier"
        renderSpace={(space) => {
          const hex = hexById.get(space.id);
          if (!hex) return null;
          const terrain = TERRAIN_STYLE[hex.terrain];
          return (
            <g data-stormtrail-hex={hex.id}>
              <polygon
                points={space
                  .points()
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
                fill={terrain.fill}
                stroke={
                  space.getIsSelected()
                    ? "#f59e0b"
                    : space.getIsSelectable()
                      ? "#78350f"
                      : "#44403c"
                }
                strokeWidth={space.getIsSelectable() ? 5 : 2.5}
                strokeLinejoin="round"
              />
              <g transform={space.transform}>
                <text y={-19} textAnchor="middle" fontSize={25}>
                  {terrain.icon}
                </text>
                <text
                  y={15}
                  textAnchor="middle"
                  fontSize={hex.number === null ? 10 : 20}
                  fontWeight={800}
                  fill="#292524"
                >
                  {hex.number ?? "BARRENS"}
                </text>
                <text y={34} textAnchor="middle" fontSize={8} fill="#57534e">
                  {terrain.label.toUpperCase()}
                </text>
                {view.banditsHexId === hex.id ? (
                  <text
                    y={-42}
                    textAnchor="middle"
                    fontSize={22}
                    aria-label="Bandits"
                  >
                    🥷
                  </text>
                ) : null}
              </g>
            </g>
          );
        }}
        renderEdge={(edge) => {
          const owner = trails.get(edge.id);
          return (
            <line
              x1={edge.line[0].x}
              y1={edge.line[0].y}
              x2={edge.line[1].x}
              y2={edge.line[1].y}
              stroke={
                owner
                  ? PLAYER_STYLE[owner]!.color
                  : edge.getIsSelected()
                    ? "#f59e0b"
                    : edge.getIsSelectable()
                      ? "#0f766e"
                      : "#78716c"
              }
              strokeWidth={owner || edge.getIsSelectable() ? 10 : 2}
              strokeLinecap="round"
              opacity={owner || edge.getIsSelectable() ? 1 : 0.35}
              data-trail-owner={owner}
            />
          );
        }}
        renderVertex={(vertex) => {
          const owner = camps.get(vertex.id);
          return owner ? (
            <g data-camp-owner={owner}>
              <circle
                cx={vertex.center.x}
                cy={vertex.center.y}
                r={13}
                fill={PLAYER_STYLE[owner]!.pale}
                stroke={PLAYER_STYLE[owner]!.color}
                strokeWidth={4}
              />
              <text
                x={vertex.center.x}
                y={vertex.center.y + 5}
                textAnchor="middle"
                fontSize={15}
              >
                ⛺
              </text>
            </g>
          ) : (
            <circle
              cx={vertex.center.x}
              cy={vertex.center.y}
              r={vertex.getIsSelectable() ? 14 : 3}
              fill={
                vertex.getIsSelected()
                  ? "#f59e0b"
                  : vertex.getIsSelectable()
                    ? "#fef3c7"
                    : "#78716c"
              }
              stroke={vertex.getIsSelectable() ? "#92400e" : "none"}
              strokeWidth={4}
            />
          );
        }}
      />
    </div>
  );
}

function Supplies({ view }: { view: GameView }) {
  const supply = [
    ["timber", "🌲", "Timber"],
    ["brick", "🧱", "Brick"],
    ["provisions", "🌾", "Provisions"],
  ] as const;
  return (
    <Resources
      aria-label="Your private supplies"
      resources={supply.map(([id, icon, label]) => ({
        id,
        icon,
        label,
        count: view.mySupplies[id],
      }))}
    />
  );
}

function Roster({ view }: { view: GameView }) {
  const players = useGame((game) => game.players.getAll());
  return (
    <Players
      aria-label="Expedition crews"
      className="stormtrail-players"
      players={players.map((player, index) => ({
        id: player.id,
        name: `${PLAYER_STYLE[player.id]!.label}${view.playerId === player.id ? " · you" : ""}`,
        seat: index === 0 ? 1 : index === 1 ? 2 : 3,
        status: view.activePlayerId === player.id ? "Active" : "Waiting",
        detail: `${view.supplyCountByPlayerId[player.id]} supplies · ${4 - view.remainingCampsByPlayerId[player.id]}/4 camps · ${10 - view.remainingTrailsByPlayerId[player.id]}/10 trails`,
      }))}
    />
  );
}

function PhaseSummary({ view }: { view: GameView }) {
  if (view.outcome)
    return view.outcome.reason.message ?? "The expedition is complete.";
  if (view.currentPhase === "discardBarrier") {
    return view.myDiscardRequired > 0
      ? `Return exactly ${view.myDiscardRequired} supplies.`
      : "Overloaded crews are returning supplies.";
  }
  if (view.currentPhase === "pendingTrade")
    return "A bilateral offer awaits one crew's response.";
  if (view.currentPhase === "moveBandits")
    return "The active crew must relocate the Bandits.";
  if (view.currentPhase === "roll")
    return "Roll both dice to begin production.";
  if (view.currentPhase === "main") return "Build, trade, or end the turn.";
  return "Place one camp-and-trail pair in seat order.";
}

function StormtrailGame() {
  const game = useGame();
  const view = game.view;
  if (!view) return <main role="status">Connecting to Stormtrail…</main>;
  const latestHistory = view.history.slice(-8).reverse();
  return (
    <main
      className="min-h-screen bg-[#e8e2d3] p-4 text-stone-900 sm:p-6"
      data-reference-game="hex-network-trading"
    >
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-4">
          <header className="rounded-3xl border-2 border-stone-800 bg-[#fffaf0] p-5 shadow-[5px_5px_0_#292524]">
            <p className="text-xs font-black uppercase tracking-[.22em] text-amber-800">
              Compact frontier strategy
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-4xl font-black tracking-tight">
                  Stormtrail
                </h1>
                <p
                  className="mt-1 text-sm text-stone-600"
                  data-reference-phase={view.currentPhase}
                >
                  {PhaseSummary({ view })}
                </p>
              </div>
              <div className="rounded-xl bg-stone-900 px-4 py-2 text-right text-stone-50">
                <span className="block text-xs uppercase tracking-wide">
                  Turn {view.turnNumber}
                </span>
                <strong className="block text-white">
                  {view.lastRoll
                    ? `${view.lastRoll.dice[0]} + ${view.lastRoll.dice[1]} = ${view.lastRoll.total}`
                    : "Awaiting roll"}
                </strong>
              </div>
            </div>
          </header>
          <StormtrailBoard view={view} />
          {view.outcome && (
            <Standings
              caption="Expedition outcome"
              scoreLabel="Result"
              standings={view.outcome.standings.map((row) => ({
                id: row.playerId,
                rank: row.rank,
                name: PLAYER_STYLE[row.playerId]!.label,
                score: row.rank === 1 ? "Winner" : "Complete",
              }))}
            />
          )}
        </div>

        <aside className="grid content-start gap-4">
          <section className="rounded-2xl border border-stone-300 bg-white p-3 shadow-sm">
            <h2 className="text-lg font-black">Available actions</h2>
            <div className="mt-2">
              <StormtrailInteractionRoutes />
            </div>
          </section>
          <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">Crews</h2>
            <div className="mt-3">
              <Roster view={view} />
            </div>
          </section>
          <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">Your supplies</h2>
            <p className="mb-3 text-xs text-stone-500">
              Only you can see this breakdown.
            </p>
            <Supplies view={view} />
          </section>
          {view.currentTrade ? (
            <section className="rounded-2xl border-2 border-sky-700 bg-sky-50 p-4">
              <h2 className="font-black">Pending offer</h2>
              <p className="mt-1 text-sm">
                {PLAYER_STYLE[view.currentTrade.offerorPlayerId]!.label} offers{" "}
                {JSON.stringify(view.currentTrade.give)} for{" "}
                {JSON.stringify(view.currentTrade.want)} from{" "}
                {PLAYER_STYLE[view.currentTrade.targetPlayerId]!.label}.
              </p>
            </section>
          ) : null}
          <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">Trail log</h2>
            <ol
              className="mt-2 max-h-72 space-y-2 overflow-auto text-sm"
              tabIndex={0}
              aria-label="Trail log"
              aria-live="polite"
            >
              {latestHistory.length === 0 ? (
                <li className="text-stone-500">Setup is beginning.</li>
              ) : (
                latestHistory.map((entry, index) => (
                  <li
                    key={`${entry.turn}-${entry.kind}-${index}`}
                    className="border-l-2 border-amber-700 pl-2"
                  >
                    <span className="font-bold">Turn {entry.turn}</span> ·{" "}
                    {entry.summary}
                  </li>
                ))
              )}
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}

export function App() {
  return <StormtrailGame />;
}

export default App;
