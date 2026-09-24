# Concepts

```ts
import { createGameInstance } from "@dreamboard-games/sdk";
import { localSource } from "@dreamboard-games/sdk/testing";
import definition from "../../../examples/reference-games/hearts/app/game";
export const game = createGameInstance<typeof definition>()({
  source: await localSource(definition, { players: 4, seed: 1 }),
});
```

The source owns authoritative selected-seat frames and request ordering. The
stable instance owns local drafts; its immutable snapshots own domain objects.
Captured getters retain their snapshot values. Handlers resolve current state
and reject use after their source/seat lifetime ends.

Ordinary inputs submit together. Each completed ordered step is saved on the
server, privately for its seat. A local reset clears a draft; cancel clears the
persisted prefix. Acceptance and the authoritative frame must both arrive before
an unchanged submitted draft is cleared.
