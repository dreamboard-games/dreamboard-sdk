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



export type SurveyGridBoardFields = RuntimeRecord;
export type SurveyGridSpaceFields = {
  "target": number;
};
export type SurveyGridRelationFields = RuntimeRecord;
export type SurveyGridContainerFields = RuntimeRecord;
export type SurveyGridEdgeFields = RuntimeRecord;
export type SurveyGridVertexFields = RuntimeRecord;
export type SurveyDieDieFields = RuntimeRecord;

export type BoardFieldsByBoardId = {
  "survey-grid:player-1": SurveyGridBoardFields;
  "survey-grid:player-2": SurveyGridBoardFields;
  "survey-grid:player-3": SurveyGridBoardFields;
  "survey-grid:player-4": SurveyGridBoardFields;
};

export type BoardSpaceFieldsByBoardId = {
  "survey-grid:player-1": SurveyGridSpaceFields;
  "survey-grid:player-2": SurveyGridSpaceFields;
  "survey-grid:player-3": SurveyGridSpaceFields;
  "survey-grid:player-4": SurveyGridSpaceFields;
};

export type BoardRelationFieldsByBoardId = {
  "survey-grid:player-1": SurveyGridRelationFields;
  "survey-grid:player-2": SurveyGridRelationFields;
  "survey-grid:player-3": SurveyGridRelationFields;
  "survey-grid:player-4": SurveyGridRelationFields;
};

export type BoardContainerFieldsByBoardId = {
  "survey-grid:player-1": SurveyGridContainerFields;
  "survey-grid:player-2": SurveyGridContainerFields;
  "survey-grid:player-3": SurveyGridContainerFields;
  "survey-grid:player-4": SurveyGridContainerFields;
};

export type HexEdgeFieldsByBoardId = Record<string, never>;

export type HexVertexFieldsByBoardId = Record<string, never>;

export type SquareEdgeFieldsByBoardId = {
  "survey-grid:player-1": SurveyGridEdgeFields;
  "survey-grid:player-2": SurveyGridEdgeFields;
  "survey-grid:player-3": SurveyGridEdgeFields;
  "survey-grid:player-4": SurveyGridEdgeFields;
};

export type SquareVertexFieldsByBoardId = {
  "survey-grid:player-1": SurveyGridVertexFields;
  "survey-grid:player-2": SurveyGridVertexFields;
  "survey-grid:player-3": SurveyGridVertexFields;
  "survey-grid:player-4": SurveyGridVertexFields;
};

export type TiledEdgeFieldsByBoardId = {
  "survey-grid:player-1": SurveyGridEdgeFields;
  "survey-grid:player-2": SurveyGridEdgeFields;
  "survey-grid:player-3": SurveyGridEdgeFields;
  "survey-grid:player-4": SurveyGridEdgeFields;
};

export type TiledVertexFieldsByBoardId = {
  "survey-grid:player-1": SurveyGridVertexFields;
  "survey-grid:player-2": SurveyGridVertexFields;
  "survey-grid:player-3": SurveyGridVertexFields;
  "survey-grid:player-4": SurveyGridVertexFields;
};

export type PieceFieldsByTypeId = Record<string, RuntimeRecord>;

export type DieFieldsByTypeId = {
  "survey-die": SurveyDieDieFields;
};

