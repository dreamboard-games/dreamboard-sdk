# Inputs and committed steps

```ts
import type { GameInstance } from "@dreamboard-games/sdk";
export function submitReady(game: GameInstance<unknown>, key: string) {
  const interaction = game.interactions.find(key);
  return interaction?.getIsReady() ? interaction.submit() : undefined;
}
```

Read current inputs through interaction.getInputs/getInput or game.inputs.get. setValue accepts unfinished local edits; getIsReady checks cardinality and domain. Native control/target/submit props provide matching disabled/data-disabled state. Show getStep().selected as saved data, never replay it into a later input. Defaults never imply a new user action. reset is local; cancel is server-authoritative, including a blocked current step. Inspect accepted:false results from programmatic submit/cancel.

For `many(choice(...))` and `formInput.choiceList(...)`, render each option with `input.getTargetProps(value)`. Clicking an option adds it to the array; clicking it again removes it. The option props disable ineligible choices and new choices once the maximum is reached, while selected options remain available for removal. `getIsReady()` stays false until the minimum is met. `setValue` can hold an unfinished array draft, and `clear()` returns to the projected default when one exists. The reducer still validates submitted values against its current state.

For a bound game, input keys, kinds, values, eligible targets, selection predicates, and
handlers retain the authoring types. `setValue` takes the complete input value;
`getSelectHandler` and `getTargetProps` take a member only for `many(...)` or a choice-list
collector. An ordinary array-valued form input still selects a complete array.
`getInputs()` and interaction lists preserve discriminated unions, so narrowing by `key`
retains the matching value type. Hidden cards similarly narrow by `hidden`: visible cards
have a non-null view, and hidden cards have `view: null`.

`many(collector, options)` removes the wrapped collector's static and dynamic defaults. The resulting input starts without a value; selections build its array draft.

For a descriptor-driven renderer, use `input.getControl()`. Its discriminated result pairs numeric/resource editors with `single` or `many` values and setters. Target controls contain bound option props, so rendering heterogeneous choices never widens the typed input's setter. `getFieldProps()` has been removed: one native scalar change event cannot represent every input domain and cardinality.
