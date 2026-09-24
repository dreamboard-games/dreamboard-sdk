# Quick start

This complete local module defines a two-seat counter with one action:

```ts
import { z } from "zod";
import { createGame } from "@dreamboard-games/sdk/reducer";
import { createGameInstance } from "@dreamboard-games/sdk";
import { localSource } from "@dreamboard-games/sdk/testing";

const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
  },
  state: {
    public: z.object({ count: z.number() }),
    private: z.object({}),
    hidden: z.object({}),
  },
  phases: { play: z.object({}) },
});
const play = model.phase("play");
const definition = model.assemble({
  initial: { public: () => ({ count: 0 }) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, state }) {
        tx.setActivePlayers([state.table.playerOrder[0]]);
      },
      interactions: {
        increment: play.interaction({
          inputs: {},
          reduce({ tx, state }) {
            tx.patchPublicState({ count: state.publicState.count + 1 });
          },
        }),
      },
    }),
  },
  view: ({ state }) => ({ count: state.publicState.count }),
});
const source = await localSource(definition, { players: 2, seed: 1 });
const game = createGameInstance<typeof definition>()({ source });
await game.interactions.get("play.increment")?.submit();
console.log(game.view);
game.dispose();
```

For hosted rendering, move the executable definition into the reducer entry and
replace `localSource` with `iframeSource`; import only its type in UI modules.
