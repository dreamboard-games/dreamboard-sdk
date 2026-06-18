import { Game, Phase, UI, type PhaseName } from "#dreamboard/ui-contract";
import { ArtisansLayout } from "./components/game-ui";
import type { ArtisansSurfaceProps } from "./types";
import { useArtisansSurfaces } from "./surfaces";
import type { PlayerId } from "../shared/manifest-contract";

function ArtisansSurfaces(props: ArtisansSurfaceProps) {
  const surfaces = useArtisansSurfaces();

  return <ArtisansLayout {...props} {...surfaces} />;
}

function PhaseGameUI({ phase }: { phase: PhaseName }) {
  return (
    <Game.Root>
      {({ view, players, me, turn }) => (
        <ArtisansSurfaces
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

function GameUI() {
  return (
    <Phase.Switch
      routes={{
        setup: () => <PhaseGameUI phase="setup" />,
        wakeup: () => <PhaseGameUI phase="wakeup" />,
        placement: () => <PhaseGameUI phase="placement" />,
        cleanup: () => <PhaseGameUI phase="cleanup" />,
        scoring: () => <PhaseGameUI phase="scoring" />,
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
