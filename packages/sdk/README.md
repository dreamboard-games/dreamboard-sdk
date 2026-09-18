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

Author the game model and implementation together. The callback is
contextually typed from the manifest, state schemas, phases, and errors in the
first argument, so phase and interaction helpers do not need a separate
contract-wiring file.

```ts
import { z } from "zod";
import { defineGame } from "@dreamboard-games/sdk/reducer";
import {
  ids,
  manifestContract,
  setupProfiles,
} from "../shared/manifest-contract";

const publicStateSchema = z.object({
  currentPlayerId: ids.playerId.nullable(),
});
const playPhaseStateSchema = z.object({});

export default defineGame(
  {
    manifest: manifestContract,
    state: {
      public: publicStateSchema,
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: { play: playPhaseStateSchema },
    errors: {},
  },
  (game) => ({
    initial: {
      public: ({ playerIds }) => ({
        currentPlayerId: playerIds[0] ?? null,
      }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "play",
    setupProfiles: setupProfiles({ standard: {} }),
    phases: {
      play: game.phase("play").define({
        kind: "player",
        initialState: () => ({}),
        actor: ({ state }) => state.publicState.currentPlayerId,
        interactions: {},
      }),
    },
    views: {
      shared: game.emptyView(),
      player: game.emptyView(),
    },
  })),
);
```

New workspaces keep authored starter code in `app/game.ts` and `ui/App.tsx`.
Run the package-local `pnpm generate` command to refresh framework-owned
manifest and UI contracts; generated files are not authoring surfaces.
