# Inputs and committed steps

```ts
import type { GameInstance } from "@dreamboard-games/sdk";
export function submitReady(game: GameInstance<unknown>, key: string) {
  const interaction = game.interactions.get(key);
  return interaction?.getIsReady() ? interaction.submit() : undefined;
}
```

Read current inputs through interaction.getInputs/getInput or game.inputs.get. setValue accepts unfinished local edits; getIsReady checks cardinality and domain. Native field/target/submit props provide matching disabled/data-disabled state. Show getStep().selected as saved data, never replay it into a later input. Defaults never imply a new user action. reset is local; cancel is server-authoritative, including a blocked current step. Inspect accepted:false results from programmatic submit/cancel.
