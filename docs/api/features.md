# Optional features

<!-- api: root handFeature -->
<!-- api: root boardFeature -->
<!-- api: root dragFeature -->
<!-- api: root panZoomFeature -->
<!-- api: root originsFeature -->
<!-- api: root Feature -->
<!-- api: root FeatureContext -->
<!-- api: root Board -->
<!-- api: root BoardCollection -->
<!-- api: root BoardLayoutOptions -->
<!-- api: root HandOptions -->
<!-- api: root DropTarget -->
<!-- api: root BoardDropTarget -->
<!-- api: root InteractionDropTarget -->
<!-- api: root DragState -->
<!-- api: root DragController -->
<!-- api: root createGestureRecognizer -->
<!-- api: root GESTURE_THRESHOLDS -->
<!-- api: root GestureCallbacks -->
<!-- api: root GesturePointer -->
<!-- api: root GestureKind -->
<!-- api: root GestureRecognizer -->
<!-- api: root CardOrigin -->
<!-- api: root fanLayout -->
<!-- api: root liftFanCard -->
<!-- api: root FanOptions -->
<!-- api: root FanCard -->
<!-- api: root FanLayout -->
<!-- api: react CardGesture -->
<!-- api: react CardGestureProps -->
<!-- api: react DropArea -->
<!-- api: react DropAreaBinding -->
<!-- api: react DragOverlay -->
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

## Hand, drag, origins and viewport

| Object                   | Data                      | Getters                                                          | Handlers                                                     |
| ------------------------ | ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Zone with handFeature    | Existing zone data        | `getSortedCardIds`, `getSelectedCardIds`, `getSelectableCardIds` | Canonical card selection                                     |
| `game.drag`              | `active` (cardId, target) | `getCanDrag(cardId, options?)`, `getDropTargets()`               | `begin(cardId, options?)`, `setDropTarget`, `drop`, `cancel` |
| `game.viewport`          | `transform` (x, y, scale) | `getTransform`, `getProps`                                       | `setTransform`, `reset`; pointer and wheel props             |
| Card with originsFeature | Existing card data        | `getOrigin()`                                                    | —                                                            |

`handFeature(core, { sort? })` sorts projected card objects only.
`dragFeature(core, context)` owns semantic drag state and atomically routes card
and destination into canonical drafts. Beginning or hovering never selects a card.
A drop without a valid destination and cancellation leave drafts untouched.
Frame, source, seat, or connection changes cancel the active drag.

`DropTarget<Game>` is a `BoardDropTarget` or an `InteractionDropTarget`. An
interaction with a board input yields board targets; one without yields a single
`{ kind: "interaction", interactionKey, cardInputKey }` target per card input,
for an area that runs the interaction with the dropped card. Dropping on an area
adds the card and never toggles a many-card choice back out.

A `BoardDropTarget` carries `interactionKey`, `cardInputKey`, `inputKey`, and a
board identity discriminated by `valueKind`. A `"board-id"` target has scalar
`value` and runtime `boardId`. A `"player-board-space"` target has a complete
`{ boardId, playerId, spaceId }` tuple in `value`. Its board ID is the base manifest
ID; no duplicate outer board ID is needed. Pass a resolved target through unchanged.

The React binding returns `useCardGesture(cardId, { drag: false | { interaction?, input? } })`,
`useDropArea(binding)` and `useDragOverlay()`. `createGestureRecognizer`
classifies each press as a tap, hold, drag or browse using `GESTURE_THRESHOLDS`:
a mouse drags after 8 px in any direction and inspects after resting 250 ms; a
finger drags upward, browses sideways and inspects after holding 350 ms. Spread
`CardGesture.props` on the card's own button after its selection props. The
click that follows a hold, drag or browse is swallowed; keyboard clicks never are.

`useDropArea` accepts a board `DropTarget` or `{ interaction, input? }` and
returns `props`, `isEligible` and `isOver`. The browser's `elementsFromPoint`
finds the area under the pointer, so SVG, transformed and rotated areas need
no geometry. `useDragOverlay` returns the dragged card, a `ref` that keeps a
fixed copy under the pointer without rendering per move, and `settling` while a
submitted drop awaits its frame. See [Gestures](../guides/ui/gestures.md).

The copied `BoardTargets` accepts `dropRoute` with all three route keys when a
visual destination could serve multiple inputs. It disables ambiguous drops
until the renderer selects a route, instead of choosing the first input.

`originsFeature(core)` adds `card.getOrigin()`, a `CardOrigin` for a card that
arrived in its zone with the current frame: `{ zone, hidden }` for the zone it
left, or `{ player, hidden: true }` for the one player who could act when the
card came from zones the seat's frame does not list. Player origins require a
consecutive frame and one sole active player other than the seat. Hidden zone
origins are inferred from net counts; ambiguous sources or arriving positions
return `null`. It is also `null` on the first frame and after a seat or source
change. `fanLayout(FanOptions)`
returns a `FanLayout`: a `FanCard` (`x`, `y`, `rotate`) per card on a circular
arc, and the bounding `width` and `height`. `liftFanCard(card, distance)` moves
a card along its own tilt. See [Fans and card movement](../guides/ui/card-movement.md).

`panZoomFeature(core, context, { initial?, minScale?, maxScale? })` owns the viewport.
Native wheel listeners must be non-passive. SVG rendering must convert client
coordinates to user coordinates; the copied BoardTargets demonstrates this.

Custom features return root/interaction/input/zone/card/board prototype objects
and optional dispose. `FeatureContext.createBoard(data)` derives the board ID from its data. FeatureContext also provides target routing,
atomic card-drop routing and invalidate. Keep domain legality at its canonical
owner. Local feature state resets across source/seat lifetimes; final dispose
releases subscriptions and browser gestures. Rendering, wheel listener options, coordinate
conversion and optional animation belong to the caller.

Use `{ drag: false }` for inspection-only controls such as table cards. Use `{ drag: {} }` to discover eligible drop routes, or put `interaction` and `input` inside `drag` to restrict them. Drag support is explicit; hover and hold inspection remain available when dragging is disabled.
