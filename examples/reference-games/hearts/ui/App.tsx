import {
  Game,
  Phase,
  UI,
  type PhaseName,
} from "../shared/generated/ui-contract.ts";
import { HeartsSurfaces } from "./components/game-ui";
import { useHeartsSurfaces } from "./surfaces";
import "./style.css";

function PhaseGameUI({ phase }: { phase: PhaseName }) {
  const surfaces = useHeartsSurfaces();

  return (
    <Game.Root>
      {(state) => <HeartsSurfaces phase={phase} state={state} {...surfaces} />}
    </Game.Root>
  );
}

function GameUI() {
  return (
    <Phase.Switch
      routes={{
        setup: () => <PhaseGameUI phase="setup" />,
        passing: () => <PhaseGameUI phase="passing" />,
        playing: () => <PhaseGameUI phase="playing" />,
        scoreHand: () => <PhaseGameUI phase="scoreHand" />,
        gameOver: () => <PhaseGameUI phase="gameOver" />,
      }}
    />
  );
}

export default function App() {
  return (
    <UI.Root>
      <GameUI />
    </UI.Root>
  );
}