export type CardProperties = RuntimeRecord;

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

};
export type CardIdsByPlayerZoneId = {

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
  "survey-grid:player-1": SquareBoardStateRecord<"survey-grid:player-1", "cell-0-0" | "cell-0-1" | "cell-0-2" | "cell-0-3" | "cell-1-0" | "cell-1-1" | "cell-1-2" | "cell-1-3" | "cell-2-0" | "cell-2-1" | "cell-2-2" | "cell-2-3" | "cell-3-0" | "cell-3-1" | "cell-3-2" | "cell-3-3", never, "square-edge:0,0::0,1" | "square-edge:0,0::1,0" | "square-edge:0,1::0,2" | "square-edge:0,1::1,1" | "square-edge:0,2::0,3" | "square-edge:0,2::1,2" | "square-edge:0,3::0,4" | "square-edge:0,3::1,3" | "square-edge:0,4::1,4" | "square-edge:1,0::1,1" | "square-edge:1,0::2,0" | "square-edge:1,1::1,2" | "square-edge:1,1::2,1" | "square-edge:1,2::1,3" | "square-edge:1,2::2,2" | "square-edge:1,3::1,4" | "square-edge:1,3::2,3" | "square-edge:1,4::2,4" | "square-edge:2,0::2,1" | "square-edge:2,0::3,0" | "square-edge:2,1::2,2" | "square-edge:2,1::3,1" | "square-edge:2,2::2,3" | "square-edge:2,2::3,2" | "square-edge:2,3::2,4" | "square-edge:2,3::3,3" | "square-edge:2,4::3,4" | "square-edge:3,0::3,1" | "square-edge:3,0::4,0" | "square-edge:3,1::3,2" | "square-edge:3,1::4,1" | "square-edge:3,2::3,3" | "square-edge:3,2::4,2" | "square-edge:3,3::3,4" | "square-edge:3,3::4,3" | "square-edge:3,4::4,4" | "square-edge:4,0::4,1" | "square-edge:4,1::4,2" | "square-edge:4,2::4,3" | "square-edge:4,3::4,4", "square-vertex:0,0" | "square-vertex:0,1" | "square-vertex:0,2" | "square-vertex:0,3" | "square-vertex:0,4" | "square-vertex:1,0" | "square-vertex:1,1" | "square-vertex:1,2" | "square-vertex:1,3" | "square-vertex:1,4" | "square-vertex:2,0" | "square-vertex:2,1" | "square-vertex:2,2" | "square-vertex:2,3" | "square-vertex:2,4" | "square-vertex:3,0" | "square-vertex:3,1" | "square-vertex:3,2" | "square-vertex:3,3" | "square-vertex:3,4" | "square-vertex:4,0" | "square-vertex:4,1" | "square-vertex:4,2" | "square-vertex:4,3" | "square-vertex:4,4", SurveyGridBoardFields, SurveyGridSpaceFields, SurveyGridRelationFields, SurveyGridContainerFields, SurveyGridEdgeFields, SurveyGridVertexFields>;
  "survey-grid:player-2": SquareBoardStateRecord<"survey-grid:player-2", "cell-0-0" | "cell-0-1" | "cell-0-2" | "cell-0-3" | "cell-1-0" | "cell-1-1" | "cell-1-2" | "cell-1-3" | "cell-2-0" | "cell-2-1" | "cell-2-2" | "cell-2-3" | "cell-3-0" | "cell-3-1" | "cell-3-2" | "cell-3-3", never, "square-edge:0,0::0,1" | "square-edge:0,0::1,0" | "square-edge:0,1::0,2" | "square-edge:0,1::1,1" | "square-edge:0,2::0,3" | "square-edge:0,2::1,2" | "square-edge:0,3::0,4" | "square-edge:0,3::1,3" | "square-edge:0,4::1,4" | "square-edge:1,0::1,1" | "square-edge:1,0::2,0" | "square-edge:1,1::1,2" | "square-edge:1,1::2,1" | "square-edge:1,2::1,3" | "square-edge:1,2::2,2" | "square-edge:1,3::1,4" | "square-edge:1,3::2,3" | "square-edge:1,4::2,4" | "square-edge:2,0::2,1" | "square-edge:2,0::3,0" | "square-edge:2,1::2,2" | "square-edge:2,1::3,1" | "square-edge:2,2::2,3" | "square-edge:2,2::3,2" | "square-edge:2,3::2,4" | "square-edge:2,3::3,3" | "square-edge:2,4::3,4" | "square-edge:3,0::3,1" | "square-edge:3,0::4,0" | "square-edge:3,1::3,2" | "square-edge:3,1::4,1" | "square-edge:3,2::3,3" | "square-edge:3,2::4,2" | "square-edge:3,3::3,4" | "square-edge:3,3::4,3" | "square-edge:3,4::4,4" | "square-edge:4,0::4,1" | "square-edge:4,1::4,2" | "square-edge:4,2::4,3" | "square-edge:4,3::4,4", "square-vertex:0,0" | "square-vertex:0,1" | "square-vertex:0,2" | "square-vertex:0,3" | "square-vertex:0,4" | "square-vertex:1,0" | "square-vertex:1,1" | "square-vertex:1,2" | "square-vertex:1,3" | "square-vertex:1,4" | "square-vertex:2,0" | "square-vertex:2,1" | "square-vertex:2,2" | "square-vertex:2,3" | "square-vertex:2,4" | "square-vertex:3,0" | "square-vertex:3,1" | "square-vertex:3,2" | "square-vertex:3,3" | "square-vertex:3,4" | "square-vertex:4,0" | "square-vertex:4,1" | "square-vertex:4,2" | "square-vertex:4,3" | "square-vertex:4,4", SurveyGridBoardFields, SurveyGridSpaceFields, SurveyGridRelationFields, SurveyGridContainerFields, SurveyGridEdgeFields, SurveyGridVertexFields>;
  "survey-grid:player-3": SquareBoardStateRecord<"survey-grid:player-3", "cell-0-0" | "cell-0-1" | "cell-0-2" | "cell-0-3" | "cell-1-0" | "cell-1-1" | "cell-1-2" | "cell-1-3" | "cell-2-0" | "cell-2-1" | "cell-2-2" | "cell-2-3" | "cell-3-0" | "cell-3-1" | "cell-3-2" | "cell-3-3", never, "square-edge:0,0::0,1" | "square-edge:0,0::1,0" | "square-edge:0,1::0,2" | "square-edge:0,1::1,1" | "square-edge:0,2::0,3" | "square-edge:0,2::1,2" | "square-edge:0,3::0,4" | "square-edge:0,3::1,3" | "square-edge:0,4::1,4" | "square-edge:1,0::1,1" | "square-edge:1,0::2,0" | "square-edge:1,1::1,2" | "square-edge:1,1::2,1" | "square-edge:1,2::1,3" | "square-edge:1,2::2,2" | "square-edge:1,3::1,4" | "square-edge:1,3::2,3" | "square-edge:1,4::2,4" | "square-edge:2,0::2,1" | "square-edge:2,0::3,0" | "square-edge:2,1::2,2" | "square-edge:2,1::3,1" | "square-edge:2,2::2,3" | "square-edge:2,2::3,2" | "square-edge:2,3::2,4" | "square-edge:2,3::3,3" | "square-edge:2,4::3,4" | "square-edge:3,0::3,1" | "square-edge:3,0::4,0" | "square-edge:3,1::3,2" | "square-edge:3,1::4,1" | "square-edge:3,2::3,3" | "square-edge:3,2::4,2" | "square-edge:3,3::3,4" | "square-edge:3,3::4,3" | "square-edge:3,4::4,4" | "square-edge:4,0::4,1" | "square-edge:4,1::4,2" | "square-edge:4,2::4,3" | "square-edge:4,3::4,4", "square-vertex:0,0" | "square-vertex:0,1" | "square-vertex:0,2" | "square-vertex:0,3" | "square-vertex:0,4" | "square-vertex:1,0" | "square-vertex:1,1" | "square-vertex:1,2" | "square-vertex:1,3" | "square-vertex:1,4" | "square-vertex:2,0" | "square-vertex:2,1" | "square-vertex:2,2" | "square-vertex:2,3" | "square-vertex:2,4" | "square-vertex:3,0" | "square-vertex:3,1" | "square-vertex:3,2" | "square-vertex:3,3" | "square-vertex:3,4" | "square-vertex:4,0" | "square-vertex:4,1" | "square-vertex:4,2" | "square-vertex:4,3" | "square-vertex:4,4", SurveyGridBoardFields, SurveyGridSpaceFields, SurveyGridRelationFields, SurveyGridContainerFields, SurveyGridEdgeFields, SurveyGridVertexFields>;
  "survey-grid:player-4": SquareBoardStateRecord<"survey-grid:player-4", "cell-0-0" | "cell-0-1" | "cell-0-2" | "cell-0-3" | "cell-1-0" | "cell-1-1" | "cell-1-2" | "cell-1-3" | "cell-2-0" | "cell-2-1" | "cell-2-2" | "cell-2-3" | "cell-3-0" | "cell-3-1" | "cell-3-2" | "cell-3-3", never, "square-edge:0,0::0,1" | "square-edge:0,0::1,0" | "square-edge:0,1::0,2" | "square-edge:0,1::1,1" | "square-edge:0,2::0,3" | "square-edge:0,2::1,2" | "square-edge:0,3::0,4" | "square-edge:0,3::1,3" | "square-edge:0,4::1,4" | "square-edge:1,0::1,1" | "square-edge:1,0::2,0" | "square-edge:1,1::1,2" | "square-edge:1,1::2,1" | "square-edge:1,2::1,3" | "square-edge:1,2::2,2" | "square-edge:1,3::1,4" | "square-edge:1,3::2,3" | "square-edge:1,4::2,4" | "square-edge:2,0::2,1" | "square-edge:2,0::3,0" | "square-edge:2,1::2,2" | "square-edge:2,1::3,1" | "square-edge:2,2::2,3" | "square-edge:2,2::3,2" | "square-edge:2,3::2,4" | "square-edge:2,3::3,3" | "square-edge:2,4::3,4" | "square-edge:3,0::3,1" | "square-edge:3,0::4,0" | "square-edge:3,1::3,2" | "square-edge:3,1::4,1" | "square-edge:3,2::3,3" | "square-edge:3,2::4,2" | "square-edge:3,3::3,4" | "square-edge:3,3::4,3" | "square-edge:3,4::4,4" | "square-edge:4,0::4,1" | "square-edge:4,1::4,2" | "square-edge:4,2::4,3" | "square-edge:4,3::4,4", "square-vertex:0,0" | "square-vertex:0,1" | "square-vertex:0,2" | "square-vertex:0,3" | "square-vertex:0,4" | "square-vertex:1,0" | "square-vertex:1,1" | "square-vertex:1,2" | "square-vertex:1,3" | "square-vertex:1,4" | "square-vertex:2,0" | "square-vertex:2,1" | "square-vertex:2,2" | "square-vertex:2,3" | "square-vertex:2,4" | "square-vertex:3,0" | "square-vertex:3,1" | "square-vertex:3,2" | "square-vertex:3,3" | "square-vertex:3,4" | "square-vertex:4,0" | "square-vertex:4,1" | "square-vertex:4,2" | "square-vertex:4,3" | "square-vertex:4,4", SurveyGridBoardFields, SurveyGridSpaceFields, SurveyGridRelationFields, SurveyGridContainerFields, SurveyGridEdgeFields, SurveyGridVertexFields>;
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
