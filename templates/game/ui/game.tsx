import { createGameHook } from "@dreamboard-games/sdk/react";
import type game from "../app/game";

export const { GameProvider, useGame, Subscribe } = createGameHook<
  typeof game
>()({
  coverage: { "play.increment": Counter },
});

export function Counter() {
  const view = useGame((game) => game.view);
  const increment = useGame((game) => game.interactions.get("play.increment"));
  if (!view) return <p>Connecting…</p>;
  return (
    <main>
      <h1>Counter</h1>
      <p>
        Count: <output>{view.count}</output>
      </p>
      {increment && <button {...increment.getSubmitProps()}>Add one</button>}
    </main>
  );
}
