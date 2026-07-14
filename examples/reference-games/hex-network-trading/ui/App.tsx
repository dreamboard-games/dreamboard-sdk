import {
  Board,
  Game,
  UI,
  type BoardSurface,
  type GameView,
} from "../shared/generated/ui-contract";
import { idGuards, type PlayerId } from "../shared/manifest-contract";
import { StormtrailInteractionRoutes } from "./interaction-routes";
import "./style.css";

const useStormtrailSurfaces = UI.defineSurfaces({
  frontier: Board.surface("frontier"),
});

const PLAYER_STYLE: Record<
  PlayerId,
  { label: string; color: string; pale: string }
> = {
  "player-1": { label: "Northwind", color: "#dc2626", pale: "#fee2e2" },
  "player-2": { label: "Riverstone", color: "#2563eb", pale: "#dbeafe" },
  "player-3": { label: "Sunmeadow", color: "#ca8a04", pale: "#fef9c3" },
};

const TERRAIN_STYLE = {
  pineForest: { label: "Pine Forest", icon: "🌲", fill: "#bbd4b4" },
  clayFlats: { label: "Clay Flats", icon: "🧱", fill: "#e6b59a" },
  grainFields: { label: "Grain Fields", icon: "🌾", fill: "#eadb8d" },
  barrens: { label: "Barrens", icon: "⛰️", fill: "#c9c3b7" },
} as const;

function StormtrailBoard({
  view,
  board,
}: {
  view: GameView;
  board: BoardSurface<"frontier">;
}) {
  const hexById = new Map(view.hexes.map((hex) => [hex.id, hex]));
  return (
    <div
      className="h-[32rem] min-h-[26rem] overflow-hidden rounded-3xl border-2 border-stone-800 bg-[#eef2e4] shadow-[0_14px_35px_-18px_rgba(28,25,23,.75)]"
      data-stormtrail-board="frontier"
    >
      <board.Root>
        <Board.HexGrid
          board="frontier"
          spaces={view.hexes}
          width="100%"
          height="100%"
          hexSize={74}
          enablePanZoom
          initialZoom={0.9}
          minZoom={0.65}
          maxZoom={1.35}
          interactiveEdgeSize={16}
          interactiveVertexSize={18}
          renderTile={(tile, geometry) => {
            const hex = idGuards.isSpaceId(tile.id)
              ? hexById.get(tile.id)
              : undefined;
            if (!hex) return null;
            const terrain = TERRAIN_STYLE[hex.terrain];
            return (
              <g data-stormtrail-hex={hex.id}>
                <polygon
                  points={geometry.points({ inset: 4 })}
                  fill={terrain.fill}
                  stroke="#44403c"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
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
            );
          }}
          renderEdge={(edge, position) => {
            const owner = idGuards.isEdgeId(edge.id)
              ? view.trailsByEdgeId[edge.id]
              : undefined;
            return (
              <line
                x1={position.x1}
                y1={position.y1}
                x2={position.x2}
                y2={position.y2}
                stroke={owner ? PLAYER_STYLE[owner].color : "#78716c"}
                strokeWidth={owner ? 8 : 2}
                strokeLinecap="round"
                opacity={owner ? 1 : 0.35}
                data-trail-owner={owner ?? undefined}
              />
            );
          }}
          renderVertex={(vertex, position) => {
            const owner = idGuards.isVertexId(vertex.id)
              ? view.campsByIntersectionId[vertex.id]
              : undefined;
            return owner ? (
              <g data-camp-owner={owner}>
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={13}
                  fill={PLAYER_STYLE[owner].pale}
                  stroke={PLAYER_STYLE[owner].color}
                  strokeWidth={4}
                />
                <text
                  x={position.x}
                  y={position.y + 5}
                  textAnchor="middle"
                  fontSize={15}
                >
                  ⛺
                </text>
              </g>
            ) : (
              <circle
                cx={position.x}
                cy={position.y}
                r={3}
                fill="#78716c"
                opacity={0.6}
              />
            );
          }}
          renderInteractiveSpace={(_space, state) =>
            state.selectable ? (
              <circle
                r={52}
                fill="none"
                stroke={state.hovered ? "#f59e0b" : "#78350f"}
                strokeWidth={state.hovered ? 5 : 3}
                strokeDasharray="8 6"
              />
            ) : null
          }
          renderInteractiveEdge={(_edge, position, state) =>
            state.selectable ? (
              <line
                x1={position.x1}
                y1={position.y1}
                x2={position.x2}
                y2={position.y2}
                stroke={state.hovered ? "#f59e0b" : "#0f766e"}
                strokeWidth={state.hovered ? 12 : 9}
                strokeLinecap="round"
                opacity={0.72}
              />
            ) : null
          }
          renderInteractiveVertex={(_vertex, position, state) =>
            state.selectable ? (
              <circle
                cx={position.x}
                cy={position.y}
                r={state.hovered ? 17 : 14}
                fill="#fef3c7"
                stroke="#92400e"
                strokeWidth={4}
              />
            ) : null
          }
        />
      </board.Root>
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
    <dl className="grid grid-cols-3 gap-2" aria-label="Your private supplies">
      {supply.map(([resourceId, icon, label]) => (
        <div
          key={resourceId}
          className="rounded-xl bg-stone-100 p-2 text-center"
        >
          <dt className="text-xs text-stone-600">
            {icon} {label}
          </dt>
          <dd className="text-xl font-black">{view.mySupplies[resourceId]}</dd>
        </div>
      ))}
    </dl>
  );
}

