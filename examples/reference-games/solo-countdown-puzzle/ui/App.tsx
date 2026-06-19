import type { PlayerView } from "../app/player-view";
import {
  Board,
  Game,
  UI,
  type BoardSurface,
  type GameView,
} from "../shared/generated/ui-contract.ts";
import { SoloInteractionRoutes } from "./interaction-routes";

type AppProps = {
  view?: PlayerView;
  onRepairBeacon?: (beaconId: string) => void;
};

const useSoloSurfaces = UI.defineSurfaces({
  beaconGrid: Board.surface("beacon-grid"),
});

const fallbackView: PlayerView = {
  currentPhase: "playerTurn",
  turnsRemaining: 8,
  energy: 5,
  storm: 0,
  reinforcement: 0,
  beacons: [
    { id: "beacon-north", name: "North Beacon", level: 0, lit: false },
    { id: "beacon-harbor", name: "Harbor Beacon", level: 0, lit: false },
    { id: "beacon-south", name: "South Beacon", level: 0, lit: false },
  ],
  events: [],
  completed: false,
  outcomeCode: null,
  activePlayers: ["player-1"],
};

function SoloLayout({
  view,
  beaconGrid,
  onRepairBeacon,
  runtime = false,
}: {
  view: PlayerView | GameView;
  beaconGrid?: BoardSurface<"beacon-grid">;
  onRepairBeacon?: (beaconId: string) => void;
  runtime?: boolean;
}) {
  const beacons = (
    <div>
      {view.beacons.map((beacon) => {
        const content = (
          <>
            <span>{beacon.name}</span>
            <strong>{beacon.level}/2</strong>
          </>
        );

        if (beaconGrid) {
          return (
            <beaconGrid.Space
              key={beacon.id}
              value={beacon.id}
              className="min-h-11"
              style={{ minHeight: 44 }}
              data-beacon-cell={beacon.id}
              disabled={view.completed || view.energy <= 0}
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
            style={{ minHeight: 44 }}
            disabled={view.completed || view.energy <= 0}
            onClick={() => onRepairBeacon?.(beacon.id)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );

  return (
    <div data-reference-game="solo-countdown-puzzle">
      <header>
        <h1>Last Light</h1>
        <p data-reference-phase={view.currentPhase}>
          {view.completed
            ? `Outcome: ${view.outcomeCode}`
            : "Repair beacons before the storm and countdown end the watch."}
        </p>
      </header>

      <section aria-label="Status">
        <dl>
          <div>
            <dt>Turns</dt>
            <dd>{view.turnsRemaining}</dd>
          </div>
          <div>
            <dt>Energy</dt>
            <dd>{view.energy}</dd>
          </div>
          <div>
            <dt>Storm</dt>
            <dd>{view.storm}</dd>
          </div>
          <div>
            <dt>Reinforcement</dt>
            <dd>{view.reinforcement}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Beacon grid">
        {beaconGrid ? <beaconGrid.Root>{beacons}</beaconGrid.Root> : beacons}
      </section>

      <section aria-label="System events">
        <ol>
          {view.events.map((event, index) => (
            <li key={`${event.procedureId}-${index}`}>
              <strong>{event.title}</strong>
              <span>{event.summary}</span>
            </li>
          ))}
        </ol>
      </section>

      {runtime && beaconGrid ? (
        <section aria-label="Actions">
          <SoloInteractionRoutes beaconGrid={beaconGrid} />
        </section>
      ) : null}
    </div>
  );
}

export function App({ view = fallbackView, onRepairBeacon }: AppProps) {
  return <SoloLayout view={view} onRepairBeacon={onRepairBeacon} />;
}

function SoloGame() {
  const { beaconGrid } = useSoloSurfaces();

  return (
    <Game.Root>
      {(state) => (
        <SoloLayout view={state.view} beaconGrid={beaconGrid} runtime />
      )}
    </Game.Root>
  );
}

export default function RuntimeApp() {
  return (
    <UI.Root>
      <SoloGame />
    </UI.Root>
  );
}
