export type PlayerId = string;
export type ResourceId = string;
export type CardId = string;
export type CardIdsByDeckId = Record<string, CardId[]>;
export type CardProperties = Record<string, unknown>;
export type EdgeTypeId = string;
export type VertexTypeId = string;
export type BoardId = string;
export type BoardBaseId = string;
export type PieceId = string;
export type PieceTypeId = string;
export type SpaceId = string;
export type SpaceTypeId = string;
export type DieId = string;

/**
 * Stub of the `PerPlayer<Value>` primitive emitted by the real
 * `@dreamboard-games/sdk/reducer` module. The SDK UI surface does not
 * depend on SDK reducer directly, so we mirror the structural shape here so
 * that view types can reference runtime-accurate per-player containers.
 */
export type PerPlayer<Value> = {
  readonly __perPlayer: true;
  readonly entries: ReadonlyArray<readonly [PlayerId, Value]>;
};

/**
 * Stub of the `BoardRef` discriminated union. Shared boards carry only a
 * `baseId`; per-player boards carry `baseId` plus the runtime `seat` that
 * scopes them. Matches the structural shape produced by the codegen.
 */
export type SharedBoardRef = {
  readonly baseId: BoardBaseId;
  readonly seat?: undefined;
};

export type PerPlayerBoardRef = {
  readonly baseId: BoardBaseId;
  readonly seat: PlayerId;
};

export type BoardRef = SharedBoardRef | PerPlayerBoardRef;
