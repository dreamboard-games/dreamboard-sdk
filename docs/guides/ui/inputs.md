# Inputs and committed steps

```ts
import type { GameInstance } from "@dreamboard-games/sdk";
export function submitReady(game: GameInstance<unknown>, key: string) {
  const interaction = game.interactions.get(key);
  return interaction?.getIsReady() ? interaction.submit() : undefined;
}
```

Read current inputs through interaction.getInputs/getInput or game.inputs.get. setValue accepts unfinished local edits; getIsReady checks cardinality and domain. Native field/target/submit props provide matching disabled/data-disabled state. Show getStep().selected as saved data, never replay it into a later input. Defaults never imply a new user action. reset is local; cancel is server-authoritative, including a blocked current step. Inspect accepted:false results from programmatic submit/cancel.

For `many(choice(...))` and `formInput.choiceList(...)`, render each option with `input.getTargetProps(value)`. Clicking an option adds it to the array; clicking it again removes it. The option props disable ineligible choices and new choices once the maximum is reached, while selected options remain available for removal. `getIsReady()` stays false until the minimum is met. `setValue` can hold an unfinished array draft, and `clear()` returns to the projected default when one exists. The reducer still validates submitted values against its current state.
