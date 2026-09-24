# Styling

```ts
import type { Card } from "@dreamboard-games/sdk";
export function cardAttributes(card: Card<unknown, {}>) {
  return card.getProps();
}
```

The SDK provides data and native props, not CSS. Compose card/target props onto semantic buttons; retain disabled and data-\* attributes. Install registry source for tokens, hand drawers, forms and board targets. Animation belongs to the app or copied registry code. Wheel zoom requires a non-passive native listener; SVG controls convert client coordinates through the screen CTM.
