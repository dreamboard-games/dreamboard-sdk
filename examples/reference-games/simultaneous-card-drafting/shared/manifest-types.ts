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

export type SushiCardsNigiriEggCardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
  nigiriPoints: number;
};

export type SushiCardsNigiriSalmonCardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
  nigiriPoints: number;
};

export type SushiCardsNigiriSquidCardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
  nigiriPoints: number;
};

export type SushiCardsWasabiCardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
};

export type SushiCardsTempuraCardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
};

export type SushiCardsSashimiCardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
};

export type SushiCardsDumplingCardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
};

export type SushiCardsMaki1CardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
  makiIcons: number;
};

export type SushiCardsMaki2CardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
  makiIcons: number;
};

export type SushiCardsMaki3CardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
  makiIcons: number;
};

export type SushiCardsPuddingCardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
};

export type SushiCardsChopsticksCardProperties = {
  category:
    | "nigiri"
    | "wasabi"
    | "tempura"
    | "sashimi"
    | "dumpling"
    | "maki"
    | "pudding"
    | "chopsticks";
};

export type SushiCardsCardProperties =
  | SushiCardsNigiriEggCardProperties
  | SushiCardsNigiriSalmonCardProperties
  | SushiCardsNigiriSquidCardProperties
  | SushiCardsWasabiCardProperties
  | SushiCardsTempuraCardProperties
  | SushiCardsSashimiCardProperties
  | SushiCardsDumplingCardProperties
  | SushiCardsMaki1CardProperties
  | SushiCardsMaki2CardProperties
  | SushiCardsMaki3CardProperties
  | SushiCardsPuddingCardProperties
  | SushiCardsChopsticksCardProperties;

export type SushiCardsCardId =
  | "nigiri-egg-1"
  | "nigiri-egg-2"
  | "nigiri-egg-3"
  | "nigiri-egg-4"
  | "nigiri-egg-5"
  | "nigiri-egg-6"
  | "nigiri-salmon-1"
  | "nigiri-salmon-2"
  | "nigiri-salmon-3"
  | "nigiri-salmon-4"
  | "nigiri-salmon-5"
  | "nigiri-salmon-6"
  | "nigiri-salmon-7"
  | "nigiri-salmon-8"
  | "nigiri-salmon-9"
  | "nigiri-salmon-10"
  | "nigiri-squid-1"
  | "nigiri-squid-2"
  | "nigiri-squid-3"
  | "nigiri-squid-4"
  | "nigiri-squid-5"
  | "wasabi-1"
  | "wasabi-2"
  | "wasabi-3"
  | "wasabi-4"
  | "wasabi-5"
  | "wasabi-6"
  | "tempura-1"
  | "tempura-2"
  | "tempura-3"
  | "tempura-4"
  | "tempura-5"
  | "tempura-6"
  | "tempura-7"
  | "tempura-8"
  | "tempura-9"
  | "tempura-10"
  | "tempura-11"
  | "tempura-12"
  | "tempura-13"
  | "tempura-14"
  | "sashimi-1"
  | "sashimi-2"
  | "sashimi-3"
  | "sashimi-4"
  | "sashimi-5"
  | "sashimi-6"
  | "sashimi-7"
  | "sashimi-8"
  | "sashimi-9"
  | "sashimi-10"
  | "sashimi-11"
  | "sashimi-12"
  | "sashimi-13"
  | "sashimi-14"
  | "dumpling-1"
  | "dumpling-2"
  | "dumpling-3"
  | "dumpling-4"
  | "dumpling-5"
  | "dumpling-6"
  | "dumpling-7"
  | "dumpling-8"
  | "dumpling-9"
  | "dumpling-10"
  | "dumpling-11"
  | "dumpling-12"
  | "dumpling-13"
  | "dumpling-14"
  | "maki-1-1"
  | "maki-1-2"
  | "maki-1-3"
  | "maki-1-4"
  | "maki-1-5"
  | "maki-1-6"
  | "maki-2-1"
  | "maki-2-2"
  | "maki-2-3"
  | "maki-2-4"
  | "maki-2-5"
  | "maki-2-6"
  | "maki-3-1"
  | "maki-3-2"
  | "maki-3-3"
  | "maki-3-4"
  | "maki-3-5"
  | "maki-3-6"
  | "pudding-1"
  | "pudding-2"
  | "pudding-3"
  | "pudding-4"
  | "pudding-5"
  | "pudding-6"
  | "pudding-7"
  | "pudding-8"
  | "pudding-9"
  | "pudding-10"
  | "chopsticks-1"
  | "chopsticks-2"
  | "chopsticks-3"
  | "chopsticks-4";

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

export type CardProperties = SushiCardsCardProperties;

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
  "draw-pile": Array<SushiCardsCardId>;
  "round-discard": Array<SushiCardsCardId>;
};
export type CardIdsByPlayerZoneId = {
  hand: PerPlayer<Array<SushiCardsCardId>>;
  played: PerPlayer<Array<SushiCardsCardId>>;
  pudding: PerPlayer<Array<SushiCardsCardId>>;
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
