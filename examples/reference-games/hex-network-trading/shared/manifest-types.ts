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

export type CharterCardsCardProperties = {
  cardType: "scout" | "shortcut" | "surveyGrant" | "claimMarker" | "landmark";
};

export type CharterCardsCardId =
  | "scout-1"
  | "scout-2"
  | "scout-3"
  | "scout-4"
  | "scout-5"
  | "scout-6"
  | "scout-7"
  | "scout-8"
  | "scout-9"
  | "scout-10"
  | "scout-11"
  | "scout-12"
  | "scout-13"
  | "scout-14"
  | "shortcut-1"
  | "shortcut-2"
  | "surveyGrant-1"
  | "surveyGrant-2"
  | "claimMarker-1"
  | "claimMarker-2"
  | "landmark-1"
  | "landmark-2"
  | "landmark-3"
  | "landmark-4"
  | "landmark-5";

export type FrontierBoardFields = RuntimeRecord;
export type FrontierSpaceFields = RuntimeRecord;
export type FrontierEdgeFields = {
  relayIndex?: number;
};
export type FrontierVertexFields = RuntimeRecord;
export type CampPieceFields = RuntimeRecord;
export type StormPieceFields = RuntimeRecord;
export type TownPieceFields = RuntimeRecord;
export type TrailPieceFields = RuntimeRecord;
export type D6DieFields = RuntimeRecord;

export type BoardFieldsByBoardId = {
  frontier: FrontierBoardFields;
};

export type BoardSpaceFieldsByBoardId = {
  frontier: FrontierSpaceFields;
};

export type BoardRelationFieldsByBoardId = {
  frontier: RuntimeRecord;
};

export type BoardContainerFieldsByBoardId = {
  frontier: RuntimeRecord;
};

export type HexEdgeFieldsByBoardId = {
  frontier: FrontierEdgeFields;
};

export type HexVertexFieldsByBoardId = {
  frontier: FrontierVertexFields;
};

export type SquareEdgeFieldsByBoardId = Record<string, never>;

export type SquareVertexFieldsByBoardId = Record<string, never>;

export type TiledEdgeFieldsByBoardId = {
  frontier: FrontierEdgeFields;
};

export type TiledVertexFieldsByBoardId = {
  frontier: FrontierVertexFields;
};

export type PieceFieldsByTypeId = {
  camp: CampPieceFields;
  storm: StormPieceFields;
  town: TownPieceFields;
  trail: TrailPieceFields;
};

export type DieFieldsByTypeId = {
  d6: D6DieFields;
};

export type CardProperties = CharterCardsCardProperties;

export type CardState = Omit<
  RuntimeCardData,
  "id" | "cardSetId" | "cardType" | "properties"
> & {
  id: CardId;
  cardSetId: CardSetId;
  cardType: CardType;
  properties: CardProperties;
};
export type CardStateById = Record<CardId, CardState>;
export type PieceStateById = Record<PieceId, RuntimePieceData>;
export type DieStateById = Record<DieId, RuntimeDieData>;
export type CardIdsBySharedZoneId = {
  "charter-deck": Array<CharterCardsCardId>;
  "charter-played": Array<CharterCardsCardId>;
};
export type CardIdsByPlayerZoneId = {
  "charter-hand": PerPlayer<Array<CharterCardsCardId>>;
};
export type CardIdsByDeckId = CardIdsBySharedZoneId;
export type ComponentId = CardId | PieceId | DieId;

export interface BoardSpaceStateRecord<
  SpaceIdValue extends SpaceId = SpaceId,
  Fields = RuntimeRecord,
> {
  id: SpaceIdValue;
  name?: string | null;
  typeId?: SpaceTypeId | null;
  fields: Fields;
  zoneId?: string | null;
}
export interface BoardRelationStateRecord<
  SpaceIdValue extends SpaceId = SpaceId,
  Fields = RuntimeRecord,
> {
  id?: string | null;
  typeId: RelationTypeId;
  fromSpaceId: SpaceIdValue;
  toSpaceId: SpaceIdValue;
  directed: boolean;
  fields: Fields;
}
export interface BoardContainerStateRecord<
  SpaceIdValue extends SpaceId = SpaceId,
  ContainerIdValue extends BoardContainerId = BoardContainerId,
  Fields = RuntimeRecord,
