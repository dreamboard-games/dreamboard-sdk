import type { PlayerView } from "../app/player-view";
import {
  Board,
  Game,
  UI,
  type BoardSurface,
  type GameView,
} from "../shared/generated/ui-contract";
import { LastLightInteractionRoutes } from "./interaction-routes";

type AppProps = {
  view?: PlayerView;
  onCharge?: () => void;
  onRepairBeacon?: (beaconId: string) => void;
  onReinforce?: () => void;
};

const useLastLightSurfaces = UI.defineSurfaces({
  beaconGrid: Board.surface("beacon-grid"),
});

const fallbackView: PlayerView = {
  currentPhase: "playerTurn",
  turnsRemaining: 8,
  energy: 5,
  storm: 0,
  reinforcement: false,
  beacons: [
    { id: "beacon-north", name: "North Beacon", level: 0, lit: false },
    { id: "beacon-harbor", name: "Harbor Beacon", level: 0, lit: false },
    { id: "beacon-south", name: "South Beacon", level: 0, lit: false },
  ],
  repairableBeaconIds: ["beacon-north", "beacon-harbor", "beacon-south"],
  weatherHistory: [],
  weatherRemaining: 8,
  events: [],
  completed: false,
  outcomeCode: null,
  outcome: null,
  activePlayerId: "player-1",
  playerId: "player-1",
  isActivePlayer: true,
};

const shellClass =
  "min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10";
const panelClass =
  "rounded-2xl border border-slate-700 bg-slate-900/90 p-4 shadow-xl shadow-black/20";

