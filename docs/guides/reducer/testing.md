# Reducer testing

```ts
import { localSource } from "@dreamboard-games/sdk/testing";
import definition from "../../../examples/reference-games/hearts/app/game";
const source = await localSource(definition, { players: 4, seed: 1 });
const saved = source.checkpoint();
source.restore(JSON.parse(JSON.stringify(saved)));
export const selected = source.inspect();
source.dispose();
```

Use typed scenarios and localSource/scenarioSource for real rule execution. Local checkpoints include authoritative hidden state: keep them in developer tooling. Restore validates external JSON and advances the source revision; it does not replay reducers to invent a checkpoint. Programmatic apply uses explicit scenario actors, while ordinary submit/cancel acts as the selected seat.

For compiled artifact verification, call `runCandidateVerification({ reducer: definition, bundle: compiledBundle, scenarios })` from `/testing`. The required bundle is the exact admitted production artifact: replay initializes, dispatches and projects through it. The authored definition supplies scenario schemas and inspection metadata, never a replacement execution bundle.
