import { Game, Phase, UI } from "../shared/generated/ui-contract.ts";
import { GameUI } from "./components/game-ui";
import { useSketchbookSurfaces } from "./surfaces";
import "./style.css";

function PhaseGameUI({
  phase,
}: {
  phase: Parameters<typeof GameUI>[0]["phase"];
}) {
  const surfaces = useSketchbookSurfaces();

  return (
    <Game.Root>
      {({ view, players, turn }) => (
        <GameUI
          {...surfaces}
          view={view}
          players={players}
          turn={{
            isMine: turn.isMine,
            currentPlayerId: turn.currentPlayerId,
            order: turn.order,
          }}
          phase={phase}
        />
      )}
    </Game.Root>
  );
}

function SketchbookGame() {
  return (
    <Phase.Switch
      routes={{
        setup: () => <PhaseGameUI phase="setup" />,
        playerTurn: () => <PhaseGameUI phase="playerTurn" />,
        checkGameEnd: () => <PhaseGameUI phase="checkGameEnd" />,
        gameOver: () => <PhaseGameUI phase="gameOver" />,
      }}
    />
  );
}

export default function App() {
  return (
    <UI.Root>
      <SketchbookGame />
    </UI.Root>
  );
}
