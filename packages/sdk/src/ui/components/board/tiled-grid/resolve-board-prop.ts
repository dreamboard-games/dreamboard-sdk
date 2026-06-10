/**
 * Shared resolution of the two ways the tiled grids accept board data:
 * either a single `board` prop, or inline props describing the board
 * (generated `spaces` form vs authored `tiles`/`cells` form).
 *
 * Construction of the inline board stays with the caller because the grids
 * accept different field sets and synthesize different fallback ids
 * (`__hex-grid__` vs `__square-grid__`); this helper only owns the
 * `board`-prop-vs-inline-props dispatch both grids duplicated.
 */
export function resolveBoardProp<TBoard, TInlineProps extends object>(
  props: { board: TBoard } | TInlineProps,
  buildInlineBoard: (inlineProps: TInlineProps) => TBoard,
): TBoard {
  return "board" in props
    ? (props as { board: TBoard }).board
    : buildInlineBoard(props as TInlineProps);
}
