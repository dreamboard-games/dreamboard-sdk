/**
 * Generated file.
 * Do not edit directly.
 */

import type { PerPlayer } from "@dreamboard-games/sdk/reducer";
import type {
  RuntimeCardData,
  RuntimeCardVisibility,
  RuntimeComponentLocation,
  RuntimeDieData,
  RuntimeHandVisibilityMode,
  RuntimePieceData,
  RuntimeRecord,
  RuntimeTableRecord,
} from "@dreamboard-games/sdk/reducer/advanced";
import { literals } from "./manifest-literals";

export type PlayerId = (typeof literals.playerIds)[number];
export type PhaseName = string;
export type BoardLayout = (typeof literals.boardLayouts)[number];
export type SetupOptionId = (typeof literals.setupOptionIds)[number];
export type SetupProfileId = (typeof literals.setupProfileIds)[number];
export type CardSetId = (typeof literals.cardSetIds)[number];
export type CardType = (typeof literals.cardTypes)[number];
export type CardId = (typeof literals.cardIds)[number];
export type DeckId = (typeof literals.deckIds)[number];
export type HandId = (typeof literals.handIds)[number];
export type SharedZoneId = (typeof literals.sharedZoneIds)[number];
export type PlayerZoneId = (typeof literals.playerZoneIds)[number];
export type ZoneId = (typeof literals.zoneIds)[number];
export type ResourceId = (typeof literals.resourceIds)[number];
export type PieceTypeId = (typeof literals.pieceTypeIds)[number];
export type PieceId = (typeof literals.pieceIds)[number];
export type DieTypeId = (typeof literals.dieTypeIds)[number];
export type DieId = (typeof literals.dieIds)[number];
export type BoardTypeId = (typeof literals.boardTypeIds)[number];
export type BoardBaseId = (typeof literals.boardBaseIds)[number];
export type BoardId = (typeof literals.boardIds)[number];
export type BoardContainerId = (typeof literals.boardContainerIds)[number];
export type RelationTypeId = (typeof literals.relationTypeIds)[number];
export type EdgeId = (typeof literals.edgeIds)[number];
export type EdgeTypeId = (typeof literals.edgeTypeIds)[number];
export type VertexId = (typeof literals.vertexIds)[number];
export type VertexTypeId = (typeof literals.vertexTypeIds)[number];
export type SpaceId = (typeof literals.spaceIds)[number];
export type SpaceTypeId = (typeof literals.spaceTypeIds)[number];

export type PlayingCardsCardProperties = {
  "suit": "clubs" | "diamonds" | "spades" | "hearts";
  "rank": "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
};

export type PlayingCardsCardId = "clubs-2" | "clubs-3" | "clubs-4" | "clubs-5" | "clubs-6" | "clubs-7" | "clubs-8" | "clubs-9" | "clubs-10" | "clubs-J" | "clubs-Q" | "clubs-K" | "clubs-A" | "diamonds-2" | "diamonds-3" | "diamonds-4" | "diamonds-5" | "diamonds-6" | "diamonds-7" | "diamonds-8" | "diamonds-9" | "diamonds-10" | "diamonds-J" | "diamonds-Q" | "diamonds-K" | "diamonds-A" | "spades-2" | "spades-3" | "spades-4" | "spades-5" | "spades-6" | "spades-7" | "spades-8" | "spades-9" | "spades-10" | "spades-J" | "spades-Q" | "spades-K" | "spades-A" | "hearts-2" | "hearts-3" | "hearts-4" | "hearts-5" | "hearts-6" | "hearts-7" | "hearts-8" | "hearts-9" | "hearts-10" | "hearts-J" | "hearts-Q" | "hearts-K" | "hearts-A";



export type BoardFieldsByBoardId = {

};

export type BoardSpaceFieldsByBoardId = {

};

export type BoardRelationFieldsByBoardId = {

};

export type BoardContainerFieldsByBoardId = {

};

export type HexEdgeFieldsByBoardId = Record<string, never>;

export type HexVertexFieldsByBoardId = Record<string, never>;

export type SquareEdgeFieldsByBoardId = Record<string, never>;

export type SquareVertexFieldsByBoardId = Record<string, never>;

export type TiledEdgeFieldsByBoardId = Record<string, never>;

export type TiledVertexFieldsByBoardId = Record<string, never>;

