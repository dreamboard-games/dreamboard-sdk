# Interaction coverage

This binding renders the real template counter interaction and declares every
supported interaction key:

```tsx
import type { ComponentType, ReactElement } from "react";
import type { InteractionKey } from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
import type definition from "../../../templates/game/app/game";

export const coverage = {
  "play.increment": Counter,
} satisfies Record<InteractionKey<typeof definition>, ComponentType>;
export const { GameProvider, useGame } = createGameHook<typeof definition>()({
  coverage,
});

export function Counter(): ReactElement | null {
  const increment = useGame((game) => game.interactions.get("play.increment"));
  return increment ? (
    <button {...increment.getSubmitProps()}>Add one</button>
  ) : null;
}
```

Mount Counter inside GameProvider with a source. The renderer's actual
`interactions.get` call records observation. The coverage map checks supported
keys at compile time; component references alone do not mark interactions read.

In a test, render the provider and supported panels, wait for the frame to render,
then call `instance.assertCoverage()` on that provider's captured instance. An
available interaction that no rendered panel read must fail the assertion. Do not
call list/listAvailable solely to silence it: those methods deliberately count
as reading every returned interaction. Development warnings report each available
unread interaction once.
