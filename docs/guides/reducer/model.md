# Model

```ts
import { createGame } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
export const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
  },
  state: {
    public: z.object({ score: z.number() }),
    private: z.object({}),
    hidden: z.object({}),
  },
  phases: { play: z.object({}) },
});
```

Bind one model, then author phases with `model.phase(name)` and assemble the game. `model.types` provides compile-time State, Queries and Tx carriers; do not read phantom carriers at runtime. Ordinary records represent per-player values.
