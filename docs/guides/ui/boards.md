# Boards

```ts
import {
  createGameInstance,
  iframeSource,
  boardFeature,
} from "@dreamboard-games/sdk";
export const game = createGameInstance<unknown>()({
  source: iframeSource(),
  features: (core, context) => ({ board: boardFeature(core, context) }),
});
export const boards = game.boards.getAll();
```

Boards exist only with boardFeature enabled. Layout and hit testing use canonical materialized geometry; static metadata is not guessed from arbitrary view keys. Board controls route through current canonical inputs, with board identity and player-space values preserved. Generic boards are data-only; hex and square boards have layout support. The registry owns SVG rendering, touch areas and converting browser pixels into layout coordinates.
