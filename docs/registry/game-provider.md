# game-provider

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/game-provider
```

The game UI binding exports this `GameProvider`. It wraps the SDK provider with
internal card motion, so hands, draw piles and table destinations share reduced
motion, hand highlighting and confirmed draw release positions automatically.
Installing `hand` or `draw-pile` also installs this provider and its internal helper.

Configure the binding once in `ui/game.ts`:

```ts
import {
  handFeature,
  dragFeature,
  originsFeature,
} from "@dreamboard-games/sdk";
import type {
  Card,
  CoreInstance,
  FeatureContext,
  GameSnapshot,
  IdOf,
  InteractionKey as SDKInteractionKey,
  Player,
  SeatCardId,
  ViewOf,
} from "@dreamboard-games/sdk";
import type { CardGestureOptions } from "@dreamboard-games/sdk/react";
import { createGameHook } from "@dreamboard-games/sdk/react";
import type game from "../app/game";

export type Game = typeof game;
type Definition = typeof game;
function features(
  core: CoreInstance<Definition>,
  context: FeatureContext<Definition>,
) {
  return {
    hand: handFeature(core),
    drag: dragFeature(core, context),
    origins: originsFeature(core),
  };
}
type EnabledFeatures = ReturnType<typeof features>;
export type GameModel = GameSnapshot<Definition, EnabledFeatures>;
export type GameCard = Card<Definition, EnabledFeatures>;
export type CardId = SeatCardId<Definition>;
export type ZoneId = IdOf<Definition, "zoneId">;
export type GamePlayer = Player<Definition>;
export type GameView = ViewOf<Definition>;
export type InteractionKey = SDKInteractionKey<Definition>;
export type CardDrag = CardGestureOptions<Definition>["drag"];
export const {
  GameProvider: SDKGameProvider,
  useGame,
  useCardGesture,
  useCardRow,
  useActiveCard,
  useDropArea,
  useDragOverlay,
} = createGameHook<Game>()({
  features,
});
export { GameProvider } from "./components/dreamboard/game-provider";
```

Map `@game` to this binding. Application code uses the exported UI provider:

```tsx
import { GameProvider } from "./game";

<GameProvider source={source}>
  <GameTable />
</GameProvider>;
```

Provider props come directly from the binding's SDK provider. That provider keeps
ownership of the source, game instance and gesture session; the internal card
helper owns only presentation state. The SDK React integration has no Motion or
registry dependency. Games still own their layouts.

Draw hints contain source/destination zones and a rectangle, never a concealed
card ID. They expire after the next frame commit, including seat changes and
restores. The internal DOM scope uses `display: contents` and adds no layout box.
