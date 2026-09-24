# Custom features

```ts
import { createGameInstance, iframeSource } from "@dreamboard-games/sdk";
export const game = createGameInstance<unknown>()({
  source: iframeSource(),
  features: () => ({
    greeting: {
      root: {
        getGreeting() {
          return "Ready";
        },
      },
    },
  }),
});
game.getGreeting();
```

Features add root and interaction/input/card/zone/board prototype methods. Enabled methods appear in types; disabled methods are absent. Collisions are rejected rather than silently replacing core methods. FeatureContext supplies canonical target/drop routing and invalidation for real local feature state. Keep captured snapshot branches immutable; dispose releases owned resources. Do not add a second legality or draft engine.