function Roster({ view }: { view: GameView }) {
  return (
    <div className="grid gap-2" aria-label="Expedition crews">
      {(Object.keys(PLAYER_STYLE) as PlayerId[]).map((playerId) => {
        const style = PLAYER_STYLE[playerId];
        const active = view.activePlayerId === playerId;
        return (
          <article
            key={playerId}
            className="rounded-xl border p-3"
            style={{
              borderColor: style.color,
              backgroundColor: active ? style.pale : "#fafaf9",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <strong>
                {style.label}
                {view.playerId === playerId ? " · you" : ""}
              </strong>
              <span className="text-xs font-bold uppercase tracking-wide">
                {active ? "Active" : "Waiting"}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-600">
              {view.supplyCountByPlayerId[playerId]} supplies ·{" "}
              {4 - view.remainingCampsByPlayerId[playerId]}/4 camps ·{" "}
              {10 - view.remainingTrailsByPlayerId[playerId]}/10 trails
            </p>
          </article>
        );
      })}
    </div>
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
  const { frontier } = useStormtrailSurfaces();
  return (
    <Game.Root>
      {(state) => {
        const view = state.view;
        const latestHistory = view.history.slice(-8).reverse();
        return (
          <main
            className="min-h-screen bg-[#e8e2d3] p-4 text-stone-900 sm:p-6"
            data-reference-game="hex-network-trading"
          >
            <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="grid gap-4">
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
                <StormtrailBoard view={view} board={frontier} />
              </div>

              <aside className="grid content-start gap-4">
                <section className="rounded-2xl border border-stone-300 bg-white p-3 shadow-sm">
                  <h2 className="text-lg font-black">Available actions</h2>
                  <div className="mt-2">
                    <StormtrailInteractionRoutes board={frontier} />
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
                      {PLAYER_STYLE[view.currentTrade.offerorPlayerId].label}{" "}
                      offers {JSON.stringify(view.currentTrade.give)} for{" "}
                      {JSON.stringify(view.currentTrade.want)} from{" "}
                      {PLAYER_STYLE[view.currentTrade.targetPlayerId].label}.
                    </p>
                  </section>
                ) : null}
                <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-black">Trail log</h2>
                  <ol
                    className="mt-2 max-h-72 space-y-2 overflow-auto text-sm"
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
      }}
    </Game.Root>
  );
}

export function App() {
  return <StormtrailGame />;
}

export default function RuntimeApp() {
  return (
    <UI.Root>
      <App />
    </UI.Root>
  );
}
