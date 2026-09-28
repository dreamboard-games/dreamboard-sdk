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

Target routing takes a discriminated identity. Scalar board targets include their runtime
board ID; player-space targets carry one tuple with the base board ID, player ID, and
space ID. Card targets carry only their card value:

```ts
context.routeTarget(
  {
    kind: "space",
    valueKind: "board-id",
    boardId: "mat:player-2",
    value: "slot",
  },
  { interaction: "play.place", input: "space" },
);
```

The optional `interaction` and `input` select a specific route. Without sufficient
disambiguation, multiple eligible inputs raise `AmbiguousTargetError`. Resolved drop
targets retain `interactionKey`, `cardInputKey`, and `inputKey`; `routeCardDrop` revalidates
that exact route and writes the card and destination atomically. It never silently picks
the first card input. Tuple targets use `value` and have no redundant outer `boardId`.
