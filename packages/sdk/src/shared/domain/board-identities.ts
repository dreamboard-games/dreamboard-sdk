declare const boardIdentity: unique symbol;
export type HexEdgeId<BoardId extends string = string> =
  `${BoardId}:edge:${string}` & { readonly [boardIdentity]: "edge" };
export type HexVertexId<BoardId extends string = string> =
  `${BoardId}:vertex:${string}` & { readonly [boardIdentity]: "vertex" };
/** Shape membership is checked at runtime; explicit coordinates retain literals. */
export type HexSpaceId<Board> = Board extends { shape: infer Shape }
  ? Shape extends { coordinates: readonly (infer Coordinate)[] }
    ? Coordinate extends {
        q: infer Q extends number;
        r: infer R extends number;
      }
      ? HexCoordinateId<Board, `${Q},${R}`>
      : never
    : HexOverrideIds<Board> | `${number},${number}`
  : never;
type HexOverrideIds<Board> = Board extends { spaces: infer Spaces }
  ? {
      [Key in keyof Spaces]: Spaces[Key] extends { id: infer Id extends string }
        ? Id
        : Extract<Key, string>;
    }[keyof Spaces]
  : never;
type HexCoordinateId<Board, Key extends string> = Board extends {
  spaces: infer Spaces;
}
  ? Key extends keyof Spaces
    ? Spaces[Key] extends { id: infer Id extends string }
      ? Id
      : Key
    : Key
  : Key;
