# Overview

```ts
import { createGameInstance, iframeSource } from "@dreamboard-games/sdk";
import type definition from "../../../examples/reference-games/hearts/app/game";
export const game = createGameInstance<typeof definition>()({
  source: iframeSource(),
});
```

A hosted instance needs a game type and a selected-seat source, not executable game
code. Reducers define authoritative rules; the headless instance turns canonical
frames into immutable objects, local drafts and native event handlers. React is an
optional selector adapter. Registry components are editable application source.
