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
board ID; cross-board space targets carry one value with the canonical runtime
board ID and space ID. Card targets carry only their card value:

```ts
context.routeTarget(
  {
    kind: "space",
    valueKind: "board-id",
    boardId: board.id,
    value: "slot",
  },
  { interaction: "play.place", input: "space" },
);
```

The optional `interaction` and `input` select a specific route. Without sufficient
disambiguation, multiple eligible inputs raise `AmbiguousTargetError`. Resolved drop
targets retain `interactionKey`, `cardInputKey`, and `inputKey`; `routeCardDrop` revalidates
that exact route and writes the card and destination atomically. It never silently picks
the first card input. Pair-valued targets use `value` and have no redundant outer `boardId`. Obtain
`board.id` from the current board collection; never assemble an instance ID by
joining a base and player string.
