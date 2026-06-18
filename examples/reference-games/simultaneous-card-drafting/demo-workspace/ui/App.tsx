import { Game, Phase, UI, type PhaseName } from "#dreamboard/ui-contract";
import type { PlayerId } from "../shared/manifest-contract";
import { GameUI } from "./components/game-ui";
import { useSushiGoSurfaces } from "./surfaces";
import type { SushiGoSurfaceProps } from "./types";

function SushiGoSurfaces(props: SushiGoSurfaceProps) {
  const surfaces = useSushiGoSurfaces();

  return <GameUI {...props} {...surfaces} />;
}

function PhaseGameUI({ phase }: { phase: PhaseName }) {
  return (
    <Game.Root>
      {({ view, players, me, turn }) => (
        <SushiGoSurfaces
          view={view}
          players={players}
          me={{ playerId: me.playerId as PlayerId }}
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

function SushiGoGame() {
  return (
    <Phase.Switch
      routes={{
        setup: () => <PhaseGameUI phase="setup" />,
        drafting: () => <PhaseGameUI phase="drafting" />,
        scoreRound: () => <PhaseGameUI phase="scoreRound" />,
        gameOver: () => <PhaseGameUI phase="gameOver" />,
      }}
    />
  );
}

export default function App() {
  return (
    <UI.Root>
      <SushiGoGame />
    </UI.Root>
  );
}
