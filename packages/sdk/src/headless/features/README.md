# Optional headless features

Factories are installed through `features: (game, context) => ({ ... })`.
They add no DOM, React, CSS dependencies, or executable game imports.

- `handFeature` adds zone helpers for sorted, selected, and selectable card IDs.
  Sorting reads projected data; core card handlers own selection and ambiguity.
- `boardFeature` adds `boards.get/find/getAll`, `board.spaces`, and `board.getLayout`. Layout spaces,
  edges, and vertices expose captured eligibility/selection and native target
  props. Static metadata remains in `board.data` and each layout element's data.
  Hex geometry and IDs come from the shared honeycomb authority. Square cells
  use declared row/column coordinates; shared edges/vertices retain authored IDs.
  Square metadata with insufficient incidence to locate a unique line/corner
  (especially one-owner boundary entries) remains in `board.data` but is omitted
  from spatial layout. Generic boards expose semantic spaces with selection handlers; `getLayout` reports that they
  have no spatial geometry. No sides, corners, or topology are guessed.
- `dragFeature` adds immutable `game.drag.active` and semantic
  `getCanDrag`, `begin`, `getDropTargets`, `setDropTarget`, `drop`, and `cancel`.
  An accepted drop routes card and destination atomically through the core.
  Invalid destinations and cancellation perform no selection. New frames,
  source/seat changes, connection loss, and disposal cancel the operation.
  An interaction with a board input lands on the board; one without lands on an
  area that runs it. Gesture classification is `createGestureRecognizer`;
  browser listeners, hit-testing and the dragged copy belong to `/react`.
- `originsFeature` adds `card.getOrigin()`: the zone a card that arrived with
  the current frame left, or the one player who could act when it came from
  zones the seat's frame does not list. Visible cards are followed by id and
  hidden cards counted per zone. Pure fan geometry is `fanLayout` in
  `../fan.ts`; neither touches the DOM.
- `panZoomFeature` adds immutable `game.viewport` state and native pointer/wheel
  props. Apply `viewport.getTransform()` through `board.getLayout({ hexSize,
viewport })` for transformed geometry and inverse `pointToSpace(x, y)`.
  Native wheel listeners must be non-passive when using these handlers.

Pointer gestures cancel and release capture when source/seat lifetime changes,
and on final instance disposal. Every import is safe without browser globals.