> {
  id: ContainerIdValue;
  name: string;
  host: { type: "board" } | { type: "space"; spaceId: SpaceIdValue };
  allowedCardSetIds?: readonly CardSetId[];
  zoneId: string;
  fields: Fields;
}
export interface BoardStateRecordBase<
  BoardIdValue extends BoardId = BoardId,
  BoardFields = RuntimeRecord,
> {
  id: BoardIdValue;
  baseId: BoardBaseId;
  typeId?: BoardTypeId | null;
  scope: "shared" | "perPlayer";
  playerId?: PlayerId | null;
  templateId?: string | null;
  fields: BoardFields;
}
export interface GenericBoardStateRecord<
  BoardIdValue extends BoardId = BoardId,
  SpaceIdValue extends SpaceId = SpaceId,
  ContainerIdValue extends BoardContainerId = BoardContainerId,
  BoardFields = RuntimeRecord,
  SpaceFields = RuntimeRecord,
  RelationFields = RuntimeRecord,
  ContainerFields = RuntimeRecord,
> extends BoardStateRecordBase<BoardIdValue, BoardFields> {
  layout: "generic";
  spaces: Record<
    SpaceIdValue,
    BoardSpaceStateRecord<SpaceIdValue, SpaceFields>
  >;
  relations: Array<BoardRelationStateRecord<SpaceIdValue, RelationFields>>;
  containers: Record<
    ContainerIdValue,
    BoardContainerStateRecord<SpaceIdValue, ContainerIdValue, ContainerFields>
  >;
}
export interface HexSpaceStateRecord<
  SpaceIdValue extends SpaceId = SpaceId,
  Fields = RuntimeRecord,
> extends BoardSpaceStateRecord<SpaceIdValue, Fields> {
  q: number;
  r: number;
}
export interface SquareSpaceStateRecord<
  SpaceIdValue extends SpaceId = SpaceId,
  Fields = RuntimeRecord,
> extends BoardSpaceStateRecord<SpaceIdValue, Fields> {
  row: number;
  col: number;
}
export interface TiledEdgeStateRecord<
  SpaceIdValue extends SpaceId = SpaceId,
  EdgeIdValue extends EdgeId = EdgeId,
  Fields = RuntimeRecord,
> {
  id: EdgeIdValue;
  spaceIds: readonly SpaceIdValue[];
  typeId?: EdgeTypeId | null;
  label?: string | null;
  ownerId?: PlayerId | null;
  fields: Fields;
}
export interface TiledVertexStateRecord<
  SpaceIdValue extends SpaceId = SpaceId,
  VertexIdValue extends VertexId = VertexId,
  Fields = RuntimeRecord,
> {
  id: VertexIdValue;
  spaceIds: readonly SpaceIdValue[];
  typeId?: VertexTypeId | null;
  label?: string | null;
  ownerId?: PlayerId | null;
  fields: Fields;
}
export type HexEdgeStateRecord<
  SpaceIdValue extends SpaceId = SpaceId,
  EdgeIdValue extends EdgeId = EdgeId,
  Fields = RuntimeRecord,
> = TiledEdgeStateRecord<SpaceIdValue, EdgeIdValue, Fields>;
export type HexVertexStateRecord<
  SpaceIdValue extends SpaceId = SpaceId,
  VertexIdValue extends VertexId = VertexId,
  Fields = RuntimeRecord,
> = TiledVertexStateRecord<SpaceIdValue, VertexIdValue, Fields>;
export interface HexBoardStateRecord<
  BoardIdValue extends BoardId = BoardId,
  SpaceIdValue extends SpaceId = SpaceId,
  EdgeIdValue extends EdgeId = EdgeId,
  VertexIdValue extends VertexId = VertexId,
  BoardFields = RuntimeRecord,
  SpaceFields = RuntimeRecord,
  EdgeFields = RuntimeRecord,
  VertexFields = RuntimeRecord,
