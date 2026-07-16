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
