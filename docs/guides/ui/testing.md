# UI testing

```ts
import { createGameInstance } from "@dreamboard-games/sdk";
import { localSource } from "@dreamboard-games/sdk/testing";
import definition from "../../../examples/reference-games/hearts/app/game";
export const game = createGameInstance<typeof definition>()({
  source: await localSource(definition, { players: 4, seed: 1 }),
});
```

Use real local/scenario sources for gameplay and createTestSource for controlled ACK/frame ordering. Browser proofs operate actual buttons/cards and assert frames, not recorded command tapes. ScenarioControls supports seat switching and checkpoint JSON in local entries. The copied browser-game helper locates canonical DOM attributes. Hosted bundles must exclude executable reducer/testing imports.