> extends BoardStateRecordBase<BoardIdValue, BoardFields> {
  layout: "hex";
  spaces: Record<SpaceIdValue, HexSpaceStateRecord<SpaceIdValue, SpaceFields>>;
  relations: Array<BoardRelationStateRecord<SpaceIdValue, RuntimeRecord>>;
  containers: Record<never, never>;
  orientation: "pointy-top" | "flat-top";
  edges: Array<HexEdgeStateRecord<SpaceIdValue, EdgeIdValue, EdgeFields>>;
  vertices: Array<
    HexVertexStateRecord<SpaceIdValue, VertexIdValue, VertexFields>
  >;
}
export interface SquareBoardStateRecord<
  BoardIdValue extends BoardId = BoardId,
  SpaceIdValue extends SpaceId = SpaceId,
  ContainerIdValue extends BoardContainerId = BoardContainerId,
  EdgeIdValue extends EdgeId = EdgeId,
  VertexIdValue extends VertexId = VertexId,
  BoardFields = RuntimeRecord,
  SpaceFields = RuntimeRecord,
  RelationFields = RuntimeRecord,
  ContainerFields = RuntimeRecord,
  EdgeFields = RuntimeRecord,
  VertexFields = RuntimeRecord,
> extends BoardStateRecordBase<BoardIdValue, BoardFields> {
  layout: "square";
  spaces: Record<
    SpaceIdValue,
    SquareSpaceStateRecord<SpaceIdValue, SpaceFields>
  >;
  relations: Array<BoardRelationStateRecord<SpaceIdValue, RelationFields>>;
  containers: Record<
    ContainerIdValue,
    BoardContainerStateRecord<SpaceIdValue, ContainerIdValue, ContainerFields>
  >;
  edges: Array<TiledEdgeStateRecord<SpaceIdValue, EdgeIdValue, EdgeFields>>;
  vertices: Array<
    TiledVertexStateRecord<SpaceIdValue, VertexIdValue, VertexFields>
  >;
}
export type BoardStateById = {
  frontier: HexBoardStateRecord<
    "frontier",
    | "h-0-0"
    | "h-1-0"
    | "h-1-1"
    | "h-1-2"
    | "h-1-3"
    | "h-1-4"
    | "h-1-5"
    | "h-2-0"
    | "h-2-1"
    | "h-2-10"
    | "h-2-11"
    | "h-2-2"
    | "h-2-3"
    | "h-2-4"
    | "h-2-5"
    | "h-2-6"
    | "h-2-7"
    | "h-2-8"
    | "h-2-9"
    | "o-0"
    | "o-1"
    | "o-10"
    | "o-11"
    | "o-12"
    | "o-13"
    | "o-14"
    | "o-15"
    | "o-16"
    | "o-17"
    | "o-2"
    | "o-3"
    | "o-4"
    | "o-5"
    | "o-6"
    | "o-7"
    | "o-8"
    | "o-9",
    | "hex-edge:-1,-1,2::-2,-2,4"
    | "hex-edge:-1,-1,2::-2,1,1"
    | "hex-edge:-1,-1,2::1,-2,1"
    | "hex-edge:-1,-10,11::-2,-8,10"
    | "hex-edge:-1,-10,11::1,-11,10"
    | "hex-edge:-1,-4,5::-2,-2,4"
    | "hex-edge:-1,-4,5::-2,-5,7"
    | "hex-edge:-1,-4,5::1,-5,4"
    | "hex-edge:-1,-7,8::-2,-5,7"
    | "hex-edge:-1,-7,8::-2,-8,10"
    | "hex-edge:-1,-7,8::1,-8,7"
    | "hex-edge:-1,11,-10::-2,10,-8"
    | "hex-edge:-1,11,-10::1,10,-11"
    | "hex-edge:-1,2,-1::-2,1,1"
    | "hex-edge:-1,2,-1::-2,4,-2"
    | "hex-edge:-1,2,-1::1,1,-2"
    | "hex-edge:-1,5,-4::-2,4,-2"
    | "hex-edge:-1,5,-4::-2,7,-5"
    | "hex-edge:-1,5,-4::1,4,-5"
    | "hex-edge:-1,8,-7::-2,10,-8"
    | "hex-edge:-1,8,-7::-2,7,-5"
    | "hex-edge:-1,8,-7::1,7,-8"
    | "hex-edge:-10,-1,11::-11,1,10"
    | "hex-edge:-10,-1,11::-8,-2,10"
    | "hex-edge:-10,11,-1::-11,10,1"
    | "hex-edge:-10,11,-1::-8,10,-2"
    | "hex-edge:-10,2,8::-11,1,10"
    | "hex-edge:-10,2,8::-11,4,7"
    | "hex-edge:-10,2,8::-8,1,7"
    | "hex-edge:-10,5,5::-11,4,7"
    | "hex-edge:-10,5,5::-11,7,4"
    | "hex-edge:-10,5,5::-8,4,4"
    | "hex-edge:-10,8,2::-11,10,1"
    | "hex-edge:-10,8,2::-11,7,4"
    | "hex-edge:-10,8,2::-8,7,1"
    | "hex-edge:-2,-2,4::-4,-1,5"
    | "hex-edge:-2,-5,7::-4,-4,8"
    | "hex-edge:-2,-8,10::-4,-7,11"
    | "hex-edge:-2,1,1::-4,2,2"
    | "hex-edge:-2,10,-8::-4,11,-7"
    | "hex-edge:-2,4,-2::-4,5,-1"
    | "hex-edge:-2,7,-5::-4,8,-4"
    | "hex-edge:-4,-1,5::-5,-2,7"
    | "hex-edge:-4,-1,5::-5,1,4"
    | "hex-edge:-4,-4,8::-5,-2,7"
    | "hex-edge:-4,-4,8::-5,-5,10"
    | "hex-edge:-4,-7,11::-5,-5,10"
    | "hex-edge:-4,11,-7::-5,10,-5"
    | "hex-edge:-4,2,2::-5,1,4"
    | "hex-edge:-4,2,2::-5,4,1"
    | "hex-edge:-4,5,-1::-5,4,1"
    | "hex-edge:-4,5,-1::-5,7,-2"
    | "hex-edge:-4,8,-4::-5,10,-5"
    | "hex-edge:-4,8,-4::-5,7,-2"
    | "hex-edge:-5,-2,7::-7,-1,8"
    | "hex-edge:-5,-5,10::-7,-4,11"
    | "hex-edge:-5,1,4::-7,2,5"
    | "hex-edge:-5,10,-5::-7,11,-4"
    | "hex-edge:-5,4,1::-7,5,2"
    | "hex-edge:-5,7,-2::-7,8,-1"
    | "hex-edge:-7,-1,8::-8,-2,10"
    | "hex-edge:-7,-1,8::-8,1,7"
    | "hex-edge:-7,-4,11::-8,-2,10"
    | "hex-edge:-7,11,-4::-8,10,-2"
    | "hex-edge:-7,2,5::-8,1,7"
    | "hex-edge:-7,2,5::-8,4,4"
    | "hex-edge:-7,5,2::-8,4,4"
    | "hex-edge:-7,5,2::-8,7,1"
    | "hex-edge:-7,8,-1::-8,10,-2"
    | "hex-edge:-7,8,-1::-8,7,1"
    | "hex-edge:1,-11,10::2,-10,8"
    | "hex-edge:1,-2,1::2,-1,-1"
    | "hex-edge:1,-2,1::2,-4,2"
    | "hex-edge:1,-5,4::2,-4,2"
    | "hex-edge:1,-5,4::2,-7,5"
    | "hex-edge:1,-8,7::2,-10,8"
    | "hex-edge:1,-8,7::2,-7,5"
    | "hex-edge:1,1,-2::2,-1,-1"
    | "hex-edge:1,1,-2::2,2,-4"
    | "hex-edge:1,10,-11::2,8,-10"
    | "hex-edge:1,4,-5::2,2,-4"
    | "hex-edge:1,4,-5::2,5,-7"
    | "hex-edge:1,7,-8::2,5,-7"
    | "hex-edge:1,7,-8::2,8,-10"
    | "hex-edge:10,-11,1::11,-10,-1"
    | "hex-edge:10,-11,1::8,-10,2"
    | "hex-edge:10,-2,-8::11,-1,-10"
    | "hex-edge:10,-2,-8::11,-4,-7"
    | "hex-edge:10,-2,-8::8,-1,-7"
    | "hex-edge:10,-5,-5::11,-4,-7"
    | "hex-edge:10,-5,-5::11,-7,-4"
    | "hex-edge:10,-5,-5::8,-4,-4"
    | "hex-edge:10,-8,-2::11,-10,-1"
    | "hex-edge:10,-8,-2::11,-7,-4"
    | "hex-edge:10,-8,-2::8,-7,-1"
    | "hex-edge:10,1,-11::11,-1,-10"
    | "hex-edge:10,1,-11::8,2,-10"
    | "hex-edge:2,-1,-1::4,-2,-2"
    | "hex-edge:2,-10,8::4,-11,7"
    | "hex-edge:2,-4,2::4,-5,1"
    | "hex-edge:2,-7,5::4,-8,4"
    | "hex-edge:2,2,-4::4,1,-5"
    | "hex-edge:2,5,-7::4,4,-8"
    | "hex-edge:2,8,-10::4,7,-11"
    | "hex-edge:4,-11,7::5,-10,5"
    | "hex-edge:4,-2,-2::5,-1,-4"
    | "hex-edge:4,-2,-2::5,-4,-1"
    | "hex-edge:4,-5,1::5,-4,-1"
    | "hex-edge:4,-5,1::5,-7,2"
    | "hex-edge:4,-8,4::5,-10,5"
    | "hex-edge:4,-8,4::5,-7,2"
    | "hex-edge:4,1,-5::5,-1,-4"
    | "hex-edge:4,1,-5::5,2,-7"
    | "hex-edge:4,4,-8::5,2,-7"
    | "hex-edge:4,4,-8::5,5,-10"
    | "hex-edge:4,7,-11::5,5,-10"
    | "hex-edge:5,-1,-4::7,-2,-5"
    | "hex-edge:5,-10,5::7,-11,4"
    | "hex-edge:5,-4,-1::7,-5,-2"
    | "hex-edge:5,-7,2::7,-8,1"
    | "hex-edge:5,2,-7::7,1,-8"
    | "hex-edge:5,5,-10::7,4,-11"
    | "hex-edge:7,-11,4::8,-10,2"
    | "hex-edge:7,-2,-5::8,-1,-7"
    | "hex-edge:7,-2,-5::8,-4,-4"
    | "hex-edge:7,-5,-2::8,-4,-4"
    | "hex-edge:7,-5,-2::8,-7,-1"
    | "hex-edge:7,-8,1::8,-10,2"
    | "hex-edge:7,-8,1::8,-7,-1"
    | "hex-edge:7,1,-8::8,-1,-7"
    | "hex-edge:7,1,-8::8,2,-10"
    | "hex-edge:7,4,-11::8,2,-10",
    | "hex-vertex:-1,-1,2"
    | "hex-vertex:-1,-10,11"
    | "hex-vertex:-1,-4,5"
    | "hex-vertex:-1,-7,8"
    | "hex-vertex:-1,11,-10"
    | "hex-vertex:-1,2,-1"
    | "hex-vertex:-1,5,-4"
    | "hex-vertex:-1,8,-7"
    | "hex-vertex:-10,-1,11"
    | "hex-vertex:-10,11,-1"
    | "hex-vertex:-10,2,8"
    | "hex-vertex:-10,5,5"
    | "hex-vertex:-10,8,2"
    | "hex-vertex:-11,1,10"
    | "hex-vertex:-11,10,1"
    | "hex-vertex:-11,4,7"
    | "hex-vertex:-11,7,4"
    | "hex-vertex:-2,-2,4"
    | "hex-vertex:-2,-5,7"
    | "hex-vertex:-2,-8,10"
    | "hex-vertex:-2,1,1"
    | "hex-vertex:-2,10,-8"
    | "hex-vertex:-2,4,-2"
    | "hex-vertex:-2,7,-5"
    | "hex-vertex:-4,-1,5"
    | "hex-vertex:-4,-4,8"
    | "hex-vertex:-4,-7,11"
    | "hex-vertex:-4,11,-7"
    | "hex-vertex:-4,2,2"
    | "hex-vertex:-4,5,-1"
    | "hex-vertex:-4,8,-4"
    | "hex-vertex:-5,-2,7"
    | "hex-vertex:-5,-5,10"
    | "hex-vertex:-5,1,4"
    | "hex-vertex:-5,10,-5"
    | "hex-vertex:-5,4,1"
    | "hex-vertex:-5,7,-2"
    | "hex-vertex:-7,-1,8"
    | "hex-vertex:-7,-4,11"
    | "hex-vertex:-7,11,-4"
    | "hex-vertex:-7,2,5"
    | "hex-vertex:-7,5,2"
    | "hex-vertex:-7,8,-1"
    | "hex-vertex:-8,-2,10"
    | "hex-vertex:-8,1,7"
    | "hex-vertex:-8,10,-2"
    | "hex-vertex:-8,4,4"
    | "hex-vertex:-8,7,1"
    | "hex-vertex:1,-11,10"
    | "hex-vertex:1,-2,1"
    | "hex-vertex:1,-5,4"
    | "hex-vertex:1,-8,7"
    | "hex-vertex:1,1,-2"
    | "hex-vertex:1,10,-11"
    | "hex-vertex:1,4,-5"
    | "hex-vertex:1,7,-8"
    | "hex-vertex:10,-11,1"
    | "hex-vertex:10,-2,-8"
    | "hex-vertex:10,-5,-5"
    | "hex-vertex:10,-8,-2"
    | "hex-vertex:10,1,-11"
    | "hex-vertex:11,-1,-10"
    | "hex-vertex:11,-10,-1"
    | "hex-vertex:11,-4,-7"
    | "hex-vertex:11,-7,-4"
    | "hex-vertex:2,-1,-1"
    | "hex-vertex:2,-10,8"
    | "hex-vertex:2,-4,2"
    | "hex-vertex:2,-7,5"
    | "hex-vertex:2,2,-4"
    | "hex-vertex:2,5,-7"
    | "hex-vertex:2,8,-10"
    | "hex-vertex:4,-11,7"
    | "hex-vertex:4,-2,-2"
    | "hex-vertex:4,-5,1"
    | "hex-vertex:4,-8,4"
    | "hex-vertex:4,1,-5"
    | "hex-vertex:4,4,-8"
    | "hex-vertex:4,7,-11"
    | "hex-vertex:5,-1,-4"
    | "hex-vertex:5,-10,5"
    | "hex-vertex:5,-4,-1"
    | "hex-vertex:5,-7,2"
    | "hex-vertex:5,2,-7"
    | "hex-vertex:5,5,-10"
    | "hex-vertex:7,-11,4"
    | "hex-vertex:7,-2,-5"
    | "hex-vertex:7,-5,-2"
    | "hex-vertex:7,-8,1"
    | "hex-vertex:7,1,-8"
    | "hex-vertex:7,4,-11"
    | "hex-vertex:8,-1,-7"
    | "hex-vertex:8,-10,2"
    | "hex-vertex:8,-4,-4"
    | "hex-vertex:8,-7,-1"
    | "hex-vertex:8,2,-10",
    FrontierBoardFields,
    FrontierSpaceFields,
    FrontierEdgeFields,
    FrontierVertexFields
  >;
};
export type BoardState<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardStateById
    ? BoardStateById[BoardIdValue]
    : never;
