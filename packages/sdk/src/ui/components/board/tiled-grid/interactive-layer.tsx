/**
 * Shared interactive target-layer rendering for HexGrid and SquareGrid.
 *
 * One `InteractiveTargetLayerGroup` covers the overlay `<g>` group, the
 * per-target render-state computation, hover/pointer wiring, click and
 * keyboard selection, and accessibility attributes that both grids used to
 * duplicate.
 *
 * Divergence inventory (each historical difference between the two grids is
 * an explicit prop — never silently unified):
 *
 * - `groupRole`: HexGrid renders its layer groups with `role="list"`;
 *   SquareGrid renders no role on the group.
 * - `groupAriaLabel`: HexGrid labels edge/vertex groups
 *   "Interactive edges/vertices for placement"; SquareGrid uses
 *   "Interactive edges/vertices".
 * - `spreadBrowserAttributes`: HexGrid spreads `state.browserAttributes`
 *   onto every target `<g>`; SquareGrid never does. This prop also selects
 *   the grid's original JSX attribute ordering (HexGrid: browser attrs,
 *   transform, role, className; SquareGrid: transform, className, role) so
 *   rendered attribute order stays byte-identical per grid.
 * - `selectMode`: how selection is dispatched.
 *   "render-state" (HexGrid) runs `void state.select?.()`, honoring
 *   `targetState(...).select` overrides; "layer-direct" (SquareGrid) runs
 *   `void layer.selectTargetId?.(targetId)` and ignores such overrides.
 * - Empty-layer gating (HexGrid skips the group when there are no targets;
 *   SquareGrid renders an empty group) stays with the caller, as does the
 *   grid-specific hit-area / default-fallback markup via
 *   `renderTargetContent`.
 */

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { handleKeyboardActivation } from "../interaction-accessibility.js";
import {
  interactiveTargetRenderState,
  isInteractiveTargetSelectable,
  type InteractiveTargetLayer,
  type InteractiveTargetRenderState,
} from "../target-layer.js";
import type { GridTargetHoverState } from "./use-grid-svg-frame.js";

export type InteractiveTargetSelectMode = "render-state" | "layer-direct";

export interface InteractiveTargetLayerGroupProps<TTarget> {
  layer: InteractiveTargetLayer;
  targets: ReadonlyArray<TTarget>;
  getTargetId: (target: TTarget) => string;
  /** Used in the per-target aria-label: `Select ${targetKind} ${id}`. */
  targetKind: "space" | "edge" | "vertex";
  groupClassName: string;
  groupAriaLabel: string;
  /** HexGrid passes "list"; SquareGrid leaves the group role unset. */
  groupRole?: "list";
  /**
   * HexGrid: true — `state.browserAttributes` are spread onto each target
   * `<g>` (and the HexGrid attribute order is used). SquareGrid: false.
   */
  spreadBrowserAttributes: boolean;
  /**
   * "render-state" (HexGrid): `void state.select?.()`.
   * "layer-direct" (SquareGrid): `void layer.selectTargetId?.(targetId)`.
   */
  selectMode: InteractiveTargetSelectMode;
  /** Hover state owned by `useGridSvgFrame` in the host grid. */
  hover: GridTargetHoverState;
  /** Optional per-target `transform` attribute (used by the space layers). */
  getTargetTransform?: (target: TTarget) => string;
  /** Grid-specific hit-area and visual content inside the target `<g>`. */
  renderTargetContent: (
    target: TTarget,
    state: InteractiveTargetRenderState,
    isSelectable: boolean,
  ) => ReactNode;
}

export function InteractiveTargetLayerGroup<TTarget>({
  layer,
  targets,
  getTargetId,
  targetKind,
  groupClassName,
  groupAriaLabel,
  groupRole,
  spreadBrowserAttributes,
  selectMode,
  hover,
  getTargetTransform,
  renderTargetContent,
}: InteractiveTargetLayerGroupProps<TTarget>) {
  const { hoveredTargetId, setHoveredTargetId } = hover;

  return (
    <g className={groupClassName} role={groupRole} aria-label={groupAriaLabel}>
      {targets.map((target) => {
        const targetId = getTargetId(target);
        const state = interactiveTargetRenderState(
          layer,
          targetId,
          hoveredTargetId === targetId,
        );
        const isSelectable = isInteractiveTargetSelectable(layer, state);
        const activate =
          selectMode === "render-state"
            ? () => {
                void state.select?.();
              }
            : () => {
                void layer.selectTargetId?.(targetId);
              };
        return spreadBrowserAttributes ? (
          // HexGrid markup variant: browserAttributes spread first, then
          // transform, role, className (preserves HexGrid's rendered
          // attribute order).
          <g
            key={targetId}
            {...state.browserAttributes}
            {...(getTargetTransform
              ? { transform: getTargetTransform(target) }
              : {})}
            role={isSelectable ? "button" : undefined}
            className={clsx(isSelectable && "cursor-pointer")}
            onPointerEnter={() => setHoveredTargetId(targetId)}
            onPointerLeave={() =>
              setHoveredTargetId((currentId) =>
                currentId === targetId ? null : currentId,
              )
            }
            onClick={isSelectable ? activate : undefined}
            onKeyDown={(event) =>
              handleKeyboardActivation(
                event,
                isSelectable ? activate : undefined,
              )
            }
            tabIndex={isSelectable ? 0 : undefined}
            aria-label={
              isSelectable ? `Select ${targetKind} ${targetId}` : undefined
            }
          >
            {renderTargetContent(target, state, isSelectable)}
          </g>
        ) : (
          // SquareGrid markup variant: no browserAttributes spread;
          // transform, className, role (preserves SquareGrid's rendered
          // attribute order).
          <g
            key={targetId}
            {...(getTargetTransform
              ? { transform: getTargetTransform(target) }
              : {})}
            onClick={isSelectable ? activate : undefined}
            onKeyDown={(event) =>
              handleKeyboardActivation(
                event,
                isSelectable ? activate : undefined,
              )
            }
            onPointerEnter={() => setHoveredTargetId(targetId)}
            onPointerLeave={() =>
              setHoveredTargetId((currentId) =>
                currentId === targetId ? null : currentId,
              )
            }
            className={clsx(isSelectable && "cursor-pointer")}
            role={isSelectable ? "button" : undefined}
            tabIndex={isSelectable ? 0 : undefined}
            aria-label={
              isSelectable ? `Select ${targetKind} ${targetId}` : undefined
            }
          >
            {renderTargetContent(target, state, isSelectable)}
          </g>
        );
      })}
    </g>
  );
}
