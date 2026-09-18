# @dreamboard-games/sdk

The public TypeScript SDK for authoring, testing, and rendering Dreamboard
games. Install this package rather than any of the repository's unpublished
workspace inputs.

```sh
pnpm add @dreamboard-games/sdk
```

The package's declarations and export map are the API authority. Supported
imports include the root module and explicit subpaths for authoring, runtime,
reducer contracts, testing, browser interaction, UI, and reference-game
metadata. Import only subpaths present in the installed package's `exports`
field.

```ts
import { DREAMBOARD_SDK_VERSION } from "@dreamboard-games/sdk";
import type { ReducerWire } from "@dreamboard-games/sdk/reducer-contract";
import {
  REFERENCE_GAME_MANIFEST_SCHEMA_VERSION,
  parseReferenceGameManifest,
  type ReferenceGameManifest,
} from "@dreamboard-games/sdk/reference-games";

const manifest: ReferenceGameManifest = parseReferenceGameManifest(input);
console.log(REFERENCE_GAME_MANIFEST_SCHEMA_VERSION, manifest.id);
```

Reference-game manifests use schema V5. They describe the game workspace,
teaching purpose, mechanics, UI patterns, and substantive rights metadata.

Include the packaged stylesheet when using SDK UI components:

```ts
import "@dreamboard-games/sdk/ui/plugin-styles.css";
```

## Game authoring

`createGame(model)` is the single authoring entry point. The **model** is a
plain object: manifest ids, state schemas, one Zod schema per phase, and error
codes. The returned value is three things at once:

- the **type leaf**: `typeof game.types.State`, `.ErrorCode`, `.PlayerId`,
  `.Queries`, `.Tx` (phantom carriers; reading them at runtime throws),
- the **factory namespace**: `game.phase(name)`, `phase.define`,
  `phase.interaction`, `phase.inputs.*`, `game.views.*`,
- the **assembler**: `game.assemble({ initial, initialPhase, phases, views })`.

Mutation callbacks (`enter`, `reduce`, `resolve`) receive an open transaction
`tx`. Mutate through it and finish with a bare `return` (accept), or with
`tx.transition(name)`, `tx.endGame(outcome)`, or `tx.reject(code)`. Events go
through `tx.emit(...)`. `state` is the read-only snapshot the callback started
from; `tx.state` is the current draft.

```ts
// app/game-model.ts — the model, bound once
import { z } from "zod";
import { createGame } from "@dreamboard-games/sdk/reducer";
import { ids, manifestContract } from "../shared/manifest-contract";

export const game = createGame({
  manifest: manifestContract,
  state: {
    public: z.object({ currentPlayerId: ids.playerId.nullable() }),
    private: z.object({}),
    hidden: z.object({}),
  },
  phases: {
    setup: z.object({}),
    play: z.object({ leadCardId: ids.cardId.nullable() }),
  },
  errors: { NOT_YOUR_CARD: "Play a card from your own hand." },
});

export type GameState = typeof game.types.State;
```

```ts
// app/phases/play.ts — one phase, one file
import { game } from "../game-model";

const play = game.phase("play");

// Inputs name their candidate domain and eligibility predicates directly.
// `where.errorCode` is checked against `model.errors`.
const ownCard = play.inputs.card({
  from: ["hand"],
  where: {
    id: "own-card",
    errorCode: "NOT_YOUR_CARD",
    test: ({ q, playerId, targetId }) =>
      q.zone.playerCards(playerId, "hand").includes(targetId),
  },
});

export default play.define({
  kind: "player",
  initialState: () => ({ leadCardId: null }),
  actor: ({ state }) => state.publicState.currentPlayerId,
  interactions: {
    playCard: play.interaction({
      inputs: { cardId: ownCard },
      reduce({ tx, input, q }) {
        // tx.state.phase.leadCardId and input.params.cardId are inferred.
        tx.moveCardFromPlayerZoneToSharedZone({
          playerId: input.playerId,
          fromZoneId: "hand",
          toZoneId: "trick",
          cardId: input.params.cardId,
        });
        tx.patchPhaseState({ leadCardId: input.params.cardId });
        const next = q.player.nextInOrder(input.playerId);
        if (next) tx.setActivePlayers([next]);
        if (q.zone.playerCards(input.playerId, "hand").length === 0) {
          return tx.transition("setup");
        }
      },
    }),
  },
});
```

```ts
// app/game.ts — assembly
import { game } from "./game-model";
import play from "./phases/play";
import setup from "./phases/setup";

export default game.assemble({
  initial: {
    public: ({ playerIds }) => ({ currentPlayerId: playerIds[0] ?? null }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  phases: { setup, play },
  views: {
    shared: game.views.empty(),
    player: game.views.player({
      project: ({ state, playerId, q }) => ({
        me: playerId,
        hand: q.zone.playerCards(playerId, "hand"),
        current: state.publicState.currentPlayerId,
      }),
    }),
  },
});
```

A missing, extra, or misspelled phase key fails to typecheck at `assemble`
or at `game.phase(name)`. Rules, views, and tests import `GameState` and
`typeof game.types.Tx` from the model module; nothing but the test harness
imports the assembled game, so there is no import cycle.

New workspaces keep authored starter code in `app/game.ts` and `ui/App.tsx`.
Run the package-local `pnpm generate` command to refresh framework-owned
manifest and UI contracts; generated files are not authoring surfaces.