export type BoardFields<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardFieldsByBoardId
    ? BoardFieldsByBoardId[BoardIdValue]
    : RuntimeRecord;
export type BoardSpaceState<BoardIdValue extends BoardId = BoardId> =
  BoardState<BoardIdValue> extends { spaces: Record<string, infer Space> }
    ? Space
    : never;
export type BoardSpaceFields<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardSpaceFieldsByBoardId
    ? BoardSpaceFieldsByBoardId[BoardIdValue]
    : RuntimeRecord;
export type BoardRelationState<BoardIdValue extends BoardId = BoardId> =
  BoardState<BoardIdValue> extends { relations: Array<infer Relation> }
    ? Relation
    : never;
export type BoardRelationFields<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardRelationFieldsByBoardId
    ? BoardRelationFieldsByBoardId[BoardIdValue]
    : RuntimeRecord;
export type BoardContainerState<BoardIdValue extends BoardId = BoardId> =
  BoardState<BoardIdValue> extends {
    containers: Record<string, infer Container>;
  }
    ? Container
    : never;
export type BoardContainerFields<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardContainerFieldsByBoardId
    ? BoardContainerFieldsByBoardId[BoardIdValue]
    : RuntimeRecord;
export type HexBoardStateById = {
  [BoardIdValue in keyof BoardStateById as BoardStateById[BoardIdValue] extends {
    layout: "hex";
  }
    ? BoardIdValue
    : never]: BoardStateById[BoardIdValue];
};
export type SquareBoardStateById = {
  [BoardIdValue in keyof BoardStateById as BoardStateById[BoardIdValue] extends {
    layout: "square";
  }
    ? BoardIdValue
    : never]: BoardStateById[BoardIdValue];
};
export type HexEdgeState<BoardIdValue extends BoardId = BoardId> =
  BoardState<BoardIdValue> extends { layout: "hex"; edges: Array<infer Edge> }
    ? Edge
    : never;
