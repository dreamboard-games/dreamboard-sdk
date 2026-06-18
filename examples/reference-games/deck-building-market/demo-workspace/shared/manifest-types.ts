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

export type SketchbookCardsDoodleCardProperties = {
  cost: number;
  coins: number;
};

export type SketchbookCardsSketchCardProperties = {
  cost: number;
  coins: number;
};

export type SketchbookCardsInkworkCardProperties = {
  cost: number;
  coins: number;
};

export type SketchbookCardsIdeaCardProperties = {
  cost: number;
  vp: number;
};

export type SketchbookCardsConceptCardProperties = {
  cost: number;
  vp: number;
};

export type SketchbookCardsMasterpieceCardProperties = {
  cost: number;
  vp: number;
};

export type SketchbookCardsSmudgeCardProperties = {
  cost: number;
  vp: number;
};

export type SketchbookCardsBrainstormCardProperties = {
  cost: number;
};

export type SketchbookCardsStudioCardProperties = {
  cost: number;
};

export type SketchbookCardsGalleryCardProperties = {
  cost: number;
};

export type SketchbookCardsOpenMicCardProperties = {
  cost: number;
};

export type SketchbookCardsCriticCardProperties = {
  cost: number;
};

export type SketchbookCardsEraserCardProperties = {
  cost: number;
};

export type SketchbookCardsSketchpadCardProperties = {
  cost: number;
};

export type SketchbookCardsStudioVisitCardProperties = {
  cost: number;
};

export type SketchbookCardsCardProperties =
  | SketchbookCardsDoodleCardProperties
  | SketchbookCardsSketchCardProperties
  | SketchbookCardsInkworkCardProperties
  | SketchbookCardsIdeaCardProperties
  | SketchbookCardsConceptCardProperties
  | SketchbookCardsMasterpieceCardProperties
  | SketchbookCardsSmudgeCardProperties
  | SketchbookCardsBrainstormCardProperties
  | SketchbookCardsStudioCardProperties
  | SketchbookCardsGalleryCardProperties
  | SketchbookCardsOpenMicCardProperties
  | SketchbookCardsCriticCardProperties
  | SketchbookCardsEraserCardProperties
  | SketchbookCardsSketchpadCardProperties
  | SketchbookCardsStudioVisitCardProperties;

