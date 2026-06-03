import type { TrackPiece, TrackSpace } from "../components/board/TrackBoard.js";

interface GenericBoardSpaceLike<
  SpaceIdValue extends string = string,
  Fields = Record<string, unknown>,
> {
  id: SpaceIdValue;
  name?: string | null;
  typeId?: string | null;
  fields: Fields;
}

interface GenericBoardRelationLike<SpaceIdValue extends string = string> {
  fromSpaceId: SpaceIdValue;
  toSpaceId: SpaceIdValue;
  directed: boolean;
}

export interface GenericBoardLike<
  BoardIdValue extends string = string,
  SpaceIdValue extends string = string,
  SpaceFields = Record<string, unknown>,
> {
  id: BoardIdValue;
  spaces: Readonly<
    Record<SpaceIdValue, GenericBoardSpaceLike<SpaceIdValue, SpaceFields>>
  >;
  relations?: ReadonlyArray<GenericBoardRelationLike<SpaceIdValue>>;
}

export interface TrackBoardPieceLike<
  PieceIdValue extends string = string,
  SpaceIdValue extends string = string,
  OwnerIdValue extends string = string,
  Fields = unknown,
> {
  id: PieceIdValue;
  spaceId: SpaceIdValue;
  owner: OwnerIdValue;
  typeId?: string | null;
  fields?: Fields;
}

type BoardSpaceOf<TBoard extends GenericBoardLike> =
  TBoard["spaces"][keyof TBoard["spaces"]];
type SpaceIdOf<TBoard extends GenericBoardLike> =
  BoardSpaceOf<TBoard> extends {
    id: infer Id extends string;
  }
    ? Id
    : never;
type SpaceFieldsOf<TBoard extends GenericBoardLike> =
  BoardSpaceOf<TBoard> extends { fields: infer Fields } ? Fields : never;
type PieceIdOf<TPiece extends TrackBoardPieceLike> = TPiece extends {
  id: infer Id extends string;
}
  ? Id
  : never;
type PieceOwnerOf<TPiece extends TrackBoardPieceLike> = TPiece extends {
  owner: infer Owner extends string;
}
  ? Owner
  : never;
type PieceFieldsOf<TPiece extends TrackBoardPieceLike> = TPiece extends {
  fields?: infer Fields;
}
  ? Fields
  : never;

type TrackLayout =
  | {
      type: "linear";
      axis?: "x" | "y";
      spacing?: number;
      origin?: { x: number; y: number };
    }
  | {
      type: "circular";
      center: { x: number; y: number };
      radius: number;
      startAngleDeg?: number;
      clockwise?: boolean;
    };

type PositionOptions<TBoard extends GenericBoardLike> =
  | {
      getPosition: (
        space: BoardSpaceOf<TBoard>,
        index: number,
        spaces: ReadonlyArray<BoardSpaceOf<TBoard>>,
      ) => { x: number; y: number };
      layout?: never;
    }
  | {
      getPosition?: never;
      layout: TrackLayout;
    };

export type ToTrackBoardDataOptions<
  TBoard extends GenericBoardLike,
  TPiece extends TrackBoardPieceLike<
    string,
    SpaceIdOf<TBoard>,
    string,
    unknown
  >,
> = PositionOptions<TBoard> & {
  pieces?: readonly TPiece[];
  getNextSpaces?: (
    space: BoardSpaceOf<TBoard>,
    board: TBoard,
  ) => ReadonlyArray<SpaceIdOf<TBoard>> | undefined;
  getJumpTo?: (
    space: BoardSpaceOf<TBoard>,
    board: TBoard,
  ) => SpaceIdOf<TBoard> | undefined;
};

function positionForLayout(
  layout: TrackLayout,
  index: number,
  count: number,
): { x: number; y: number } {
  if (layout.type === "linear") {
    const spacing = layout.spacing ?? 72;
    const origin = layout.origin ?? { x: 0, y: 0 };
    return layout.axis === "y"
      ? { x: origin.x, y: origin.y + index * spacing }
      : { x: origin.x + index * spacing, y: origin.y };
  }

  const startAngleDeg = layout.startAngleDeg ?? -90;
  const clockwise = layout.clockwise ?? true;
  const angleStep = count === 0 ? 0 : 360 / count;
  const angleDeg = startAngleDeg + (clockwise ? 1 : -1) * angleStep * index;
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: layout.center.x + Math.cos(angle) * layout.radius,
    y: layout.center.y + Math.sin(angle) * layout.radius,
  };
}

function defaultNextSpaces<TBoard extends GenericBoardLike>(
  board: TBoard,
  spaceId: SpaceIdOf<TBoard>,
): Array<SpaceIdOf<TBoard>> {
  const relations = board.relations ?? [];
  return relations.flatMap((relation) => {
    if (relation.fromSpaceId === spaceId) {
      return [relation.toSpaceId];
    }
    if (!relation.directed && relation.toSpaceId === spaceId) {
      return [relation.fromSpaceId];
    }
    return [];
  }) as Array<SpaceIdOf<TBoard>>;
}

export function toTrackBoardData<
  TBoard extends GenericBoardLike,
  TPiece extends TrackBoardPieceLike<
    string,
    SpaceIdOf<TBoard>,
    string,
    unknown
  >,
>(
  board: TBoard,
  options: ToTrackBoardDataOptions<TBoard, TPiece>,
): {
  spaces: Array<TrackSpace<SpaceIdOf<TBoard>, SpaceFieldsOf<TBoard>>>;
  pieces: Array<
    TrackPiece<
      PieceIdOf<TPiece>,
      SpaceIdOf<TBoard>,
      PieceOwnerOf<TPiece>,
      PieceFieldsOf<TPiece>
    >
  >;
} {
  const spaces = Object.values(board.spaces) as Array<BoardSpaceOf<TBoard>>;
  const orderedSpaces = [...spaces].sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  return {
    spaces: orderedSpaces.map((space, index, allSpaces) => ({
      id: space.id as SpaceIdOf<TBoard>,
      index,
      name: space.name ?? undefined,
      type: space.typeId ?? undefined,
      nextSpaces: (options.getNextSpaces?.(space, board) ??
        defaultNextSpaces(board, space.id as SpaceIdOf<TBoard>)) as Array<
        SpaceIdOf<TBoard>
      >,
      jumpTo: options.getJumpTo?.(space, board),
      position:
        "getPosition" in options && options.getPosition
          ? options.getPosition(space, index, allSpaces)
          : positionForLayout(options.layout, index, allSpaces.length),
      data: space.fields as SpaceFieldsOf<TBoard>,
    })),
    pieces: (options.pieces ?? []).map((piece) => ({
      id: piece.id as PieceIdOf<TPiece>,
      spaceId: piece.spaceId,
      owner: piece.owner as PieceOwnerOf<TPiece>,
      type: piece.typeId ?? undefined,
      data: piece.fields as PieceFieldsOf<TPiece>,
    })),
  };
}
