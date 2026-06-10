/**
 * Public surface of the card-drag modules.
 *
 * Re-exports exactly the names historically exported from
 * `../CardDragSurface.tsx`. Internal cross-module helpers (the drop-target
 * registry hook, the raw context object, overlay components and drag-state
 * shapes) are deliberately not re-exported here.
 */

export {
  CardDragSurface,
  type CardDragSurfaceProps,
} from "./CardDragSurface.js";
export {
  CardDropTargetView,
  type CardDropTargetViewProps,
} from "./CardDropTargetView.js";
export { useCardDragSurface } from "./use-drop-target-registry.js";
export type {
  CardDragSurfaceContextValue,
  CardDragSurfaceController,
  DragPhase,
} from "./types.js";
