/**
 * State composition primitives.
 *
 * `pipe` threads a seed state through a sequence of `State -> State`
 * transformations, left to right. It is the preferred way to compose curried
 * writers (the `ops.*` namespace) in reducers:
 *
 *     return accept(
 *       pipe(state,
 *         ops.spendPlayerResources({ playerId, resources: cost }),
 *         ops.placePieceOnVertex({ boardId, vertexId, pieceId, ownerId: playerId }),
 *       ),
 *     );
 */
/**
 * A state-preserving transformation.
 *
 * `Op<State>` is polymorphic in the exact input subtype — given a state `S`
 * that extends `State`, it returns the same `S`. This lets curried writers
 * from `ops.*` and author-written helpers thread through phase-scoped `pipe`
 * calls without losing the narrowed phase state type.
 */
export type Op<State> = <S extends State>(state: S) => S;

export function pipe<State>(
  state: State,
  ...ops: ReadonlyArray<Op<NoInfer<State>>>
): State {
  let result = state;
  for (const op of ops) {
    result = op(result);
  }
  return result;
}