export type HexEdgeFields<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof HexEdgeFieldsByBoardId
    ? HexEdgeFieldsByBoardId[BoardIdValue]
    : RuntimeRecord;
export type HexVertexState<BoardIdValue extends BoardId = BoardId> =
  BoardState<BoardIdValue> extends {
    layout: "hex";
    vertices: Array<infer Vertex>;
  }
    ? Vertex
    : never;
export type HexVertexFields<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof HexVertexFieldsByBoardId
    ? HexVertexFieldsByBoardId[BoardIdValue]
    : RuntimeRecord;
export type SquareEdgeState<BoardIdValue extends BoardId = BoardId> =
  BoardState<BoardIdValue> extends {
    layout: "square";
    edges: Array<infer Edge>;
  }
    ? Edge
    : never;
export type SquareEdgeFields<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof SquareEdgeFieldsByBoardId
    ? SquareEdgeFieldsByBoardId[BoardIdValue]
    : RuntimeRecord;
export type SquareVertexState<BoardIdValue extends BoardId = BoardId> =
  BoardState<BoardIdValue> extends {
    layout: "square";
    vertices: Array<infer Vertex>;
  }
    ? Vertex
    : never;
export type SquareVertexFields<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof SquareVertexFieldsByBoardId
    ? SquareVertexFieldsByBoardId[BoardIdValue]
    : RuntimeRecord;
