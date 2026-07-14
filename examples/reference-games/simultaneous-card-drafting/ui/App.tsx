import { Game, UI } from "../shared/generated/ui-contract";
import { GameUI } from "./components/game-ui";
import { useLanternMarketSurfaces } from "./surfaces";
import "./style.css";

function LanternMarketGame() {
  const surfaces = useLanternMarketSurfaces();

  return (
    <Game.Root>{(state) => <GameUI {...state} {...surfaces} />}</Game.Root>
  );
}

export default function App() {
  return (
    <UI.Root>
      <LanternMarketGame />
    </UI.Root>
  );
}
