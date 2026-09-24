import { createRoot } from "react-dom/client";
import { createDevelopmentSource } from "./development-source";
import { useGame } from "./game";
import { GameShell } from "./shell";
import { ScenarioControls } from "./components/dreamboard/scenario-controls";
import { Inspector } from "./components/dreamboard/inspector";
import "./style.css";

const source = await createDevelopmentSource(
  new URLSearchParams(location.search),
);
function DevelopmentControls() {
  const snapshot = useGame((game) => game.snapshot);
  if (!snapshot) return null;
  return (
    <aside
      aria-label="Local development"
      className="grid gap-2 border-b border-slate-300 bg-white p-3"
    >
      <ScenarioControls
        scenarios={["complete", "setup"]}
        players={snapshot.players}
        me={snapshot.me}
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
    <DevelopmentControls />
  </GameShell>,
);
