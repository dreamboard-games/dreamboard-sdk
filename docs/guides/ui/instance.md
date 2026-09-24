# Instance

```ts
import { createGameInstance, iframeSource } from "@dreamboard-games/sdk";
import type definition from "../../../examples/reference-games/hearts/app/game";
export const game = createGameInstance<typeof definition>()({
  source: iframeSource(),
});
```

The curried constructor retains the game type while inferring enabled features and source capabilities. Root identity is stable; getSnapshot/inspect return immutable selected-seat models. subscribe returns cleanup. dispose ends owned source and feature lifetimes. No executable game value is needed for hosted construction.
