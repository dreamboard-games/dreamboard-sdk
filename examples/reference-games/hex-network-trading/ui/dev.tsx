import { createRoot } from "react-dom/client";
import { localSource, scenarioSource } from "@dreamboard-games/sdk/testing";
import game from "../app/game";
import setup from "../test/scenarios/topology-and-setup.scenario";
import bandits from "../test/scenarios/bandits.scenario";
import depot from "../test/scenarios/depot-trades.scenario";
import production from "../test/scenarios/production.scenario";
import discard from "../test/scenarios/discard-barrier.scenario";
import trade from "../test/scenarios/bilateral-trade.scenario";
import complete from "../test/scenarios/complete-game.scenario";
import { ScenarioControls } from "./components/dreamboard/scenario-controls";
import { Inspector } from "./components/dreamboard/inspector";
import { useGame } from "./game";
import { GameShell } from "./shell";
import "./style.css";

const scenarios = {
  setup,
  bandits,
  depot,
  production,
  discard,
  trade,
  complete,
};
const params = new URLSearchParams(location.search);
const name = params.get("scenario");
const as = params.get("as") ?? "player-1";
const scenario = Object.entries(scenarios).find(([key]) => key === name)?.[1];
if (name && !scenario) throw new Error(`Unknown scenario '${name}'.`);
const source = scenario
  ? await scenarioSource(game, scenario, {
      as,
      ...(params.has("at") ? { at: params.get("at")! } : {}),
    })
  : await localSource(game, { players: 3, seed: 1, as });

function DevelopmentTools() {
  const state = useGame();
  return (
    <aside
      aria-label="Development tools"
      className="stormtrail-devtools border-b border-stone-400 bg-stone-100 p-3"
    >
      <ScenarioControls
        scenarios={Object.keys(scenarios)}
        players={source.inspect().players}
        me={state.me?.id ?? as}
        onSeatChange={(id) => source.switchSeat(id)}
        onCheckpoint={() => source.checkpoint()}
        onRestore={(checkpoint) => source.restore(checkpoint)}
      />
      <Inspector />
    </aside>
  );
}

createRoot(document.getElementById("root")!).render(
  <GameShell source={source}>
    <DevelopmentTools />
  </GameShell>,
);