export type TiledBoardId =
  | keyof TiledEdgeFieldsByBoardId
  | keyof TiledVertexFieldsByBoardId;
export type TiledEdgeState<BoardIdValue extends TiledBoardId = TiledBoardId> =
  BoardIdValue extends BoardId
    ? HexEdgeState<BoardIdValue> | SquareEdgeState<BoardIdValue>
    : never;
export type TiledEdgeFields<BoardIdValue extends TiledBoardId = TiledBoardId> =
  BoardIdValue extends keyof TiledEdgeFieldsByBoardId
    ? TiledEdgeFieldsByBoardId[BoardIdValue]
    : RuntimeRecord;
export type TiledVertexState<BoardIdValue extends TiledBoardId = TiledBoardId> =
  BoardIdValue extends BoardId
    ? HexVertexState<BoardIdValue> | SquareVertexState<BoardIdValue>
    : never;
export type TiledVertexFields<
  BoardIdValue extends TiledBoardId = TiledBoardId,
> = BoardIdValue extends keyof TiledVertexFieldsByBoardId
  ? TiledVertexFieldsByBoardId[BoardIdValue]
  : RuntimeRecord;
export type BoardStateRecord = BoardStateById[BoardId];

export type TableState = Omit<
  RuntimeTableRecord,
  | "playerOrder"
  | "zones"
  | "decks"
  | "hands"
  | "handVisibility"
  | "cards"
  | "pieces"
  | "componentLocations"
  | "ownerOfCard"
  | "visibility"
  | "resources"
  | "boards"
  | "dice"
> & {
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
