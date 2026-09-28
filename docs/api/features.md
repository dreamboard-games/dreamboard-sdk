# Optional features

<!-- api: root handFeature -->
<!-- api: root boardFeature -->
<!-- api: root dragFeature -->
<!-- api: root panZoomFeature -->
<!-- api: root Feature -->
<!-- api: root FeatureContext -->
<!-- api: root Board -->
<!-- api: root BoardCollection -->
<!-- api: root BoardLayoutOptions -->
<!-- api: root HandOptions -->
<!-- api: root DropTarget -->
<!-- api: root DragState -->
<!-- api: root DragController -->
<!-- api: react BoardDropOptions -->
<!-- api: root ViewportTransform -->
<!-- api: root PanZoomOptions -->

Install factories in the instance or hook `features(core, context)` callback.
Their methods are additive at the root or domain objects; no `game.features`
namespace or global type merging is required. Disabled feature methods are absent
from the inferred type. Core and feature name collisions are rejected.

## Board objects

`Board`, `BoardCollection` and `BoardLayoutOptions` are exported types. The layout
and its targets are inferred from the enabled board feature; there are no separate
exported `BoardLayout` or `BoardTarget` constructors.

| Object       | Data                   | Getters                                                               | Handlers                 |
| ------------ | ---------------------- | --------------------------------------------------------------------- | ------------------------ |
| Board        | `id`, `game`, `data`   | `getLayout({ hexSize, origin?, viewport? })`                          | —                        |
| Layout       | `viewBox`              | `getSpaces`, `getEdges`, `getVertices`, `pointToSpace(x, y)`          | —                        |
| Every target | `id`, `data`, `center` | `getIsEligible`, `getIsSelectable`, `getIsSelected`, `getTargetProps` | `getSelectHandler`       |
| Space        | `transform`            | `points()`                                                            | Inherits target handlers |
| Edge         | `line`                 | Inherits target getters                                               | Inherits target handlers |
| Vertex       | Inherits target data   | Inherits target getters                                               | Inherits target handlers |

```ts
import {
  createGameInstance,
  iframeSource,
  boardFeature,
} from "@dreamboard-games/sdk";
import type definition from "../../examples/reference-games/hex-network-trading/app/game";
export const game = createGameInstance<typeof definition>()({
  source: iframeSource(),
  features: (core, context) => ({ board: boardFeature(core, context) }),
});
export function selectedSpaces() {
  const layout = game.boards.find("frontier")?.getLayout({ hexSize: 40 });
  return layout?.getSpaces().filter((space) => space.getIsSelected()) ?? [];
}
```

The snippet reads after frames arrive; no board exists before the first snapshot.
Target handlers accept correlated `interaction` and `input` options to resolve ambiguity.
All boards expose `board.spaces.get/find/getAll` with typed data and selection handlers.
Generic boards reject spatial layout requests; square and hex layouts reuse the semantic controls.

## Hand, drag and viewport

| Object                | Data                      | Getters                                                          | Handlers                                                     |
| --------------------- | ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Zone with handFeature | Existing zone data        | `getSortedCardIds`, `getSelectedCardIds`, `getSelectableCardIds` | Canonical card selection                                     |
| `game.drag`           | `active` (cardId, target) | `getCanDrag(cardId, options?)`, `getDropTargets()`               | `begin(cardId, options?)`, `setDropTarget`, `drop`, `cancel` |
| `game.viewport`       | `transform` (x, y, scale) | `getTransform`, `getProps`                                       | `setTransform`, `reset`; pointer and wheel props             |

`handFeature(core, { sort? })` sorts projected card objects only.
`dragFeature(core, context)` owns semantic drag state and atomically routes card
and destination into canonical drafts. Beginning or hovering never selects a card.
A drop without a valid destination and cancellation leave drafts untouched.
Frame, source, seat, or connection changes cancel the active drag.

`DropTarget<Game>` carries `interactionKey`, `cardInputKey`, `inputKey`, and a
board identity discriminated by `valueKind`. A `"board-id"` target has scalar
`value` and runtime `boardId`. A `"player-board-space"` target has a complete
`{ boardId, playerId, spaceId }` tuple in `value`. Its board ID is the base manifest
ID; no duplicate outer board ID is needed. Pass a resolved target through unchanged.

The React binding returns `useCardDrag(cardId, { interaction?, input? })` and
`useBoardDrop(targetOrNull, { containsPoint? })`. `GameProvider` installs dnd-kit
when `dragFeature` is enabled. The SDK includes dnd-kit; consumers do not configure
another drag provider. Its pointer sensor has a five-pixel activation distance,
and its keyboard sensor uses Space/Enter to pick up or drop, arrow keys to move
(Shift moves faster), and Escape to cancel. The library owns feedback, focus,
announcements, and browser cleanup. The headless root imports no browser code.

Use `useCardDrag`'s `ref` on the card wrapper and `handleRef` plus `handleProps` on
a dedicated drag button. Keep the normal card button's selection props. The hook
returns `canDrag` and `isDragging`; omit the handle when no card/drop route exists.
`useBoardDrop` returns `ref` and `isDropTarget`. Pass `null` until an eligible route
exists. `containsPoint` optionally refines rectangle hit testing with client-pixel
geometry. The registry uses SVG fill/stroke tests through the inverse screen CTM,
so zoom, pan, edges, and hexagonal corners retain their actual hit areas.

The copied `BoardTargets` accepts `dropRoute` with all three route keys when a
visual destination could serve multiple inputs. It disables ambiguous drops
until the renderer selects a route, instead of choosing the first input.

`panZoomFeature(core, context, { initial?, minScale?, maxScale? })` owns the viewport.
Native wheel listeners must be non-passive. SVG rendering must convert client
coordinates to user coordinates; the copied BoardTargets demonstrates this.

Custom features return root/interaction/input/zone/card/board prototype objects
and optional dispose. FeatureContext provides board construction, target routing,
atomic card-drop routing and invalidate. Keep domain legality at its canonical
owner. Local feature state resets across source/seat lifetimes; final dispose
releases subscriptions and browser gestures. Rendering, wheel listener options, coordinate
conversion and optional animation belong to the caller.