export type PieceFieldsByTypeId = Record<string, RuntimeRecord>;

export type DieFieldsByTypeId = Record<string, RuntimeRecord>;

export type CardProperties = PlayingCardsCardProperties;

export type CardState = Omit<RuntimeCardData, "id" | "cardSetId" | "cardType" | "properties"> & {
  id: CardId;
  cardSetId: CardSetId;
  cardType: CardType;
  properties: CardProperties;
};
export type CardStateById = Record<CardId, CardState>;
export type PieceStateById = Record<PieceId, RuntimePieceData>;
export type DieStateById = Record<DieId, RuntimeDieData>;
export type CardIdsBySharedZoneId = {
  "current-trick": Array<PlayingCardsCardId>;
  "discard": Array<PlayingCardsCardId>;
  "draw-pile": Array<PlayingCardsCardId>;
};
export type CardIdsByPlayerZoneId = {
  "hand": PerPlayer<Array<PlayingCardsCardId>>;
};
export type CardIdsByDeckId = CardIdsBySharedZoneId;
export type ComponentId = CardId | PieceId | DieId;

export interface BoardSpaceStateRecord<SpaceIdValue extends SpaceId = SpaceId, Fields = RuntimeRecord> {
  id: SpaceIdValue;
  name?: string | null;
  typeId?: SpaceTypeId | null;
  fields: Fields;
  zoneId?: string | null;
}
export interface BoardRelationStateRecord<SpaceIdValue extends SpaceId = SpaceId, Fields = RuntimeRecord> {
  id?: string | null;
  typeId: RelationTypeId;
  fromSpaceId: SpaceIdValue;
  toSpaceId: SpaceIdValue;
  directed: boolean;
  fields: Fields;
}
export interface BoardContainerStateRecord<SpaceIdValue extends SpaceId = SpaceId, ContainerIdValue extends BoardContainerId = BoardContainerId, Fields = RuntimeRecord> {
  id: ContainerIdValue;
  name: string;
  host: { type: "board" } | { type: "space"; spaceId: SpaceIdValue };
  allowedCardSetIds?: readonly CardSetId[];
  zoneId: string;
  fields: Fields;
}
export interface BoardStateRecordBase<BoardIdValue extends BoardId = BoardId, BoardFields = RuntimeRecord> {
  id: BoardIdValue;
  baseId: BoardBaseId;
  typeId?: BoardTypeId | null;
  scope: "shared" | "perPlayer";
  playerId?: PlayerId | null;
  templateId?: string | null;
  fields: BoardFields;
}
export interface GenericBoardStateRecord<BoardIdValue extends BoardId = BoardId, SpaceIdValue extends SpaceId = SpaceId, ContainerIdValue extends BoardContainerId = BoardContainerId, BoardFields = RuntimeRecord, SpaceFields = RuntimeRecord, RelationFields = RuntimeRecord, ContainerFields = RuntimeRecord> extends BoardStateRecordBase<BoardIdValue, BoardFields> {
  layout: "generic";
  spaces: Record<SpaceIdValue, BoardSpaceStateRecord<SpaceIdValue, SpaceFields>>;
  relations: Array<BoardRelationStateRecord<SpaceIdValue, RelationFields>>;
  containers: Record<ContainerIdValue, BoardContainerStateRecord<SpaceIdValue, ContainerIdValue, ContainerFields>>;
}
export interface HexSpaceStateRecord<SpaceIdValue extends SpaceId = SpaceId, Fields = RuntimeRecord> extends BoardSpaceStateRecord<SpaceIdValue, Fields> {
  q: number;
  r: number;
}
export interface SquareSpaceStateRecord<SpaceIdValue extends SpaceId = SpaceId, Fields = RuntimeRecord> extends BoardSpaceStateRecord<SpaceIdValue, Fields> {
  row: number;
  col: number;
}
export interface TiledEdgeStateRecord<SpaceIdValue extends SpaceId = SpaceId, EdgeIdValue extends EdgeId = EdgeId, Fields = RuntimeRecord> {
  id: EdgeIdValue;
  spaceIds: readonly SpaceIdValue[];
  typeId?: EdgeTypeId | null;
  label?: string | null;
  ownerId?: PlayerId | null;
  fields: Fields;
}
export interface TiledVertexStateRecord<SpaceIdValue extends SpaceId = SpaceId, VertexIdValue extends VertexId = VertexId, Fields = RuntimeRecord> {
  id: VertexIdValue;
  spaceIds: readonly SpaceIdValue[];
  typeId?: VertexTypeId | null;
  label?: string | null;
  ownerId?: PlayerId | null;
  fields: Fields;
}
export type HexEdgeStateRecord<SpaceIdValue extends SpaceId = SpaceId, EdgeIdValue extends EdgeId = EdgeId, Fields = RuntimeRecord> = TiledEdgeStateRecord<SpaceIdValue, EdgeIdValue, Fields>;
export type HexVertexStateRecord<SpaceIdValue extends SpaceId = SpaceId, VertexIdValue extends VertexId = VertexId, Fields = RuntimeRecord> = TiledVertexStateRecord<SpaceIdValue, VertexIdValue, Fields>;
export interface HexBoardStateRecord<BoardIdValue extends BoardId = BoardId, SpaceIdValue extends SpaceId = SpaceId, EdgeIdValue extends EdgeId = EdgeId, VertexIdValue extends VertexId = VertexId, BoardFields = RuntimeRecord, SpaceFields = RuntimeRecord, EdgeFields = RuntimeRecord, VertexFields = RuntimeRecord> extends BoardStateRecordBase<BoardIdValue, BoardFields> {
  layout: "hex";
  spaces: Record<SpaceIdValue, HexSpaceStateRecord<SpaceIdValue, SpaceFields>>;
  relations: Array<BoardRelationStateRecord<SpaceIdValue, RuntimeRecord>>;
  containers: Record<never, never>;
  orientation: "pointy-top" | "flat-top";
  edges: Array<HexEdgeStateRecord<SpaceIdValue, EdgeIdValue, EdgeFields>>;
  vertices: Array<HexVertexStateRecord<SpaceIdValue, VertexIdValue, VertexFields>>;
}
export interface SquareBoardStateRecord<BoardIdValue extends BoardId = BoardId, SpaceIdValue extends SpaceId = SpaceId, ContainerIdValue extends BoardContainerId = BoardContainerId, EdgeIdValue extends EdgeId = EdgeId, VertexIdValue extends VertexId = VertexId, BoardFields = RuntimeRecord, SpaceFields = RuntimeRecord, RelationFields = RuntimeRecord, ContainerFields = RuntimeRecord, EdgeFields = RuntimeRecord, VertexFields = RuntimeRecord> extends BoardStateRecordBase<BoardIdValue, BoardFields> {
  layout: "square";
  spaces: Record<SpaceIdValue, SquareSpaceStateRecord<SpaceIdValue, SpaceFields>>;
  relations: Array<BoardRelationStateRecord<SpaceIdValue, RelationFields>>;
  containers: Record<ContainerIdValue, BoardContainerStateRecord<SpaceIdValue, ContainerIdValue, ContainerFields>>;
  edges: Array<TiledEdgeStateRecord<SpaceIdValue, EdgeIdValue, EdgeFields>>;
  vertices: Array<TiledVertexStateRecord<SpaceIdValue, VertexIdValue, VertexFields>>;
}
export type BoardStateById = {

};
export type BoardState<BoardIdValue extends BoardId = BoardId> = BoardIdValue extends keyof BoardStateById ? BoardStateById[BoardIdValue] : never;
export type BoardFields<BoardIdValue extends BoardId = BoardId> = BoardIdValue extends keyof BoardFieldsByBoardId ? BoardFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type BoardSpaceState<BoardIdValue extends BoardId = BoardId> = BoardState<BoardIdValue> extends { spaces: Record<string, infer Space> } ? Space : never;
export type BoardSpaceFields<BoardIdValue extends BoardId = BoardId> = BoardIdValue extends keyof BoardSpaceFieldsByBoardId ? BoardSpaceFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type BoardRelationState<BoardIdValue extends BoardId = BoardId> = BoardState<BoardIdValue> extends { relations: Array<infer Relation> } ? Relation : never;
export type BoardRelationFields<BoardIdValue extends BoardId = BoardId> = BoardIdValue extends keyof BoardRelationFieldsByBoardId ? BoardRelationFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type BoardContainerState<BoardIdValue extends BoardId = BoardId> = BoardState<BoardIdValue> extends { containers: Record<string, infer Container> } ? Container : never;
export type BoardContainerFields<BoardIdValue extends BoardId = BoardId> = BoardIdValue extends keyof BoardContainerFieldsByBoardId ? BoardContainerFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type HexBoardStateById = {
  [BoardIdValue in keyof BoardStateById as BoardStateById[BoardIdValue] extends { layout: "hex" } ? BoardIdValue : never]: BoardStateById[BoardIdValue];
};
export type SquareBoardStateById = {
  [BoardIdValue in keyof BoardStateById as BoardStateById[BoardIdValue] extends { layout: "square" } ? BoardIdValue : never]: BoardStateById[BoardIdValue];
};
export type HexEdgeState<BoardIdValue extends BoardId = BoardId> = BoardState<BoardIdValue> extends { layout: "hex"; edges: Array<infer Edge> } ? Edge : never;
export type HexEdgeFields<BoardIdValue extends BoardId = BoardId> = BoardIdValue extends keyof HexEdgeFieldsByBoardId ? HexEdgeFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type HexVertexState<BoardIdValue extends BoardId = BoardId> = BoardState<BoardIdValue> extends { layout: "hex"; vertices: Array<infer Vertex> } ? Vertex : never;
export type HexVertexFields<BoardIdValue extends BoardId = BoardId> = BoardIdValue extends keyof HexVertexFieldsByBoardId ? HexVertexFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type SquareEdgeState<BoardIdValue extends BoardId = BoardId> = BoardState<BoardIdValue> extends { layout: "square"; edges: Array<infer Edge> } ? Edge : never;
export type SquareEdgeFields<BoardIdValue extends BoardId = BoardId> = BoardIdValue extends keyof SquareEdgeFieldsByBoardId ? SquareEdgeFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type SquareVertexState<BoardIdValue extends BoardId = BoardId> = BoardState<BoardIdValue> extends { layout: "square"; vertices: Array<infer Vertex> } ? Vertex : never;
export type SquareVertexFields<BoardIdValue extends BoardId = BoardId> = BoardIdValue extends keyof SquareVertexFieldsByBoardId ? SquareVertexFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type TiledBoardId = keyof TiledEdgeFieldsByBoardId | keyof TiledVertexFieldsByBoardId;
export type TiledEdgeState<BoardIdValue extends TiledBoardId = TiledBoardId> = BoardIdValue extends BoardId ? HexEdgeState<BoardIdValue> | SquareEdgeState<BoardIdValue> : never;
export type TiledEdgeFields<BoardIdValue extends TiledBoardId = TiledBoardId> = BoardIdValue extends keyof TiledEdgeFieldsByBoardId ? TiledEdgeFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type TiledVertexState<BoardIdValue extends TiledBoardId = TiledBoardId> = BoardIdValue extends BoardId ? HexVertexState<BoardIdValue> | SquareVertexState<BoardIdValue> : never;
export type TiledVertexFields<BoardIdValue extends TiledBoardId = TiledBoardId> = BoardIdValue extends keyof TiledVertexFieldsByBoardId ? TiledVertexFieldsByBoardId[BoardIdValue] : RuntimeRecord;
export type BoardStateRecord = BoardStateById[BoardId];

