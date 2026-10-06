import type { InteractionKey } from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
import type game from "../app/game";

export const coverage = { "play.increment": Counter } satisfies Record<
  InteractionKey<typeof game>,
  typeof Counter
>;
export const { GameProvider, useGame, Subscribe } = createGameHook<
  typeof game
>()({});

export function Counter() {
  const view = useGame((game) => game.view);
  const increment = useGame((game) =>
    game.interactions
      .list()
      .find((interaction) => interaction.key === "play.increment"),
  );
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