function LastLightLayout({
  view,
  beaconGrid,
  onCharge,
  onRepairBeacon,
  onReinforce,
  runtime = false,
}: {
  view: PlayerView | GameView;
  beaconGrid?: BoardSurface<"beacon-grid">;
  onCharge?: () => void;
  onRepairBeacon?: (beaconId: string) => void;
  onReinforce?: () => void;
  runtime?: boolean;
}) {
  const canRepair = (beaconId: (typeof view.beacons)[number]["id"]) =>
    view.repairableBeaconIds.includes(beaconId);
  const beacons = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {view.beacons.map((beacon) => {
        const content = (
          <span className="flex w-full items-center justify-between gap-3">
            <span className="text-left">
              <strong className="block text-base">{beacon.name}</strong>
              <span className="text-xs text-slate-300">
                {beacon.lit ? "Fully lit" : "Needs repair"}
              </span>
            </span>
            <span
              aria-label={`${beacon.level} of 2 stages lit`}
              className="text-lg font-black text-amber-300"
            >
              {"●".repeat(beacon.level)}
              <span className="text-slate-600">
                {"○".repeat(2 - beacon.level)}
              </span>
            </span>
          </span>
        );

        if (beaconGrid) {
          return (
            <beaconGrid.Space
              key={beacon.id}
              value={beacon.id}
              data-beacon-cell={beacon.id}
              disabled={!canRepair(beacon.id)}
              className="min-h-20 rounded-xl border-2 border-slate-600 bg-slate-800 p-3 text-slate-100 transition enabled:hover:border-amber-300 enabled:focus-visible:outline enabled:focus-visible:outline-2 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-amber-300 disabled:opacity-60"
            >
              {content}
            </beaconGrid.Space>
          );
        }

        return (
          <button
            key={beacon.id}
            type="button"
            data-beacon-cell={beacon.id}
            disabled={!canRepair(beacon.id)}
            onClick={() => onRepairBeacon?.(beacon.id)}
            className="min-h-20 rounded-xl border-2 border-slate-600 bg-slate-800 p-3 text-slate-100 disabled:opacity-60"
          >
            {content}
          </button>
        );
      })}
    </div>
  );

  const latestWeather = view.weatherHistory[view.weatherHistory.length - 1];

  return (
    <main className={shellClass} data-reference-game="solo-countdown-puzzle">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-4">
          <header className={panelClass}>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              A solo lighthouse puzzle
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
              Last Light
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300" data-reference-phase={view.currentPhase}>
              {view.completed
                ? view.outcome?.reason.message ?? `Outcome: ${view.outcomeCode}`
                : "Relight every coastal beacon before the storm reaches the lighthouse or dawn arrives."}
            </p>
          </header>

          <section aria-label="Lighthouse status" className={panelClass}>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Status label="Turns to dawn" value={view.turnsRemaining} />
              <Status label="Energy" value={`${view.energy}/7`} />
              <Status label="Storm" value={`${view.storm}/6`} danger />
              <Status
                label="Sea wall"
                value={view.reinforcement ? "Reinforced" : "Exposed"}
              />
            </dl>
          </section>

          <section aria-labelledby="beacons-heading" className={panelClass}>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 id="beacons-heading" className="text-xl font-bold">
                  Coastal beacons
                </h2>
                <p className="text-sm text-slate-400">
                  Select a beacon, then confirm its one-energy repair.
                </p>
              </div>
              <span className="text-sm font-semibold text-amber-300">
                {view.beacons.filter(({ lit }) => lit).length}/3 lit
              </span>
            </div>
            {beaconGrid ? <beaconGrid.Root>{beacons}</beaconGrid.Root> : beacons}
          </section>

          <section aria-labelledby="actions-heading" className={panelClass}>
            <h2 id="actions-heading" className="text-xl font-bold">
              Keeper action
            </h2>
            <p className="mb-3 text-sm text-slate-400">
              Choose exactly one action. Weather and countdown then resolve automatically.
            </p>
            {runtime && beaconGrid ? (
              <LastLightInteractionRoutes beaconGrid={beaconGrid} />
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={onCharge} disabled={view.energy >= 7}>
                  Charge +2
                </button>
                <button type="button" disabled={view.energy < 1}>
                  Repair selected −1
                </button>
                <button
                  type="button"
                  onClick={onReinforce}
                  disabled={view.energy < 2 || view.reinforcement}
                >
                  Reinforce −2
                </button>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section aria-labelledby="weather-heading" className={panelClass}>
            <h2 id="weather-heading" className="text-xl font-bold">
              Weather front
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {view.weatherRemaining} hidden card{view.weatherRemaining === 1 ? "" : "s"} remain.
            </p>
            <ol className="mt-3 space-y-2" aria-label="Revealed weather">
              {view.weatherHistory.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-600 p-3 text-sm text-slate-400">
                  The first front has not reached shore.
                </li>
              ) : (
                view.weatherHistory.map((weather, index) => (
                  <li
                    key={weather.cardId}
                    className="flex justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm"
                  >
                    <span>Turn {index + 1}</span>
                    <strong>{weather.kind.replace(/-/g, " ")}</strong>
                  </li>
                ))
              )}
            </ol>
            {latestWeather ? (
              <p className="mt-3 text-xs text-slate-400" aria-live="polite">
                Latest: {latestWeather.kind.replace(/-/g, " ")}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="history-heading" className={panelClass}>
            <h2 id="history-heading" className="text-xl font-bold">
              Event history
            </h2>
            <ol className="mt-3 max-h-96 space-y-3 overflow-auto" aria-live="polite">
              {view.events.length === 0 ? (
                <li className="text-sm text-slate-400">No weather has resolved yet.</li>
              ) : (
                view.events.map((event, index) => (
                  <li
                    key={`${event.procedureId}-${index}`}
                    className="border-l-2 border-cyan-500 pl-3"
                  >
                    <strong className="block text-sm">{event.title}</strong>
                    <span className="block text-xs leading-5 text-slate-400">
                      {event.summary}
                    </span>
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

function Status({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-800 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className={`mt-1 text-xl font-black ${danger ? "text-rose-300" : "text-slate-100"}`}>
        {value}
      </dd>
    </div>
  );
}

export function App({
  view = fallbackView,
  onCharge,
  onRepairBeacon,
  onReinforce,
}: AppProps) {
  return (
    <LastLightLayout
      view={view}
      onCharge={onCharge}
      onRepairBeacon={onRepairBeacon}
      onReinforce={onReinforce}
    />
  );
}

function LastLightGame() {
  const { beaconGrid } = useLastLightSurfaces();
  return (
    <Game.Root>
      {(state) => (
        <LastLightLayout view={state.view} beaconGrid={beaconGrid} runtime />
      )}
    </Game.Root>
  );
}

export default function RuntimeApp() {
  return (
    <UI.Root>
      <LastLightGame />
    </UI.Root>
  );
}
