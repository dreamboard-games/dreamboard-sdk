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
  const layout = game.boards.get("frontier")?.getLayout({ hexSize: 40 });
  return layout?.getSpaces().filter((space) => space.getIsSelected()) ?? [];
}
```

The snippet reads after frames arrive; no board exists before the first snapshot.
Target handlers accept an optional interaction key to resolve ambiguity. Generic
boards expose data but reject spatial layout requests.

## Hand, drag and viewport

| Object                | Data                              | Getters                                                          | Handlers                                                                                                       |
| --------------------- | --------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Zone with handFeature | Existing zone data                | `getSortedCardIds`, `getSelectedCardIds`, `getSelectableCardIds` | Canonical card selection                                                                                       |
| Card with dragFeature | Existing card data                | `getDragProps({ interaction? })`                                 | Returned `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, `onLostPointerCapture`, `onClick` |
| `game.drag`           | `active` (cardId, offset, target) | `getDropTargets`                                                 | `setDropTarget`, `cancel`                                                                                      |
| `game.viewport`       | `transform` (x, y, scale)         | `getTransform`, `getProps`                                       | `setTransform`, `reset`; props provide pointer handlers and `onWheel`                                          |

`handFeature(core, { sort? })` sorts projected card objects only.
`dragFeature(core, context)` owns a local pointer session and atomically routes
card plus drop target through canonical drafts. `DropTarget` includes kind, id,
boardId and interaction; `DragState` records the active card and offset.
`panZoomFeature(core, context, { initial?, minScale?, maxScale? })` owns the viewport.
Native wheel listeners must be non-passive. SVG rendering must convert client
coordinates to user coordinates; the copied BoardTargets demonstrates this.

Custom features return root/interaction/input/zone/card/board prototype objects
and optional dispose. FeatureContext provides board construction, target routing,
atomic card-drop routing and invalidate. Keep domain legality at its canonical
owner. Local pointer state must reset across source/seat lifetimes; final dispose
releases capture/subscriptions. Rendering, wheel listener options, coordinate
conversion and optional animation belong to the caller.
