/**
 * Typed adapter for joining static hex-board topology with a dynamic
 * per-space view overlay. Use this to feed `HexGrid` a single board
 * value whose tiles carry both static geometry (`q`, `r`, `id`) and
 * the projected view fields the UI cares about (e.g. `terrain`,
 * `numberToken`).
 *
 * The runtime is intentionally strict: every static space must have
 * exactly one overlay, duplicates throw, and overlays for ids that
 * are not on the board throw. There is no relaxed fallback in v1 —
 * silent merge bugs are far more expensive than a loud throw at
 * dev/CI time.
 */

import type {
  AnyHexBoardInput,
  BoardIdOf,
  BoardSpaceIdOf,
  NormalizedHexTileOf,
} from "../../types/tiled-board.js";
import { normalizeHexBoardInput } from "../../types/tiled-board.js";

/**
 * Per-tile result produced by {@link createHexBoardView}. Each tile
 * carries the static topology (`id`, `q`, `r`) plus the matched
 * overlay row in `view`.
 *
 * Static board fields/properties are preserved from `TBoard`.
 * Consumers should use `tile.properties` for authored static space
 * fields and `tile.view` for dynamic per-space projection data.
 */
export type HexBoardViewTile<
  TBoard extends AnyHexBoardInput,
  TSpaceView extends { id: BoardSpaceIdOf<TBoard> },
> = Omit<NormalizedHexTileOf<TBoard>, "view"> & { view: TSpaceView };

/**
 * Result of {@link createHexBoardView}. Shaped like an authored hex
 * board so it can be passed straight to `<HexGrid board={...} />`
 * without any further adapter work.
 *
 * The type-level board id and space id are preserved from `TBoard`,
 * so `tile.id` stays narrow inside `renderTile`. `tile.view` is the
 * authored overlay row, fully typed.
 */
export interface HexBoardView<
  TBoard extends AnyHexBoardInput,
  TSpaceView extends { id: BoardSpaceIdOf<TBoard> },
> {
  id: BoardIdOf<TBoard>;
  layout?: "hex";
  orientation?: "pointy-top" | "flat-top";
  tiles: ReadonlyArray<HexBoardViewTile<TBoard, TSpaceView>>;
  edges: TBoard["edges"];
  vertices: TBoard["vertices"];
}

interface CreateHexBoardViewOptions<TSpaceView> {
  spaces: readonly TSpaceView[];
}

/**
 * Join a static hex board topology with a dynamic per-space overlay.
 *
 * The result is suitable for direct use as the `board` prop on
 * `<HexGrid>`. Every overlay is enforced 1-to-1 against the board's
 * spaces:
 *
 *  - missing overlay for a board space → throws
 *  - duplicate overlay (same `id` twice) → throws
 *  - overlay `id` not present on the board → throws
 *
 * Each tile in the result carries a `view` field with the matched
 * overlay row.
 */
export function createHexBoardView<
  const TBoard extends AnyHexBoardInput,
  const TSpaceView extends { id: BoardSpaceIdOf<TBoard> },
>(
  board: TBoard,
  options: CreateHexBoardViewOptions<TSpaceView>,
): HexBoardView<TBoard, TSpaceView> {
  const overlayById = new Map<string, TSpaceView>();
  for (const overlay of options.spaces) {
    if (overlayById.has(overlay.id)) {
      throw new Error(
        `createHexBoardView: duplicate overlay for space '${overlay.id}'.`,
      );
    }
    overlayById.set(overlay.id, overlay);
  }

  const consumed = new Set<string>();
  const normalizedBoard = normalizeHexBoardInput(board);
  const tiles: Array<HexBoardViewTile<TBoard, TSpaceView>> =
    normalizedBoard.tiles.map((tile) => {
      const overlay = overlayById.get(tile.id);
      if (!overlay) {
        throw new Error(
          `createHexBoardView: missing overlay for space '${tile.id}'.`,
        );
      }
      consumed.add(tile.id);
      return { ...tile, view: overlay };
    });

  for (const id of overlayById.keys()) {
    if (!consumed.has(id)) {
      throw new Error(
        `createHexBoardView: overlay '${id}' is not on the board.`,
      );
    }
  }

  return {
    id: normalizedBoard.id,
    layout: "hex",
    orientation: board.orientation,
    tiles,
    edges: board.edges,
    vertices: board.vertices,
  };
}
