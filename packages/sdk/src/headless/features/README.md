# Optional headless features

Factories are installed through `features: (game, context) => ({ ... })`.
They add no DOM, React, CSS dependencies, or executable game imports.

- `handFeature` adds zone helpers for sorted, selected, and selectable card IDs.
  Sorting reads projected data; core card handlers own selection and ambiguity.
- `boardFeature` adds `boards.get/getAll` and `board.getLayout`. Layout spaces,
  edges, and vertices expose captured eligibility/selection and native target
  props. Static metadata remains in `board.data` and each layout element's data.
  Hex geometry and IDs come from the shared honeycomb authority. Square cells
  use declared row/column coordinates; shared edges/vertices retain authored IDs.
  Square metadata with insufficient incidence to locate a unique line/corner
  (especially one-owner boundary entries) remains in `board.data` but is omitted
  from spatial layout. Generic boards expose data; `getLayout` reports that they
  have no spatial geometry. No sides, corners, or topology are guessed.
- `dragFeature` adds `card.getDragProps` and immutable `game.drag.active` state.
  Use the current drag's `getDropTargets()` and `setDropTarget()` with the
  renderer's hit test; native pointer capture means cross-element pointer-enter
  events are not a drop hit test. An accepted drop routes card and destination
  atomically through the core. Movement of five pixels distinguishes dragging
  from tapping; a drag without a valid target and pointer cancellation perform
  no selection.
  Drag props include a CSS translation and suppress the synthetic click after
  pointer completion while retaining keyboard activation.
- `panZoomFeature` adds immutable `game.viewport` state and native pointer/wheel
  props. Apply `viewport.getTransform()` through `board.getLayout({ hexSize,
viewport })` for transformed geometry and inverse `pointToSpace(x, y)`.
  Native wheel listeners must be non-passive when using these handlers.

Pointer gestures cancel and release capture when source/seat lifetime changes,
and on final instance disposal. Every import is safe without browser globals.