export type TableState = Omit<RuntimeTableRecord, "playerOrder" | "zones" | "decks" | "hands" | "handVisibility" | "cards" | "pieces" | "componentLocations" | "ownerOfCard" | "visibility" | "resources" | "boards" | "dice"> & {
  playerOrder: PlayerId[];
  zones: RuntimeTableRecord["zones"] & {
    visibility: Record<ZoneId, RuntimeHandVisibilityMode>;
    cardSetIdsByZoneId?: Record<ZoneId, readonly CardSetId[]>;
  };
  decks: CardIdsBySharedZoneId;
  hands: CardIdsByPlayerZoneId;
  handVisibility: Record<PlayerZoneId, RuntimeHandVisibilityMode>;
  cards: CardStateById;
  pieces: PieceStateById;
  componentLocations: Record<ComponentId, RuntimeComponentLocation>;
  ownerOfCard: Record<CardId, PlayerId | null>;
  visibility: Record<CardId, RuntimeCardVisibility>;
  resources: PerPlayer<Record<ResourceId, number>>;
  boards: {
    byId: BoardStateById;
    hex: HexBoardStateById;
    square: SquareBoardStateById;
    network: Record<string, RuntimeRecord>;
    track: Record<string, RuntimeRecord>;
  };
  dice: DieStateById;
};