export type SketchbookCardsCardId =
  | "doodle-1"
  | "doodle-2"
  | "doodle-3"
  | "doodle-4"
  | "doodle-5"
  | "doodle-6"
  | "doodle-7"
  | "doodle-8"
  | "doodle-9"
  | "doodle-10"
  | "doodle-11"
  | "doodle-12"
  | "doodle-13"
  | "doodle-14"
  | "doodle-15"
  | "doodle-16"
  | "doodle-17"
  | "doodle-18"
  | "doodle-19"
  | "doodle-20"
  | "doodle-21"
  | "doodle-22"
  | "doodle-23"
  | "doodle-24"
  | "doodle-25"
  | "doodle-26"
  | "doodle-27"
  | "doodle-28"
  | "doodle-29"
  | "doodle-30"
  | "doodle-31"
  | "doodle-32"
  | "doodle-33"
  | "doodle-34"
  | "doodle-35"
  | "doodle-36"
  | "doodle-37"
  | "doodle-38"
  | "doodle-39"
  | "doodle-40"
  | "doodle-41"
  | "doodle-42"
  | "doodle-43"
  | "doodle-44"
  | "doodle-45"
  | "doodle-46"
  | "doodle-47"
  | "doodle-48"
  | "doodle-49"
  | "doodle-50"
  | "doodle-51"
  | "doodle-52"
  | "doodle-53"
  | "doodle-54"
  | "doodle-55"
  | "doodle-56"
  | "doodle-57"
  | "doodle-58"
  | "doodle-59"
  | "doodle-60"
  | "sketch-1"
  | "sketch-2"
  | "sketch-3"
  | "sketch-4"
  | "sketch-5"
  | "sketch-6"
  | "sketch-7"
  | "sketch-8"
  | "sketch-9"
  | "sketch-10"
  | "sketch-11"
  | "sketch-12"
  | "sketch-13"
  | "sketch-14"
  | "sketch-15"
  | "sketch-16"
  | "sketch-17"
  | "sketch-18"
  | "sketch-19"
  | "sketch-20"
  | "sketch-21"
  | "sketch-22"
  | "sketch-23"
  | "sketch-24"
  | "sketch-25"
  | "sketch-26"
  | "sketch-27"
  | "sketch-28"
  | "sketch-29"
  | "sketch-30"
  | "sketch-31"
  | "sketch-32"
  | "sketch-33"
  | "sketch-34"
  | "sketch-35"
  | "sketch-36"
  | "sketch-37"
  | "sketch-38"
  | "sketch-39"
  | "sketch-40"
  | "inkwork-1"
  | "inkwork-2"
  | "inkwork-3"
  | "inkwork-4"
  | "inkwork-5"
  | "inkwork-6"
  | "inkwork-7"
  | "inkwork-8"
  | "inkwork-9"
  | "inkwork-10"
  | "inkwork-11"
  | "inkwork-12"
  | "inkwork-13"
  | "inkwork-14"
  | "inkwork-15"
  | "inkwork-16"
  | "inkwork-17"
  | "inkwork-18"
  | "inkwork-19"
  | "inkwork-20"
  | "inkwork-21"
  | "inkwork-22"
  | "inkwork-23"
  | "inkwork-24"
  | "inkwork-25"
  | "inkwork-26"
  | "inkwork-27"
  | "inkwork-28"
  | "inkwork-29"
  | "inkwork-30"
  | "idea-1"
  | "idea-2"
  | "idea-3"
  | "idea-4"
  | "idea-5"
  | "idea-6"
  | "idea-7"
  | "idea-8"
  | "concept-1"
  | "concept-2"
  | "concept-3"
  | "concept-4"
  | "concept-5"
  | "concept-6"
  | "concept-7"
  | "concept-8"
  | "masterpiece-1"
  | "masterpiece-2"
  | "masterpiece-3"
  | "masterpiece-4"
  | "masterpiece-5"
  | "masterpiece-6"
  | "masterpiece-7"
  | "masterpiece-8"
  | "smudge-1"
  | "smudge-2"
  | "smudge-3"
  | "smudge-4"
  | "smudge-5"
  | "smudge-6"
  | "smudge-7"
  | "smudge-8"
  | "smudge-9"
  | "smudge-10"
  | "brainstorm-1"
  | "brainstorm-2"
  | "brainstorm-3"
  | "brainstorm-4"
  | "brainstorm-5"
  | "brainstorm-6"
  | "brainstorm-7"
  | "studio-1"
  | "studio-2"
  | "studio-3"
  | "studio-4"
  | "studio-5"
  | "studio-6"
  | "studio-7"
  | "gallery-1"
  | "gallery-2"
  | "gallery-3"
  | "gallery-4"
  | "gallery-5"
  | "gallery-6"
  | "gallery-7"
  | "open-mic-1"
  | "open-mic-2"
  | "open-mic-3"
  | "open-mic-4"
  | "open-mic-5"
  | "open-mic-6"
  | "open-mic-7"
  | "critic-1"
  | "critic-2"
  | "critic-3"
  | "critic-4"
  | "critic-5"
  | "critic-6"
  | "critic-7"
  | "eraser-1"
  | "eraser-2"
  | "eraser-3"
  | "eraser-4"
  | "eraser-5"
  | "eraser-6"
  | "eraser-7"
  | "sketchpad-1"
  | "sketchpad-2"
  | "sketchpad-3"
  | "sketchpad-4"
  | "sketchpad-5"
  | "sketchpad-6"
  | "sketchpad-7"
  | "studio-visit-1"
  | "studio-visit-2"
  | "studio-visit-3"
  | "studio-visit-4"
  | "studio-visit-5"
  | "studio-visit-6"
  | "studio-visit-7";

export type BoardFieldsByBoardId = {};

export type BoardSpaceFieldsByBoardId = {};

export type BoardRelationFieldsByBoardId = {};

export type BoardContainerFieldsByBoardId = {};

export type HexEdgeFieldsByBoardId = Record<string, never>;

export type HexVertexFieldsByBoardId = Record<string, never>;

export type SquareEdgeFieldsByBoardId = Record<string, never>;

export type SquareVertexFieldsByBoardId = Record<string, never>;

export type TiledEdgeFieldsByBoardId = Record<string, never>;

export type TiledVertexFieldsByBoardId = Record<string, never>;

export type PieceFieldsByTypeId = Record<string, RuntimeRecord>;

export type DieFieldsByTypeId = Record<string, RuntimeRecord>;

export type CardProperties = SketchbookCardsCardProperties;

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
  "supply-brainstorm": Array<SketchbookCardsCardId>;
  "supply-concept": Array<SketchbookCardsCardId>;
  "supply-critic": Array<SketchbookCardsCardId>;
  "supply-doodle": Array<SketchbookCardsCardId>;
  "supply-eraser": Array<SketchbookCardsCardId>;
  "supply-gallery": Array<SketchbookCardsCardId>;
  "supply-idea": Array<SketchbookCardsCardId>;
  "supply-inkwork": Array<SketchbookCardsCardId>;
  "supply-masterpiece": Array<SketchbookCardsCardId>;
  "supply-open-mic": Array<SketchbookCardsCardId>;
  "supply-sketch": Array<SketchbookCardsCardId>;
  "supply-sketchpad": Array<SketchbookCardsCardId>;
  "supply-smudge": Array<SketchbookCardsCardId>;
  "supply-studio": Array<SketchbookCardsCardId>;
  "supply-studio-visit": Array<SketchbookCardsCardId>;
  trash: Array<SketchbookCardsCardId>;
};
export type CardIdsByPlayerZoneId = {
  deck: PerPlayer<Array<SketchbookCardsCardId>>;
  discard: PerPlayer<Array<SketchbookCardsCardId>>;
  hand: PerPlayer<Array<SketchbookCardsCardId>>;
  "in-play": PerPlayer<Array<SketchbookCardsCardId>>;
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
export type BoardStateById = {};
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
