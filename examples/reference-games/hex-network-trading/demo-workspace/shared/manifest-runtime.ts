/**
 * Generated file.
 * Do not edit directly.
 */
// @ts-nocheck

import { z } from "zod";
import {
  buildTypedRecord,
  expectTypedId,
  isTypedId,
} from "@dreamboard-games/sdk/types";
import {
  asPlayerId,
  boardRef,
  boardRefKey,
  boardRefSchema,
  perPlayer,
  perPlayerEntries,
  perPlayerGet,
  perPlayerHas,
  perPlayerKeys,
  perPlayerSchema,
  type BoardRef,
  type PerPlayer,
  type PerPlayerBoardRef,
  type PlayerId,
  type SharedBoardRef,
} from "@dreamboard-games/sdk/reducer";
import {
  assumeManifestSchema,
  cloneManifestDefault,
  createManifestGameStateSchema,
  createManifestRuntimeSchema,
  createManifestStringLiteralSchema,
  dealToPlayerBoardContainer as createDealToPlayerBoardContainerStep,
  dealToPlayerZone as createDealToPlayerZoneStep,
  markManifestScopedSchema,
  resolveManifestPlayerIds,
  seedSharedBoardContainer as createSeedSharedBoardContainerStep,
  seedSharedBoardSpace as createSeedSharedBoardSpaceStep,
  shuffle as createShuffleStep,
  type CardIdOfManifest,
  type DieIdOfManifest,
  type PieceIdOfManifest,
  type ReducerManifestContract,
  type RuntimeCardData,
  type RuntimeCardVisibility,
  type RuntimeComponentLocation,
  type RuntimeDieData,
  type RuntimeHandVisibilityMode,
  type RuntimePieceData,
  type RuntimeRecord,
  type RuntimeTableRecord,
  type SetupBootstrapContainerRef,
  type SetupBootstrapDestinationRef,
  type SetupBootstrapPerPlayerContainerTemplateRef,
  type SetupBootstrapStep,
  type SetupProfileDefinition,
  type StaticBoards,
  type StaticBoardsJsonEnvelope,
} from "@dreamboard-games/sdk/reducer/advanced";
import staticBoardsData from "./manifest-static.json";
import { literals } from "./manifest-literals";
import type { PlayerId as PublicPlayerId, TableState as PublicTableState } from "./manifest-types";

const unknownRecordSchema = assumeManifestSchema<RuntimeRecord>(
  z.record(z.string(), z.unknown()),
);

function resolveDefaultPlayerIds(
  playerIds: readonly string[] | undefined,
): readonly PlayerId[] {
  return resolveManifestPlayerIds(
    literals.playerIds,
    playerIds,
  );
}

export { literals };

// PlayerId is an opaque brand imported from @dreamboard-games/sdk/reducer.
// We intentionally do NOT enumerate the manifest's max-players roster here:
// the runtime session may have fewer active seats than the manifest declares,
// and requiring ingress to pick a literal from the max-players set reintroduces
// the "total-record" assumption the refactor is meant to eliminate. Runtime
// roster validation is done through perPlayerSchema(runtimePlayerIds, ...)
// instead, which can be bound to the actual active roster.
const playerIdSchema = assumeManifestSchema<PublicPlayerId>(
  markManifestScopedSchema(
    z
      .string()
      .min(1)
      .transform((value) => asPlayerId(value)),
  ),
);
const phaseNameSchema = markManifestScopedSchema(z.string());
const boardLayoutSchema = createManifestStringLiteralSchema(literals.boardLayouts);
const setupOptionIdSchema = createManifestStringLiteralSchema(literals.setupOptionIds);
const setupProfileIdSchema = createManifestStringLiteralSchema(
  literals.setupProfileIds,
);
const cardSetIdSchema = createManifestStringLiteralSchema(literals.cardSetIds);
const cardTypeSchema = createManifestStringLiteralSchema(literals.cardTypes);
const cardIdSchema = createManifestStringLiteralSchema(literals.cardIds);
const deckIdSchema = createManifestStringLiteralSchema(literals.deckIds);
const handIdSchema = createManifestStringLiteralSchema(literals.handIds);
const sharedZoneIdSchema = createManifestStringLiteralSchema(literals.sharedZoneIds);
const playerZoneIdSchema = createManifestStringLiteralSchema(literals.playerZoneIds);
const zoneIdSchema = createManifestStringLiteralSchema(literals.zoneIds);
const resourceIdSchema = createManifestStringLiteralSchema(literals.resourceIds);
const pieceTypeIdSchema = createManifestStringLiteralSchema(literals.pieceTypeIds);
const pieceIdSchema = createManifestStringLiteralSchema(literals.pieceIds);
const dieTypeIdSchema = createManifestStringLiteralSchema(literals.dieTypeIds);
const dieIdSchema = createManifestStringLiteralSchema(literals.dieIds);
const boardTypeIdSchema = createManifestStringLiteralSchema(literals.boardTypeIds);
const boardBaseIdSchema = createManifestStringLiteralSchema(literals.boardBaseIds);
const boardIdSchema = createManifestStringLiteralSchema(literals.boardIds);
const boardContainerIdSchema = createManifestStringLiteralSchema(
  literals.boardContainerIds,
);
const relationTypeIdSchema = createManifestStringLiteralSchema(literals.relationTypeIds);
const edgeIdSchema = createManifestStringLiteralSchema(literals.edgeIds);
const edgeTypeIdSchema = createManifestStringLiteralSchema(literals.edgeTypeIds);
const vertexIdSchema = createManifestStringLiteralSchema(literals.vertexIds);
const vertexTypeIdSchema = createManifestStringLiteralSchema(literals.vertexTypeIds);
const spaceIdSchema = createManifestStringLiteralSchema(literals.spaceIds);
const spaceTypeIdSchema = createManifestStringLiteralSchema(literals.spaceTypeIds);

export const ids = {
  playerId: playerIdSchema,
  phaseName: phaseNameSchema,
  boardLayout: boardLayoutSchema,
  setupOptionId: setupOptionIdSchema,
  setupProfileId: setupProfileIdSchema,
  cardSetId: cardSetIdSchema,
  cardType: cardTypeSchema,
  cardId: assumeManifestSchema<CardId>(cardIdSchema),
  deckId: assumeManifestSchema<DeckId>(deckIdSchema),
  handId: assumeManifestSchema<HandId>(handIdSchema),
  sharedZoneId: sharedZoneIdSchema,
  playerZoneId: playerZoneIdSchema,
  zoneId: zoneIdSchema,
  resourceId: resourceIdSchema,
  pieceTypeId: pieceTypeIdSchema,
  pieceId: pieceIdSchema,
  dieTypeId: dieTypeIdSchema,
  dieId: dieIdSchema,
  boardTypeId: boardTypeIdSchema,
  boardBaseId: boardBaseIdSchema,
  boardId: boardIdSchema,
  boardContainerId: boardContainerIdSchema,
  relationTypeId: relationTypeIdSchema,
  edgeId: edgeIdSchema,
  edgeTypeId: edgeTypeIdSchema,
  vertexId: vertexIdSchema,
  vertexTypeId: vertexTypeIdSchema,
  spaceId: spaceIdSchema,
  spaceTypeId: spaceTypeIdSchema,
} as const;

export type { PlayerId };
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

export const cardTypes = {
  "claimMarker": "claimMarker",
  "landmark": "landmark",
  "scout": "scout",
  "shortcut": "shortcut",
  "surveyGrant": "surveyGrant",
} as const satisfies Record<string, CardType>;

export const zones = {
  "charterDeck": "charter-deck",
  "charterHand": "charter-hand",
  "charterPlayed": "charter-played",
} as const satisfies Record<string, ZoneId>;

export const records = {
  boardLayouts<Value>(
    initial: Value | ((boardLayout: BoardLayout) => Value),
  ): Record<BoardLayout, Value> {
    return buildTypedRecord(literals.boardLayouts, initial);
  },
  setupOptionIds<Value>(
    initial: Value | ((setupOptionId: SetupOptionId) => Value),
  ): Record<SetupOptionId, Value> {
    return buildTypedRecord(literals.setupOptionIds, initial);
  },
  setupProfileIds<Value>(
    initial: Value | ((setupProfileId: SetupProfileId) => Value),
  ): Record<SetupProfileId, Value> {
    return buildTypedRecord(literals.setupProfileIds, initial);
  },
  cardSetIds<Value>(
    initial: Value | ((cardSetId: CardSetId) => Value),
  ): Record<CardSetId, Value> {
    return buildTypedRecord(literals.cardSetIds, initial);
  },
  cardTypes<Value>(
    initial: Value | ((cardType: CardType) => Value),
  ): Record<CardType, Value> {
    return buildTypedRecord(literals.cardTypes, initial);
  },
  cardIds<Value>(
    initial: Value | ((cardId: CardId) => Value),
  ): Record<CardId, Value> {
    return buildTypedRecord(literals.cardIds, initial);
  },
  deckIds<Value>(
    initial: Value | ((deckId: DeckId) => Value),
  ): Record<DeckId, Value> {
    return buildTypedRecord(literals.deckIds, initial);
  },
  handIds<Value>(
    initial: Value | ((handId: HandId) => Value),
  ): Record<HandId, Value> {
    return buildTypedRecord(literals.handIds, initial);
  },
  sharedZoneIds<Value>(
    initial: Value | ((sharedZoneId: SharedZoneId) => Value),
  ): Record<SharedZoneId, Value> {
    return buildTypedRecord(literals.sharedZoneIds, initial);
  },
  playerZoneIds<Value>(
    initial: Value | ((playerZoneId: PlayerZoneId) => Value),
  ): Record<PlayerZoneId, Value> {
    return buildTypedRecord(literals.playerZoneIds, initial);
  },
  zoneIds<Value>(
    initial: Value | ((zoneId: ZoneId) => Value),
  ): Record<ZoneId, Value> {
    return buildTypedRecord(literals.zoneIds, initial);
  },
  resourceIds<Value>(
    initial: Value | ((resourceId: ResourceId) => Value),
  ): Record<ResourceId, Value> {
    return buildTypedRecord(literals.resourceIds, initial);
  },
  pieceTypeIds<Value>(
    initial: Value | ((pieceTypeId: PieceTypeId) => Value),
  ): Record<PieceTypeId, Value> {
    return buildTypedRecord(literals.pieceTypeIds, initial);
  },
  pieceIds<Value>(
    initial: Value | ((pieceId: PieceId) => Value),
  ): Record<PieceId, Value> {
    return buildTypedRecord(literals.pieceIds, initial);
  },
  dieTypeIds<Value>(
    initial: Value | ((dieTypeId: DieTypeId) => Value),
  ): Record<DieTypeId, Value> {
    return buildTypedRecord(literals.dieTypeIds, initial);
  },
  dieIds<Value>(
    initial: Value | ((dieId: DieId) => Value),
  ): Record<DieId, Value> {
    return buildTypedRecord(literals.dieIds, initial);
  },
  boardTypeIds<Value>(
    initial: Value | ((boardTypeId: BoardTypeId) => Value),
  ): Record<BoardTypeId, Value> {
    return buildTypedRecord(literals.boardTypeIds, initial);
  },
  boardBaseIds<Value>(
    initial: Value | ((boardBaseId: BoardBaseId) => Value),
  ): Record<BoardBaseId, Value> {
    return buildTypedRecord(literals.boardBaseIds, initial);
  },
  boardIds<Value>(
    initial: Value | ((boardId: BoardId) => Value),
  ): Record<BoardId, Value> {
    return buildTypedRecord(literals.boardIds, initial);
  },
  boardContainerIds<Value>(
    initial: Value | ((boardContainerId: BoardContainerId) => Value),
  ): Record<BoardContainerId, Value> {
    return buildTypedRecord(literals.boardContainerIds, initial);
  },
  relationTypeIds<Value>(
    initial: Value | ((relationTypeId: RelationTypeId) => Value),
  ): Record<RelationTypeId, Value> {
    return buildTypedRecord(literals.relationTypeIds, initial);
  },
  edgeIds<Value>(
    initial: Value | ((edgeId: EdgeId) => Value),
  ): Record<EdgeId, Value> {
    return buildTypedRecord(literals.edgeIds, initial);
  },
  edgeTypeIds<Value>(
    initial: Value | ((edgeTypeId: EdgeTypeId) => Value),
  ): Record<EdgeTypeId, Value> {
    return buildTypedRecord(literals.edgeTypeIds, initial);
  },
  vertexIds<Value>(
    initial: Value | ((vertexId: VertexId) => Value),
  ): Record<VertexId, Value> {
    return buildTypedRecord(literals.vertexIds, initial);
  },
  vertexTypeIds<Value>(
    initial: Value | ((vertexTypeId: VertexTypeId) => Value),
  ): Record<VertexTypeId, Value> {
    return buildTypedRecord(literals.vertexTypeIds, initial);
  },
  spaceIds<Value>(
    initial: Value | ((spaceId: SpaceId) => Value),
  ): Record<SpaceId, Value> {
    return buildTypedRecord(literals.spaceIds, initial);
  },
  spaceTypeIds<Value>(
    initial: Value | ((spaceTypeId: SpaceTypeId) => Value),
  ): Record<SpaceTypeId, Value> {
    return buildTypedRecord(literals.spaceTypeIds, initial);
  },
} as const;

export const idGuards = {
  isBoardLayout(value: string): value is BoardLayout {
    return isTypedId(literals.boardLayouts, value);
  },
  expectBoardLayout(value: string): BoardLayout {
    return expectTypedId(literals.boardLayouts, value, "board layout");
  },
  isSetupOptionId(value: string): value is SetupOptionId {
    return isTypedId(literals.setupOptionIds, value);
  },
  expectSetupOptionId(value: string): SetupOptionId {
    return expectTypedId(literals.setupOptionIds, value, "setup option id");
  },
  isSetupProfileId(value: string): value is SetupProfileId {
    return isTypedId(literals.setupProfileIds, value);
  },
  expectSetupProfileId(value: string): SetupProfileId {
    return expectTypedId(literals.setupProfileIds, value, "setup profile id");
  },
  isCardSetId(value: string): value is CardSetId {
    return isTypedId(literals.cardSetIds, value);
  },
  expectCardSetId(value: string): CardSetId {
    return expectTypedId(literals.cardSetIds, value, "card set id");
  },
  isCardType(value: string): value is CardType {
    return isTypedId(literals.cardTypes, value);
  },
  expectCardType(value: string): CardType {
    return expectTypedId(literals.cardTypes, value, "card type");
  },
  isCardId(value: string): value is CardId {
    return isTypedId(literals.cardIds, value);
  },
  expectCardId(value: string): CardId {
    return expectTypedId(literals.cardIds, value, "card id");
  },
  isDeckId(value: string): value is DeckId {
    return isTypedId(literals.deckIds, value);
  },
  expectDeckId(value: string): DeckId {
    return expectTypedId(literals.deckIds, value, "deck id");
  },
  isHandId(value: string): value is HandId {
    return isTypedId(literals.handIds, value);
  },
  expectHandId(value: string): HandId {
    return expectTypedId(literals.handIds, value, "hand id");
  },
  isSharedZoneId(value: string): value is SharedZoneId {
    return isTypedId(literals.sharedZoneIds, value);
  },
  expectSharedZoneId(value: string): SharedZoneId {
    return expectTypedId(literals.sharedZoneIds, value, "shared zone id");
  },
  isPlayerZoneId(value: string): value is PlayerZoneId {
    return isTypedId(literals.playerZoneIds, value);
  },
  expectPlayerZoneId(value: string): PlayerZoneId {
    return expectTypedId(literals.playerZoneIds, value, "player zone id");
  },
  isZoneId(value: string): value is ZoneId {
    return isTypedId(literals.zoneIds, value);
  },
  expectZoneId(value: string): ZoneId {
    return expectTypedId(literals.zoneIds, value, "zone id");
  },
  isResourceId(value: string): value is ResourceId {
    return isTypedId(literals.resourceIds, value);
  },
  expectResourceId(value: string): ResourceId {
    return expectTypedId(literals.resourceIds, value, "resource id");
  },
  isPieceTypeId(value: string): value is PieceTypeId {
    return isTypedId(literals.pieceTypeIds, value);
  },
  expectPieceTypeId(value: string): PieceTypeId {
    return expectTypedId(literals.pieceTypeIds, value, "piece type id");
  },
  isPieceId(value: string): value is PieceId {
    return isTypedId(literals.pieceIds, value);
  },
  expectPieceId(value: string): PieceId {
    return expectTypedId(literals.pieceIds, value, "piece id");
  },
  isDieTypeId(value: string): value is DieTypeId {
    return isTypedId(literals.dieTypeIds, value);
  },
  expectDieTypeId(value: string): DieTypeId {
    return expectTypedId(literals.dieTypeIds, value, "die type id");
  },
  isDieId(value: string): value is DieId {
    return isTypedId(literals.dieIds, value);
  },
  expectDieId(value: string): DieId {
    return expectTypedId(literals.dieIds, value, "die id");
  },
  isBoardTypeId(value: string): value is BoardTypeId {
    return isTypedId(literals.boardTypeIds, value);
  },
  expectBoardTypeId(value: string): BoardTypeId {
    return expectTypedId(literals.boardTypeIds, value, "board type id");
  },
  isBoardBaseId(value: string): value is BoardBaseId {
    return isTypedId(literals.boardBaseIds, value);
  },
  expectBoardBaseId(value: string): BoardBaseId {
    return expectTypedId(literals.boardBaseIds, value, "board base id");
  },
  isBoardId(value: string): value is BoardId {
    return isTypedId(literals.boardIds, value);
  },
  expectBoardId(value: string): BoardId {
    return expectTypedId(literals.boardIds, value, "board id");
  },
  isBoardContainerId(value: string): value is BoardContainerId {
    return isTypedId(literals.boardContainerIds, value);
  },
  expectBoardContainerId(value: string): BoardContainerId {
    return expectTypedId(literals.boardContainerIds, value, "board container id");
  },
  isRelationTypeId(value: string): value is RelationTypeId {
    return isTypedId(literals.relationTypeIds, value);
  },
  expectRelationTypeId(value: string): RelationTypeId {
    return expectTypedId(literals.relationTypeIds, value, "relation type id");
  },
  isEdgeId(value: string): value is EdgeId {
    return isTypedId(literals.edgeIds, value);
  },
  expectEdgeId(value: string): EdgeId {
    return expectTypedId(literals.edgeIds, value, "edge id");
  },
  isEdgeTypeId(value: string): value is EdgeTypeId {
    return isTypedId(literals.edgeTypeIds, value);
  },
  expectEdgeTypeId(value: string): EdgeTypeId {
    return expectTypedId(literals.edgeTypeIds, value, "edge type id");
  },
  isVertexId(value: string): value is VertexId {
    return isTypedId(literals.vertexIds, value);
  },
  expectVertexId(value: string): VertexId {
    return expectTypedId(literals.vertexIds, value, "vertex id");
  },
  isVertexTypeId(value: string): value is VertexTypeId {
    return isTypedId(literals.vertexTypeIds, value);
  },
  expectVertexTypeId(value: string): VertexTypeId {
    return expectTypedId(literals.vertexTypeIds, value, "vertex type id");
  },
  isSpaceId(value: string): value is SpaceId {
    return isTypedId(literals.spaceIds, value);
  },
  expectSpaceId(value: string): SpaceId {
    return expectTypedId(literals.spaceIds, value, "space id");
  },
  isSpaceTypeId(value: string): value is SpaceTypeId {
    return isTypedId(literals.spaceTypeIds, value);
  },
  expectSpaceTypeId(value: string): SpaceTypeId {
    return expectTypedId(literals.spaceTypeIds, value, "space type id");
  },
} as const;

// Historically this emitted PlayerRecord<T> = Record<PlayerId, T>, but that
// type reified the "total roster" assumption (one entry per max-player). It has
// been replaced throughout the generated contract with PerPlayer<T> from
// @dreamboard-games/sdk/reducer, whose entries array matches the
// actual runtime seat list.
export type SharedZoneRecord<T> = Record<SharedZoneId, T>;
export type PlayerZoneRecord<T> = Record<PlayerZoneId, PerPlayer<T>>;
export type ComponentId = CardId | PieceId | DieId;
export type ComponentIdsBySharedZoneId = {
  "charter-deck": ComponentId[];
  "charter-played": ComponentId[];
};
export type ComponentIdsByPlayerZoneId = {
  "charter-hand": PerPlayer<ComponentId[]>;
};
export type SetupOptionChoice = {
  id: string;
  label: string;
  description?: string | null;
};
export type SetupOption = {
  id: SetupOptionId;
  name: string;
  description?: string | null;
  choices: readonly SetupOptionChoice[];
};
export type SetupProfile = {
  id: SetupProfileId;
  name: string;
  description?: string | null;
  optionValues?: Partial<Record<SetupOptionId, string>> | null;
};
export const setupOptionsById = {} as const;
export const setupChoiceIdsByOptionId = {

} as const;
export const setupProfilesById = {
  "charter-verification": {
    "id": "charter-verification",
    "name": "Charter verification",
    "description": "Reducer-test profile that deals charter cards to the first player for browser interaction verification.",
    "optionValues": null
  },
  "standard": {
    "id": "standard",
    "name": "Standard",
    "description": "Standard Frontier Trails setup",
    "optionValues": null
  },
  "terminal-regression": {
    "id": "terminal-regression",
    "name": "Terminal regression",
    "description": "Reducer-test profile that starts with a latched winner pending the next end-turn boundary.",
    "optionValues": null
  }
} as const;

export type CharterCardsCardProperties = {
  "cardType": "scout" | "shortcut" | "surveyGrant" | "claimMarker" | "landmark";
};

export const CharterCardsCardPropertiesSchema = z.object({
  "cardType": z.enum(["scout", "shortcut", "surveyGrant", "claimMarker", "landmark"]),
});

export type CharterCardsCardId = "scout-1" | "scout-2" | "scout-3" | "scout-4" | "scout-5" | "scout-6" | "scout-7" | "scout-8" | "scout-9" | "scout-10" | "scout-11" | "scout-12" | "scout-13" | "scout-14" | "shortcut-1" | "shortcut-2" | "surveyGrant-1" | "surveyGrant-2" | "claimMarker-1" | "claimMarker-2" | "landmark-1" | "landmark-2" | "landmark-3" | "landmark-4" | "landmark-5";

export type FrontierBoardFields = RuntimeRecord;

export const FrontierBoardFieldsSchema = z.record(z.string(), z.unknown());

export type FrontierSpaceFields = RuntimeRecord;

export const FrontierSpaceFieldsSchema = z.record(z.string(), z.unknown());

export type FrontierEdgeFields = {
  "relayIndex"?: number;
};

export const FrontierEdgeFieldsSchema = z.object({
  "relayIndex": z.number().int().optional(),
});

export type FrontierVertexFields = RuntimeRecord;

export const FrontierVertexFieldsSchema = z.record(z.string(), z.unknown());

export type CampPieceFields = RuntimeRecord;

export const CampPieceFieldsSchema = z.record(z.string(), z.unknown());

export type StormPieceFields = RuntimeRecord;

export const StormPieceFieldsSchema = z.record(z.string(), z.unknown());

export type TownPieceFields = RuntimeRecord;

export const TownPieceFieldsSchema = z.record(z.string(), z.unknown());

export type TrailPieceFields = RuntimeRecord;

export const TrailPieceFieldsSchema = z.record(z.string(), z.unknown());

export type D6DieFields = RuntimeRecord;

export const D6DieFieldsSchema = z.record(z.string(), z.unknown());

export type BoardFieldsByBoardId = {
  "frontier": FrontierBoardFields;
};

export type BoardSpaceFieldsByBoardId = {
  "frontier": FrontierSpaceFields;
};

export type BoardRelationFieldsByBoardId = {
  "frontier": RuntimeRecord;
};

export type BoardContainerFieldsByBoardId = {
  "frontier": RuntimeRecord;
};

export type HexEdgeFieldsByBoardId = {
  "frontier": FrontierEdgeFields;
};

export type HexVertexFieldsByBoardId = {
  "frontier": FrontierVertexFields;
};

export type SquareEdgeFieldsByBoardId = Record<string, never>;

export type SquareVertexFieldsByBoardId = Record<string, never>;

export type TiledEdgeFieldsByBoardId = {
  "frontier": FrontierEdgeFields;
};

export type TiledVertexFieldsByBoardId = {
  "frontier": FrontierVertexFields;
};

export type PieceFieldsByTypeId = {
  "camp": CampPieceFields;
  "storm": StormPieceFields;
  "town": TownPieceFields;
  "trail": TrailPieceFields;
};

export type DieFieldsByTypeId = {
  "d6": D6DieFields;
};

export type CardProperties = CharterCardsCardProperties;

export type CardStateRecord<
  CardIdValue extends CardId = CardId,
  CardSetIdValue extends CardSetId = CardSetId,
  CardTypeValue extends CardType = CardType,
  Properties = RuntimeRecord,
> = Omit<RuntimeCardData, "id" | "cardSetId" | "cardType" | "properties"> & {
  id: CardIdValue;
  cardSetId: CardSetIdValue;
  cardType: CardTypeValue;
  properties: Properties;
};

export type CardStateById = {
  "claimMarker-1": CardStateRecord<"claimMarker-1", "charter-cards", "claimMarker", CharterCardsCardProperties>;
  "claimMarker-2": CardStateRecord<"claimMarker-2", "charter-cards", "claimMarker", CharterCardsCardProperties>;
  "landmark-1": CardStateRecord<"landmark-1", "charter-cards", "landmark", CharterCardsCardProperties>;
  "landmark-2": CardStateRecord<"landmark-2", "charter-cards", "landmark", CharterCardsCardProperties>;
  "landmark-3": CardStateRecord<"landmark-3", "charter-cards", "landmark", CharterCardsCardProperties>;
  "landmark-4": CardStateRecord<"landmark-4", "charter-cards", "landmark", CharterCardsCardProperties>;
  "landmark-5": CardStateRecord<"landmark-5", "charter-cards", "landmark", CharterCardsCardProperties>;
  "scout-1": CardStateRecord<"scout-1", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-10": CardStateRecord<"scout-10", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-11": CardStateRecord<"scout-11", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-12": CardStateRecord<"scout-12", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-13": CardStateRecord<"scout-13", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-14": CardStateRecord<"scout-14", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-2": CardStateRecord<"scout-2", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-3": CardStateRecord<"scout-3", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-4": CardStateRecord<"scout-4", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-5": CardStateRecord<"scout-5", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-6": CardStateRecord<"scout-6", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-7": CardStateRecord<"scout-7", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-8": CardStateRecord<"scout-8", "charter-cards", "scout", CharterCardsCardProperties>;
  "scout-9": CardStateRecord<"scout-9", "charter-cards", "scout", CharterCardsCardProperties>;
  "shortcut-1": CardStateRecord<"shortcut-1", "charter-cards", "shortcut", CharterCardsCardProperties>;
  "shortcut-2": CardStateRecord<"shortcut-2", "charter-cards", "shortcut", CharterCardsCardProperties>;
  "surveyGrant-1": CardStateRecord<"surveyGrant-1", "charter-cards", "surveyGrant", CharterCardsCardProperties>;
  "surveyGrant-2": CardStateRecord<"surveyGrant-2", "charter-cards", "surveyGrant", CharterCardsCardProperties>;
};

export type PieceStateRecord<
  PieceIdValue extends PieceId = PieceId,
  PieceTypeIdValue extends PieceTypeId = PieceTypeId,
  Fields = RuntimeRecord,
> = Omit<RuntimePieceData, "id" | "pieceTypeId" | "properties"> & {
  id: PieceIdValue;
  pieceTypeId: PieceTypeIdValue;
  properties: Fields;
};

export type DieStateRecord<
  DieIdValue extends DieId = DieId,
  DieTypeIdValue extends DieTypeId = DieTypeId,
  Fields = RuntimeRecord,
> = Omit<RuntimeDieData, "id" | "dieTypeId" | "properties"> & {
  id: DieIdValue;
  dieTypeId: DieTypeIdValue;
  properties: Fields;
};

export type PieceStateById = {
  "camp-p1-1": PieceStateRecord<"camp-p1-1", "camp", CampPieceFields>;
  "camp-p1-2": PieceStateRecord<"camp-p1-2", "camp", CampPieceFields>;
  "camp-p1-3": PieceStateRecord<"camp-p1-3", "camp", CampPieceFields>;
  "camp-p1-4": PieceStateRecord<"camp-p1-4", "camp", CampPieceFields>;
  "camp-p1-5": PieceStateRecord<"camp-p1-5", "camp", CampPieceFields>;
  "camp-p2-1": PieceStateRecord<"camp-p2-1", "camp", CampPieceFields>;
  "camp-p2-2": PieceStateRecord<"camp-p2-2", "camp", CampPieceFields>;
  "camp-p2-3": PieceStateRecord<"camp-p2-3", "camp", CampPieceFields>;
  "camp-p2-4": PieceStateRecord<"camp-p2-4", "camp", CampPieceFields>;
  "camp-p2-5": PieceStateRecord<"camp-p2-5", "camp", CampPieceFields>;
  "camp-p3-1": PieceStateRecord<"camp-p3-1", "camp", CampPieceFields>;
  "camp-p3-2": PieceStateRecord<"camp-p3-2", "camp", CampPieceFields>;
  "camp-p3-3": PieceStateRecord<"camp-p3-3", "camp", CampPieceFields>;
  "camp-p3-4": PieceStateRecord<"camp-p3-4", "camp", CampPieceFields>;
  "camp-p3-5": PieceStateRecord<"camp-p3-5", "camp", CampPieceFields>;
  "camp-p4-1": PieceStateRecord<"camp-p4-1", "camp", CampPieceFields>;
  "camp-p4-2": PieceStateRecord<"camp-p4-2", "camp", CampPieceFields>;
  "camp-p4-3": PieceStateRecord<"camp-p4-3", "camp", CampPieceFields>;
  "camp-p4-4": PieceStateRecord<"camp-p4-4", "camp", CampPieceFields>;
  "camp-p4-5": PieceStateRecord<"camp-p4-5", "camp", CampPieceFields>;
  "storm": PieceStateRecord<"storm", "storm", StormPieceFields>;
  "town-p1-1": PieceStateRecord<"town-p1-1", "town", TownPieceFields>;
  "town-p1-2": PieceStateRecord<"town-p1-2", "town", TownPieceFields>;
  "town-p1-3": PieceStateRecord<"town-p1-3", "town", TownPieceFields>;
  "town-p1-4": PieceStateRecord<"town-p1-4", "town", TownPieceFields>;
  "town-p2-1": PieceStateRecord<"town-p2-1", "town", TownPieceFields>;
  "town-p2-2": PieceStateRecord<"town-p2-2", "town", TownPieceFields>;
  "town-p2-3": PieceStateRecord<"town-p2-3", "town", TownPieceFields>;
  "town-p2-4": PieceStateRecord<"town-p2-4", "town", TownPieceFields>;
  "town-p3-1": PieceStateRecord<"town-p3-1", "town", TownPieceFields>;
  "town-p3-2": PieceStateRecord<"town-p3-2", "town", TownPieceFields>;
  "town-p3-3": PieceStateRecord<"town-p3-3", "town", TownPieceFields>;
  "town-p3-4": PieceStateRecord<"town-p3-4", "town", TownPieceFields>;
  "town-p4-1": PieceStateRecord<"town-p4-1", "town", TownPieceFields>;
  "town-p4-2": PieceStateRecord<"town-p4-2", "town", TownPieceFields>;
  "town-p4-3": PieceStateRecord<"town-p4-3", "town", TownPieceFields>;
  "town-p4-4": PieceStateRecord<"town-p4-4", "town", TownPieceFields>;
  "trail-p1-1": PieceStateRecord<"trail-p1-1", "trail", TrailPieceFields>;
  "trail-p1-10": PieceStateRecord<"trail-p1-10", "trail", TrailPieceFields>;
  "trail-p1-11": PieceStateRecord<"trail-p1-11", "trail", TrailPieceFields>;
  "trail-p1-12": PieceStateRecord<"trail-p1-12", "trail", TrailPieceFields>;
  "trail-p1-13": PieceStateRecord<"trail-p1-13", "trail", TrailPieceFields>;
  "trail-p1-14": PieceStateRecord<"trail-p1-14", "trail", TrailPieceFields>;
  "trail-p1-15": PieceStateRecord<"trail-p1-15", "trail", TrailPieceFields>;
  "trail-p1-2": PieceStateRecord<"trail-p1-2", "trail", TrailPieceFields>;
  "trail-p1-3": PieceStateRecord<"trail-p1-3", "trail", TrailPieceFields>;
  "trail-p1-4": PieceStateRecord<"trail-p1-4", "trail", TrailPieceFields>;
  "trail-p1-5": PieceStateRecord<"trail-p1-5", "trail", TrailPieceFields>;
  "trail-p1-6": PieceStateRecord<"trail-p1-6", "trail", TrailPieceFields>;
  "trail-p1-7": PieceStateRecord<"trail-p1-7", "trail", TrailPieceFields>;
  "trail-p1-8": PieceStateRecord<"trail-p1-8", "trail", TrailPieceFields>;
  "trail-p1-9": PieceStateRecord<"trail-p1-9", "trail", TrailPieceFields>;
  "trail-p2-1": PieceStateRecord<"trail-p2-1", "trail", TrailPieceFields>;
  "trail-p2-10": PieceStateRecord<"trail-p2-10", "trail", TrailPieceFields>;
  "trail-p2-11": PieceStateRecord<"trail-p2-11", "trail", TrailPieceFields>;
  "trail-p2-12": PieceStateRecord<"trail-p2-12", "trail", TrailPieceFields>;
  "trail-p2-13": PieceStateRecord<"trail-p2-13", "trail", TrailPieceFields>;
  "trail-p2-14": PieceStateRecord<"trail-p2-14", "trail", TrailPieceFields>;
  "trail-p2-15": PieceStateRecord<"trail-p2-15", "trail", TrailPieceFields>;
  "trail-p2-2": PieceStateRecord<"trail-p2-2", "trail", TrailPieceFields>;
  "trail-p2-3": PieceStateRecord<"trail-p2-3", "trail", TrailPieceFields>;
  "trail-p2-4": PieceStateRecord<"trail-p2-4", "trail", TrailPieceFields>;
  "trail-p2-5": PieceStateRecord<"trail-p2-5", "trail", TrailPieceFields>;
  "trail-p2-6": PieceStateRecord<"trail-p2-6", "trail", TrailPieceFields>;
  "trail-p2-7": PieceStateRecord<"trail-p2-7", "trail", TrailPieceFields>;
  "trail-p2-8": PieceStateRecord<"trail-p2-8", "trail", TrailPieceFields>;
  "trail-p2-9": PieceStateRecord<"trail-p2-9", "trail", TrailPieceFields>;
  "trail-p3-1": PieceStateRecord<"trail-p3-1", "trail", TrailPieceFields>;
  "trail-p3-10": PieceStateRecord<"trail-p3-10", "trail", TrailPieceFields>;
  "trail-p3-11": PieceStateRecord<"trail-p3-11", "trail", TrailPieceFields>;
  "trail-p3-12": PieceStateRecord<"trail-p3-12", "trail", TrailPieceFields>;
  "trail-p3-13": PieceStateRecord<"trail-p3-13", "trail", TrailPieceFields>;
  "trail-p3-14": PieceStateRecord<"trail-p3-14", "trail", TrailPieceFields>;
  "trail-p3-15": PieceStateRecord<"trail-p3-15", "trail", TrailPieceFields>;
  "trail-p3-2": PieceStateRecord<"trail-p3-2", "trail", TrailPieceFields>;
  "trail-p3-3": PieceStateRecord<"trail-p3-3", "trail", TrailPieceFields>;
  "trail-p3-4": PieceStateRecord<"trail-p3-4", "trail", TrailPieceFields>;
  "trail-p3-5": PieceStateRecord<"trail-p3-5", "trail", TrailPieceFields>;
  "trail-p3-6": PieceStateRecord<"trail-p3-6", "trail", TrailPieceFields>;
  "trail-p3-7": PieceStateRecord<"trail-p3-7", "trail", TrailPieceFields>;
  "trail-p3-8": PieceStateRecord<"trail-p3-8", "trail", TrailPieceFields>;
  "trail-p3-9": PieceStateRecord<"trail-p3-9", "trail", TrailPieceFields>;
  "trail-p4-1": PieceStateRecord<"trail-p4-1", "trail", TrailPieceFields>;
  "trail-p4-10": PieceStateRecord<"trail-p4-10", "trail", TrailPieceFields>;
  "trail-p4-11": PieceStateRecord<"trail-p4-11", "trail", TrailPieceFields>;
  "trail-p4-12": PieceStateRecord<"trail-p4-12", "trail", TrailPieceFields>;
  "trail-p4-13": PieceStateRecord<"trail-p4-13", "trail", TrailPieceFields>;
  "trail-p4-14": PieceStateRecord<"trail-p4-14", "trail", TrailPieceFields>;
  "trail-p4-15": PieceStateRecord<"trail-p4-15", "trail", TrailPieceFields>;
  "trail-p4-2": PieceStateRecord<"trail-p4-2", "trail", TrailPieceFields>;
  "trail-p4-3": PieceStateRecord<"trail-p4-3", "trail", TrailPieceFields>;
  "trail-p4-4": PieceStateRecord<"trail-p4-4", "trail", TrailPieceFields>;
  "trail-p4-5": PieceStateRecord<"trail-p4-5", "trail", TrailPieceFields>;
  "trail-p4-6": PieceStateRecord<"trail-p4-6", "trail", TrailPieceFields>;
  "trail-p4-7": PieceStateRecord<"trail-p4-7", "trail", TrailPieceFields>;
  "trail-p4-8": PieceStateRecord<"trail-p4-8", "trail", TrailPieceFields>;
  "trail-p4-9": PieceStateRecord<"trail-p4-9", "trail", TrailPieceFields>;
};

export type DieStateById = {
  "die-1": DieStateRecord<"die-1", "d6", D6DieFields>;
  "die-2": DieStateRecord<"die-2", "d6", D6DieFields>;
};
export type CardIdsBySharedZoneId = {
  "charter-deck": Array<"claimMarker-1" | "claimMarker-2" | "landmark-1" | "landmark-2" | "landmark-3" | "landmark-4" | "landmark-5" | "scout-1" | "scout-10" | "scout-11" | "scout-12" | "scout-13" | "scout-14" | "scout-2" | "scout-3" | "scout-4" | "scout-5" | "scout-6" | "scout-7" | "scout-8" | "scout-9" | "shortcut-1" | "shortcut-2" | "surveyGrant-1" | "surveyGrant-2">;
  "charter-played": Array<"claimMarker-1" | "claimMarker-2" | "landmark-1" | "landmark-2" | "landmark-3" | "landmark-4" | "landmark-5" | "scout-1" | "scout-10" | "scout-11" | "scout-12" | "scout-13" | "scout-14" | "scout-2" | "scout-3" | "scout-4" | "scout-5" | "scout-6" | "scout-7" | "scout-8" | "scout-9" | "shortcut-1" | "shortcut-2" | "surveyGrant-1" | "surveyGrant-2">;
};
export type CardIdsByPlayerZoneId = {
  "charter-hand": PerPlayer<Array<"claimMarker-1" | "claimMarker-2" | "landmark-1" | "landmark-2" | "landmark-3" | "landmark-4" | "landmark-5" | "scout-1" | "scout-10" | "scout-11" | "scout-12" | "scout-13" | "scout-14" | "scout-2" | "scout-3" | "scout-4" | "scout-5" | "scout-6" | "scout-7" | "scout-8" | "scout-9" | "shortcut-1" | "shortcut-2" | "surveyGrant-1" | "surveyGrant-2">>;
};
export type CardIdsByDeckId = CardIdsBySharedZoneId;

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
  host:
    | { type: "board" }
    | {
        type: "space";
        spaceId: SpaceIdValue;
      };
  allowedCardSetIds?: readonly CardSetId[];
  zoneId: string;
  fields: Fields;
}

export interface BoardStateRecordBase<
  BoardIdValue extends BoardId = BoardId,
  SpaceIdValue extends SpaceId = SpaceId,
  ContainerIdValue extends BoardContainerId = BoardContainerId,
  BoardFields = RuntimeRecord,
  SpaceFields = RuntimeRecord,
  RelationFields = RuntimeRecord,
  ContainerFields = RuntimeRecord,
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
> extends BoardStateRecordBase<
    BoardIdValue,
    SpaceIdValue,
    ContainerIdValue,
    BoardFields,
    SpaceFields,
    RelationFields,
    ContainerFields
  > {
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
> extends BoardStateRecordBase<
    BoardIdValue,
    SpaceIdValue,
    never,
    BoardFields,
    SpaceFields,
    RuntimeRecord,
    RuntimeRecord
  > {
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
> extends BoardStateRecordBase<
    BoardIdValue,
    SpaceIdValue,
    ContainerIdValue,
    BoardFields,
    SpaceFields,
    RelationFields,
    ContainerFields
  > {
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

export type TiledBoardStateRecord =
  | HexBoardStateRecord
  | SquareBoardStateRecord;

export type BoardStateById = {
  "frontier": HexBoardStateRecord<"frontier", "h-0-0" | "h-1-0" | "h-1-1" | "h-1-2" | "h-1-3" | "h-1-4" | "h-1-5" | "h-2-0" | "h-2-1" | "h-2-10" | "h-2-11" | "h-2-2" | "h-2-3" | "h-2-4" | "h-2-5" | "h-2-6" | "h-2-7" | "h-2-8" | "h-2-9" | "o-0" | "o-1" | "o-10" | "o-11" | "o-12" | "o-13" | "o-14" | "o-15" | "o-16" | "o-17" | "o-2" | "o-3" | "o-4" | "o-5" | "o-6" | "o-7" | "o-8" | "o-9", "hex-edge:-1,-1,2::-2,-2,4" | "hex-edge:-1,-1,2::-2,1,1" | "hex-edge:-1,-1,2::1,-2,1" | "hex-edge:-1,-10,11::-2,-8,10" | "hex-edge:-1,-10,11::1,-11,10" | "hex-edge:-1,-4,5::-2,-2,4" | "hex-edge:-1,-4,5::-2,-5,7" | "hex-edge:-1,-4,5::1,-5,4" | "hex-edge:-1,-7,8::-2,-5,7" | "hex-edge:-1,-7,8::-2,-8,10" | "hex-edge:-1,-7,8::1,-8,7" | "hex-edge:-1,11,-10::-2,10,-8" | "hex-edge:-1,11,-10::1,10,-11" | "hex-edge:-1,2,-1::-2,1,1" | "hex-edge:-1,2,-1::-2,4,-2" | "hex-edge:-1,2,-1::1,1,-2" | "hex-edge:-1,5,-4::-2,4,-2" | "hex-edge:-1,5,-4::-2,7,-5" | "hex-edge:-1,5,-4::1,4,-5" | "hex-edge:-1,8,-7::-2,10,-8" | "hex-edge:-1,8,-7::-2,7,-5" | "hex-edge:-1,8,-7::1,7,-8" | "hex-edge:-10,-1,11::-11,1,10" | "hex-edge:-10,-1,11::-8,-2,10" | "hex-edge:-10,11,-1::-11,10,1" | "hex-edge:-10,11,-1::-8,10,-2" | "hex-edge:-10,2,8::-11,1,10" | "hex-edge:-10,2,8::-11,4,7" | "hex-edge:-10,2,8::-8,1,7" | "hex-edge:-10,5,5::-11,4,7" | "hex-edge:-10,5,5::-11,7,4" | "hex-edge:-10,5,5::-8,4,4" | "hex-edge:-10,8,2::-11,10,1" | "hex-edge:-10,8,2::-11,7,4" | "hex-edge:-10,8,2::-8,7,1" | "hex-edge:-2,-2,4::-4,-1,5" | "hex-edge:-2,-5,7::-4,-4,8" | "hex-edge:-2,-8,10::-4,-7,11" | "hex-edge:-2,1,1::-4,2,2" | "hex-edge:-2,10,-8::-4,11,-7" | "hex-edge:-2,4,-2::-4,5,-1" | "hex-edge:-2,7,-5::-4,8,-4" | "hex-edge:-4,-1,5::-5,-2,7" | "hex-edge:-4,-1,5::-5,1,4" | "hex-edge:-4,-4,8::-5,-2,7" | "hex-edge:-4,-4,8::-5,-5,10" | "hex-edge:-4,-7,11::-5,-5,10" | "hex-edge:-4,11,-7::-5,10,-5" | "hex-edge:-4,2,2::-5,1,4" | "hex-edge:-4,2,2::-5,4,1" | "hex-edge:-4,5,-1::-5,4,1" | "hex-edge:-4,5,-1::-5,7,-2" | "hex-edge:-4,8,-4::-5,10,-5" | "hex-edge:-4,8,-4::-5,7,-2" | "hex-edge:-5,-2,7::-7,-1,8" | "hex-edge:-5,-5,10::-7,-4,11" | "hex-edge:-5,1,4::-7,2,5" | "hex-edge:-5,10,-5::-7,11,-4" | "hex-edge:-5,4,1::-7,5,2" | "hex-edge:-5,7,-2::-7,8,-1" | "hex-edge:-7,-1,8::-8,-2,10" | "hex-edge:-7,-1,8::-8,1,7" | "hex-edge:-7,-4,11::-8,-2,10" | "hex-edge:-7,11,-4::-8,10,-2" | "hex-edge:-7,2,5::-8,1,7" | "hex-edge:-7,2,5::-8,4,4" | "hex-edge:-7,5,2::-8,4,4" | "hex-edge:-7,5,2::-8,7,1" | "hex-edge:-7,8,-1::-8,10,-2" | "hex-edge:-7,8,-1::-8,7,1" | "hex-edge:1,-11,10::2,-10,8" | "hex-edge:1,-2,1::2,-1,-1" | "hex-edge:1,-2,1::2,-4,2" | "hex-edge:1,-5,4::2,-4,2" | "hex-edge:1,-5,4::2,-7,5" | "hex-edge:1,-8,7::2,-10,8" | "hex-edge:1,-8,7::2,-7,5" | "hex-edge:1,1,-2::2,-1,-1" | "hex-edge:1,1,-2::2,2,-4" | "hex-edge:1,10,-11::2,8,-10" | "hex-edge:1,4,-5::2,2,-4" | "hex-edge:1,4,-5::2,5,-7" | "hex-edge:1,7,-8::2,5,-7" | "hex-edge:1,7,-8::2,8,-10" | "hex-edge:10,-11,1::11,-10,-1" | "hex-edge:10,-11,1::8,-10,2" | "hex-edge:10,-2,-8::11,-1,-10" | "hex-edge:10,-2,-8::11,-4,-7" | "hex-edge:10,-2,-8::8,-1,-7" | "hex-edge:10,-5,-5::11,-4,-7" | "hex-edge:10,-5,-5::11,-7,-4" | "hex-edge:10,-5,-5::8,-4,-4" | "hex-edge:10,-8,-2::11,-10,-1" | "hex-edge:10,-8,-2::11,-7,-4" | "hex-edge:10,-8,-2::8,-7,-1" | "hex-edge:10,1,-11::11,-1,-10" | "hex-edge:10,1,-11::8,2,-10" | "hex-edge:2,-1,-1::4,-2,-2" | "hex-edge:2,-10,8::4,-11,7" | "hex-edge:2,-4,2::4,-5,1" | "hex-edge:2,-7,5::4,-8,4" | "hex-edge:2,2,-4::4,1,-5" | "hex-edge:2,5,-7::4,4,-8" | "hex-edge:2,8,-10::4,7,-11" | "hex-edge:4,-11,7::5,-10,5" | "hex-edge:4,-2,-2::5,-1,-4" | "hex-edge:4,-2,-2::5,-4,-1" | "hex-edge:4,-5,1::5,-4,-1" | "hex-edge:4,-5,1::5,-7,2" | "hex-edge:4,-8,4::5,-10,5" | "hex-edge:4,-8,4::5,-7,2" | "hex-edge:4,1,-5::5,-1,-4" | "hex-edge:4,1,-5::5,2,-7" | "hex-edge:4,4,-8::5,2,-7" | "hex-edge:4,4,-8::5,5,-10" | "hex-edge:4,7,-11::5,5,-10" | "hex-edge:5,-1,-4::7,-2,-5" | "hex-edge:5,-10,5::7,-11,4" | "hex-edge:5,-4,-1::7,-5,-2" | "hex-edge:5,-7,2::7,-8,1" | "hex-edge:5,2,-7::7,1,-8" | "hex-edge:5,5,-10::7,4,-11" | "hex-edge:7,-11,4::8,-10,2" | "hex-edge:7,-2,-5::8,-1,-7" | "hex-edge:7,-2,-5::8,-4,-4" | "hex-edge:7,-5,-2::8,-4,-4" | "hex-edge:7,-5,-2::8,-7,-1" | "hex-edge:7,-8,1::8,-10,2" | "hex-edge:7,-8,1::8,-7,-1" | "hex-edge:7,1,-8::8,-1,-7" | "hex-edge:7,1,-8::8,2,-10" | "hex-edge:7,4,-11::8,2,-10", "hex-vertex:-1,-1,2" | "hex-vertex:-1,-10,11" | "hex-vertex:-1,-4,5" | "hex-vertex:-1,-7,8" | "hex-vertex:-1,11,-10" | "hex-vertex:-1,2,-1" | "hex-vertex:-1,5,-4" | "hex-vertex:-1,8,-7" | "hex-vertex:-10,-1,11" | "hex-vertex:-10,11,-1" | "hex-vertex:-10,2,8" | "hex-vertex:-10,5,5" | "hex-vertex:-10,8,2" | "hex-vertex:-11,1,10" | "hex-vertex:-11,10,1" | "hex-vertex:-11,4,7" | "hex-vertex:-11,7,4" | "hex-vertex:-2,-2,4" | "hex-vertex:-2,-5,7" | "hex-vertex:-2,-8,10" | "hex-vertex:-2,1,1" | "hex-vertex:-2,10,-8" | "hex-vertex:-2,4,-2" | "hex-vertex:-2,7,-5" | "hex-vertex:-4,-1,5" | "hex-vertex:-4,-4,8" | "hex-vertex:-4,-7,11" | "hex-vertex:-4,11,-7" | "hex-vertex:-4,2,2" | "hex-vertex:-4,5,-1" | "hex-vertex:-4,8,-4" | "hex-vertex:-5,-2,7" | "hex-vertex:-5,-5,10" | "hex-vertex:-5,1,4" | "hex-vertex:-5,10,-5" | "hex-vertex:-5,4,1" | "hex-vertex:-5,7,-2" | "hex-vertex:-7,-1,8" | "hex-vertex:-7,-4,11" | "hex-vertex:-7,11,-4" | "hex-vertex:-7,2,5" | "hex-vertex:-7,5,2" | "hex-vertex:-7,8,-1" | "hex-vertex:-8,-2,10" | "hex-vertex:-8,1,7" | "hex-vertex:-8,10,-2" | "hex-vertex:-8,4,4" | "hex-vertex:-8,7,1" | "hex-vertex:1,-11,10" | "hex-vertex:1,-2,1" | "hex-vertex:1,-5,4" | "hex-vertex:1,-8,7" | "hex-vertex:1,1,-2" | "hex-vertex:1,10,-11" | "hex-vertex:1,4,-5" | "hex-vertex:1,7,-8" | "hex-vertex:10,-11,1" | "hex-vertex:10,-2,-8" | "hex-vertex:10,-5,-5" | "hex-vertex:10,-8,-2" | "hex-vertex:10,1,-11" | "hex-vertex:11,-1,-10" | "hex-vertex:11,-10,-1" | "hex-vertex:11,-4,-7" | "hex-vertex:11,-7,-4" | "hex-vertex:2,-1,-1" | "hex-vertex:2,-10,8" | "hex-vertex:2,-4,2" | "hex-vertex:2,-7,5" | "hex-vertex:2,2,-4" | "hex-vertex:2,5,-7" | "hex-vertex:2,8,-10" | "hex-vertex:4,-11,7" | "hex-vertex:4,-2,-2" | "hex-vertex:4,-5,1" | "hex-vertex:4,-8,4" | "hex-vertex:4,1,-5" | "hex-vertex:4,4,-8" | "hex-vertex:4,7,-11" | "hex-vertex:5,-1,-4" | "hex-vertex:5,-10,5" | "hex-vertex:5,-4,-1" | "hex-vertex:5,-7,2" | "hex-vertex:5,2,-7" | "hex-vertex:5,5,-10" | "hex-vertex:7,-11,4" | "hex-vertex:7,-2,-5" | "hex-vertex:7,-5,-2" | "hex-vertex:7,-8,1" | "hex-vertex:7,1,-8" | "hex-vertex:7,4,-11" | "hex-vertex:8,-1,-7" | "hex-vertex:8,-10,2" | "hex-vertex:8,-4,-4" | "hex-vertex:8,-7,-1" | "hex-vertex:8,2,-10", FrontierBoardFields, FrontierSpaceFields, FrontierEdgeFields, FrontierVertexFields>;
};

export type HexBoardStateById = {
  "frontier": BoardStateById["frontier"];
};

export type SquareBoardStateById = Record<string, never>;

type ManifestRecordValue<T> = T[keyof T];
type ManifestArrayElement<T> =
  T extends readonly (infer Item)[]
    ? Item
    : T extends (infer Item)[]
      ? Item
      : never;

export type BoardState<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardStateById ? BoardStateById[BoardIdValue] : never;

export type BoardFields<BoardIdValue extends BoardId = BoardId> =
  BoardState<BoardIdValue> extends { fields: infer Fields } ? Fields : never;

export type BoardSpaceStateByBoardId = {
  [BoardIdValue in keyof BoardStateById]: ManifestRecordValue<
    BoardStateById[BoardIdValue]["spaces"]
  >;
};

export type BoardSpaceState<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardSpaceStateByBoardId
    ? BoardSpaceStateByBoardId[BoardIdValue]
    : never;

export type BoardSpaceFields<BoardIdValue extends BoardId = BoardId> =
  BoardSpaceState<BoardIdValue> extends { fields: infer Fields }
    ? Fields
    : never;

export type BoardRelationStateByBoardId = {
  [BoardIdValue in keyof BoardStateById]: ManifestArrayElement<
    BoardStateById[BoardIdValue]["relations"]
  >;
};

export type BoardRelationState<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardRelationStateByBoardId
    ? BoardRelationStateByBoardId[BoardIdValue]
    : never;

export type BoardRelationFields<BoardIdValue extends BoardId = BoardId> =
  BoardRelationState<BoardIdValue> extends { fields: infer Fields }
    ? Fields
    : never;

export type BoardContainerStateByBoardId = {
  [BoardIdValue in keyof BoardStateById]: ManifestRecordValue<
    BoardStateById[BoardIdValue]["containers"]
  >;
};

export type BoardContainerState<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardContainerStateByBoardId
    ? BoardContainerStateByBoardId[BoardIdValue]
    : never;

export type BoardContainerFields<BoardIdValue extends BoardId = BoardId> =
  BoardContainerState<BoardIdValue> extends { fields: infer Fields }
    ? Fields
    : never;

type HexAuthoredEdgesByBoardId = typeof authoredHexEdgesByBoardIdLookup;
type HexAuthoredVerticesByBoardId = typeof authoredHexVerticesByBoardIdLookup;

export type HexAuthoredEdgeState<
  BoardIdValue extends keyof HexAuthoredEdgesByBoardId = keyof HexAuthoredEdgesByBoardId,
> = BoardIdValue extends keyof HexAuthoredEdgesByBoardId
  ? ManifestArrayElement<HexAuthoredEdgesByBoardId[BoardIdValue]>
  : never;

export type HexAuthoredEdgeRef<
  BoardIdValue extends keyof HexAuthoredEdgesByBoardId = keyof HexAuthoredEdgesByBoardId,
> = HexAuthoredEdgeState<BoardIdValue> extends { ref: infer Ref } ? Ref : never;

export type HexAuthoredVertexState<
  BoardIdValue extends keyof HexAuthoredVerticesByBoardId = keyof HexAuthoredVerticesByBoardId,
> = BoardIdValue extends keyof HexAuthoredVerticesByBoardId
  ? ManifestArrayElement<HexAuthoredVerticesByBoardId[BoardIdValue]>
  : never;

export type HexAuthoredVertexRef<
  BoardIdValue extends keyof HexAuthoredVerticesByBoardId = keyof HexAuthoredVerticesByBoardId,
> = HexAuthoredVertexState<BoardIdValue> extends { ref: infer Ref }
  ? Ref
  : never;

export type HexEdgeState<
  BoardIdValue extends keyof HexBoardStateById = keyof HexBoardStateById,
> = BoardIdValue extends keyof HexBoardStateById
  ? ManifestArrayElement<HexBoardStateById[BoardIdValue]["edges"]>
  : never;

export type HexEdgeFields<
  BoardIdValue extends keyof HexBoardStateById = keyof HexBoardStateById,
> = HexEdgeState<BoardIdValue> extends { fields: infer Fields }
  ? Fields
  : never;

export type HexVertexState<
  BoardIdValue extends keyof HexBoardStateById = keyof HexBoardStateById,
> = BoardIdValue extends keyof HexBoardStateById
  ? ManifestArrayElement<HexBoardStateById[BoardIdValue]["vertices"]>
  : never;

export type HexVertexFields<
  BoardIdValue extends keyof HexBoardStateById = keyof HexBoardStateById,
> = HexVertexState<BoardIdValue> extends { fields: infer Fields }
  ? Fields
  : never;

export type SquareEdgeState<
  BoardIdValue extends keyof SquareBoardStateById = keyof SquareBoardStateById,
> = BoardIdValue extends keyof SquareBoardStateById
  ? ManifestArrayElement<SquareBoardStateById[BoardIdValue]["edges"]>
  : never;

export type SquareEdgeFields<
  BoardIdValue extends keyof SquareBoardStateById = keyof SquareBoardStateById,
> = SquareEdgeState<BoardIdValue> extends { fields: infer Fields }
  ? Fields
  : never;

export type SquareVertexState<
  BoardIdValue extends keyof SquareBoardStateById = keyof SquareBoardStateById,
> = BoardIdValue extends keyof SquareBoardStateById
  ? ManifestArrayElement<SquareBoardStateById[BoardIdValue]["vertices"]>
  : never;

export type SquareVertexFields<
  BoardIdValue extends keyof SquareBoardStateById = keyof SquareBoardStateById,
> = SquareVertexState<BoardIdValue> extends { fields: infer Fields }
  ? Fields
  : never;

export type TiledBoardId = keyof HexBoardStateById | keyof SquareBoardStateById;

export type TiledEdgeState<BoardIdValue extends TiledBoardId = TiledBoardId> =
  BoardIdValue extends keyof HexBoardStateById
    ? HexEdgeState<BoardIdValue>
    : BoardIdValue extends keyof SquareBoardStateById
      ? SquareEdgeState<BoardIdValue>
      : never;

export type TiledEdgeFields<BoardIdValue extends TiledBoardId = TiledBoardId> =
  TiledEdgeState<BoardIdValue> extends { fields: infer Fields }
    ? Fields
    : never;

export type TiledVertexState<
  BoardIdValue extends TiledBoardId = TiledBoardId,
> = BoardIdValue extends keyof HexBoardStateById
  ? HexVertexState<BoardIdValue>
  : BoardIdValue extends keyof SquareBoardStateById
    ? SquareVertexState<BoardIdValue>
    : never;

export type TiledVertexFields<
  BoardIdValue extends TiledBoardId = TiledBoardId,
> = TiledVertexState<BoardIdValue> extends { fields: infer Fields }
  ? Fields
  : never;

export type BoardStateRecord = BoardStateById[BoardId];

export type TableState = RuntimeTableRecord & {
  playerOrder: PlayerId[];
  zones: RuntimeTableRecord["zones"] & {
    visibility: Record<ZoneId, RuntimeHandVisibilityMode>;
    cardSetIdsByZoneId?: Record<ZoneId, readonly CardSetId[]>;
  };
  decks: Record<SharedZoneId, CardId[]>;
  hands: Record<PlayerZoneId, PerPlayer<CardId[]>>;
  handVisibility: Record<PlayerZoneId, RuntimeHandVisibilityMode>;
  cards: CardStateById;
  pieces: Record<PieceId, RuntimePieceData>;
  componentLocations: Record<ComponentId, RuntimeComponentLocation>;
  ownerOfCard: Record<CardId, PlayerId | null>;
  visibility: Record<CardId, RuntimeCardVisibility>;
  resources: PerPlayer<Record<ResourceId, number>>;
  boards: RuntimeTableRecord["boards"];
  dice: Record<DieId, RuntimeDieData>;
};

const sharedZoneSchema = z.record(sharedZoneIdSchema, z.array(z.string()));
// PerPlayer<Array<string>> wire shape only: { __perPlayer: true, entries: [[playerId, value], ...] }.
const playerZoneSchema = z.record(
  playerZoneIdSchema,
  perPlayerSchema(z.array(z.string())),
);
const cardStateSchema = z.object({
  componentType: z.string().optional(),
  id: ids.cardId,
  cardSetId: ids.cardSetId,
  cardType: ids.cardType,
  name: z.string().optional(),
  text: z.string().optional(),
  properties: unknownRecordSchema,
});
const cardPropertiesSchemaByCardSetId: Record<string, z.ZodType<unknown>> = {
  "charter-cards": CharterCardsCardPropertiesSchema,
};
function createCardStateSchema<CardIdValue extends CardId>(
  cardId: CardIdValue,
): z.ZodType<CardStateById[CardIdValue]> {
  const cardSetId = literals.cardSetIdByCardId[cardId];
  const cardType = literals.cardTypeByCardId[cardId];
  const cardPropertiesSchema =
    cardPropertiesSchemaByCardSetId[cardSetId + ":" + cardType] ??
    cardPropertiesSchemaByCardSetId[cardSetId] ??
    unknownRecordSchema;
  return assumeManifestSchema<CardStateById[CardIdValue]>(
    cardStateSchema.extend({
      id: z.literal(cardId),
      cardSetId: z.literal(cardSetId),
      cardType: z.literal(cardType),
      properties: cardPropertiesSchema,
    }),
  );
}
const cardStateByIdSchema = z.object(
  Object.fromEntries(
    literals.cardIds.map((cardId) => [cardId, createCardStateSchema(cardId)]),
  ) as Record<CardId, z.ZodType<unknown>>,
);
const pieceStateByIdSchema = z.object({
  "camp-p1-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p1-1"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p1-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p1-2"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p1-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p1-3"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p1-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p1-4"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p1-5": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p1-5"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p2-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p2-1"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p2-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p2-2"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p2-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p2-3"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p2-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p2-4"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p2-5": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p2-5"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p3-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p3-1"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p3-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p3-2"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p3-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p3-3"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p3-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p3-4"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p3-5": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p3-5"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p4-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p4-1"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p4-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p4-2"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p4-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p4-3"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p4-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p4-4"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "camp-p4-5": z.object({
    componentType: z.string().optional(),
    id: z.literal("camp-p4-5"),
    pieceTypeId: z.literal("camp"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: CampPieceFieldsSchema,
  }),
  "storm": z.object({
    componentType: z.string().optional(),
    id: z.literal("storm"),
    pieceTypeId: z.literal("storm"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: StormPieceFieldsSchema,
  }),
  "town-p1-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p1-1"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p1-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p1-2"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p1-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p1-3"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p1-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p1-4"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p2-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p2-1"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p2-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p2-2"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p2-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p2-3"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p2-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p2-4"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p3-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p3-1"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p3-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p3-2"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p3-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p3-3"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p3-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p3-4"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p4-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p4-1"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p4-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p4-2"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p4-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p4-3"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "town-p4-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("town-p4-4"),
    pieceTypeId: z.literal("town"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TownPieceFieldsSchema,
  }),
  "trail-p1-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-1"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-10": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-10"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-11": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-11"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-12": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-12"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-13": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-13"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-14": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-14"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-15": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-15"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-2"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-3"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-4"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-5": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-5"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-6": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-6"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-7": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-7"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-8": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-8"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p1-9": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p1-9"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-1"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-10": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-10"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-11": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-11"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-12": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-12"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-13": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-13"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-14": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-14"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-15": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-15"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-2"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-3"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-4"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-5": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-5"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-6": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-6"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-7": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-7"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-8": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-8"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p2-9": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p2-9"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-1"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-10": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-10"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-11": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-11"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-12": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-12"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-13": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-13"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-14": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-14"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-15": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-15"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-2"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-3"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-4"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-5": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-5"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-6": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-6"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-7": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-7"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-8": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-8"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p3-9": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p3-9"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-1"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-10": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-10"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-11": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-11"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-12": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-12"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-13": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-13"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-14": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-14"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-15": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-15"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-2"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-3"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-4"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-5": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-5"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-6": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-6"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-7": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-7"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-8": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-8"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
  "trail-p4-9": z.object({
    componentType: z.string().optional(),
    id: z.literal("trail-p4-9"),
    pieceTypeId: z.literal("trail"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: TrailPieceFieldsSchema,
  }),
});
const dieStateByIdSchema = z.object({
  "die-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("die-1"),
    dieTypeId: z.literal("d6"),
    dieName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    sides: z.literal(6),
    value: z.number().int().nullable().optional(),
    properties: D6DieFieldsSchema,
  }),
  "die-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("die-2"),
    dieTypeId: z.literal("d6"),
    dieName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    sides: z.literal(6),
    value: z.number().int().nullable().optional(),
    properties: D6DieFieldsSchema,
  }),
});
const boardStateByIdSchema = z.object({
  "frontier": z.object({
    id: z.literal("frontier"),
    baseId: z.literal("frontier"),
    layout: z.literal("hex"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("shared"),
    playerId: ids.playerId.nullable().optional(),
    templateId: z.string().nullable().optional(),
    fields: FrontierBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        q: z.number().int(),
        r: z.number().int(),
        fields: FrontierSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: z.literal("adjacent"),
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: unknownRecordSchema,
      }),
    ),
    containers: z.object({}),
    orientation: z.enum(["pointy-top", "flat-top"]),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: FrontierEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(3),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: FrontierVertexFieldsSchema,
      }),
    ),
  }),
});
const hexBoardStateByIdSchema = z.object({
  "frontier": z.object({
    id: z.literal("frontier"),
    baseId: z.literal("frontier"),
    layout: z.literal("hex"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("shared"),
    playerId: ids.playerId.nullable().optional(),
    templateId: z.string().nullable().optional(),
    fields: FrontierBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        q: z.number().int(),
        r: z.number().int(),
        fields: FrontierSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: z.literal("adjacent"),
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: unknownRecordSchema,
      }),
    ),
    containers: z.object({}),
    orientation: z.enum(["pointy-top", "flat-top"]),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: FrontierEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(3),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: FrontierVertexFieldsSchema,
      }),
    ),
  }),
});
const squareBoardStateByIdSchema = z.object({});
const boardSpaceTypeIdSchema = ids.spaceTypeId.nullable().optional();
const boardSpaceStateSchema = z.object({
  id: ids.spaceId,
  name: z.string().nullable().optional(),
  typeId: boardSpaceTypeIdSchema,
  fields: unknownRecordSchema,
  zoneId: z.string().nullable().optional(),
});
const hexSpaceStateSchema = boardSpaceStateSchema.extend({
  q: z.number().int(),
  r: z.number().int(),
});
const squareSpaceStateSchema = boardSpaceStateSchema.extend({
  row: z.number().int(),
  col: z.number().int(),
});
const boardRelationStateSchema = z.object({
  id: z.string().nullable().optional(),
  typeId: ids.relationTypeId,
  fromSpaceId: ids.spaceId,
  toSpaceId: ids.spaceId,
  directed: z.boolean(),
  fields: unknownRecordSchema,
});
const boardContainerStateSchema = z.object({
  id: ids.boardContainerId,
  name: z.string(),
  host: z.discriminatedUnion("type", [
    z.object({ type: z.literal("board") }),
    z.object({ type: z.literal("space"), spaceId: ids.spaceId }),
  ]),
  allowedCardSetIds: z.array(ids.cardSetId).optional(),
  zoneId: z.string(),
  fields: unknownRecordSchema,
});
const runtimeGenericBoardStateSchema = z.object({
  id: ids.boardId,
  baseId: ids.boardBaseId,
  layout: z.literal("generic"),
  typeId: ids.boardTypeId.nullable().optional(),
  scope: z.enum(["shared", "perPlayer"]),
  playerId: ids.playerId.nullable().optional(),
  templateId: z.string().nullable().optional(),
  fields: unknownRecordSchema,
  // T220: per-board state.spaces is loose-keyed by string. See the
  // codegen-template comment in renderGenericBoardStateSchema for
  // the rationale; the wire shape is unchanged (additionalProperties
  // JSON), and the inner id field narrows at parse time.
  spaces: z.record(z.string(), boardSpaceStateSchema),
  relations: z.array(boardRelationStateSchema),
  containers: z.record(z.string(), boardContainerStateSchema),
});
const hexEdgeStateSchema = z.object({
  id: ids.edgeId,
  spaceIds: z.array(ids.spaceId).min(1).max(2),
  typeId: ids.edgeTypeId.nullable().optional(),
  label: z.string().nullable().optional(),
  ownerId: ids.playerId.nullable().optional(),
  fields: unknownRecordSchema,
});
const hexVertexStateSchema = z.object({
  id: ids.vertexId,
  spaceIds: z.array(ids.spaceId).min(1).max(3),
  typeId: ids.vertexTypeId.nullable().optional(),
  label: z.string().nullable().optional(),
  ownerId: ids.playerId.nullable().optional(),
  fields: unknownRecordSchema,
});
const squareVertexStateSchema = z.object({
  id: ids.vertexId,
  spaceIds: z.array(ids.spaceId).min(1).max(4),
  typeId: ids.vertexTypeId.nullable().optional(),
  label: z.string().nullable().optional(),
  ownerId: ids.playerId.nullable().optional(),
  fields: unknownRecordSchema,
});
const runtimeHexBoardStateSchema = runtimeGenericBoardStateSchema.extend({
  layout: z.literal("hex"),
  // T220: loose-keyed by string — see comment above.
  spaces: z.record(z.string(), hexSpaceStateSchema),
  relations: z.array(boardRelationStateSchema),
  containers: z.object({}),
  orientation: z.enum(["pointy-top", "flat-top"]),
  edges: z.array(hexEdgeStateSchema),
  vertices: z.array(hexVertexStateSchema),
});
const runtimeSquareBoardStateSchema = runtimeGenericBoardStateSchema.extend({
  layout: z.literal("square"),
  // T220: loose-keyed by string — see comment above.
  spaces: z.record(z.string(), squareSpaceStateSchema),
  relations: z.array(boardRelationStateSchema),
  containers: z.record(z.string(), boardContainerStateSchema),
  edges: z.array(hexEdgeStateSchema),
  vertices: z.array(squareVertexStateSchema),
});
const runtimeBoardStateSchema = z.union([
  runtimeGenericBoardStateSchema,
  runtimeHexBoardStateSchema,
  runtimeSquareBoardStateSchema,
]);
const rawTableSchema = z.object({
  playerOrder: z.array(ids.playerId),
  zones: z.object({
    shared: sharedZoneSchema,
    perPlayer: playerZoneSchema,
    visibility: z.record(zoneIdSchema, z.enum(["all", "ownerOnly", "public", "hidden"])),
    cardSetIdsByZoneId: z.record(zoneIdSchema, z.array(ids.cardSetId)).optional(),
  }),
  decks: sharedZoneSchema,
  hands: playerZoneSchema,
  handVisibility: z.record(
    playerZoneIdSchema,
    z.enum(["all", "ownerOnly", "public", "hidden"]),
  ),
  cards: cardStateByIdSchema,
  pieces: pieceStateByIdSchema,
  componentLocations: z.record(
    z.string(),
    z.union([
      z.object({ type: z.literal("Detached") }),
      z.object({
        type: z.literal("InDeck"),
        deckId: ids.deckId,
        playedBy: ids.playerId.nullable(),
        position: z.number().int().nullable().optional(),
      }),
      z.object({
        type: z.literal("InHand"),
        handId: ids.handId,
        playerId: ids.playerId,
        position: z.number().int().nullable().optional(),
      }),
      z.object({
        type: z.literal("InZone"),
        zoneId: z.string(),
        playedBy: ids.playerId.nullable().optional(),
        position: z.number().int().nullable().optional(),
      }),
      z.object({
        type: z.literal("OnSpace"),
        boardId: ids.boardId,
        spaceId: ids.spaceId,
        position: z.number().int().nullable().optional(),
      }),
      z.object({
        type: z.literal("InContainer"),
        boardId: ids.boardId,
        containerId: ids.boardContainerId,
        position: z.number().int().nullable().optional(),
      }),
      z.object({
        type: z.literal("OnEdge"),
        boardId: ids.boardId,
        edgeId: ids.edgeId,
        position: z.number().int().nullable().optional(),
      }),
      z.object({
        type: z.literal("OnVertex"),
        boardId: ids.boardId,
        vertexId: ids.vertexId,
        position: z.number().int().nullable().optional(),
      }),
      z.object({
      type: z.literal("InSlot"),
      host: z.never(),
      slotId: z.never(),
      position: z.number().int().nullable().optional(),
    }),
    ]),
  ),
  ownerOfCard: z.record(ids.cardId, ids.playerId.nullable()),
  visibility: z.record(
    ids.cardId,
    z.object({
      faceUp: z.boolean(),
      visibleTo: z.array(ids.playerId).nullable().optional(),
    }),
  ),
  resources: perPlayerSchema(z.record(ids.resourceId, z.number().int())),
  boards: z.object({
    byId: boardStateByIdSchema,
    hex: hexBoardStateByIdSchema,
    square: squareBoardStateByIdSchema,
  }),
  dice: dieStateByIdSchema,
});

export const tableSchema = assumeManifestSchema<TableState>(rawTableSchema);

export const runtimeSchema = createManifestRuntimeSchema({
  phaseNameSchema: z.string(),
  playerIdSchema: ids.playerId,
  setupProfileIdSchema: ids.setupProfileId,
});

// Produces an empty PerPlayer<CardId[]> for every player zone. The entries
// array is seeded from the resolved runtime roster so the generated default
// never creates a record for a player the session does not have.
function buildPerPlayerCardIds(
  playerIds: readonly PlayerId[],
): CardIdsByPlayerZoneId {
  return Object.fromEntries(
    literals.playerZoneIds.map((zoneId) => [
      zoneId,
      perPlayer(playerIds, () => [] as CardId[]),
    ]),
  ) as CardIdsByPlayerZoneId;
}

function buildPlayerResources(
  playerIds: readonly PlayerId[],
): PerPlayer<Record<ResourceId, number>> {
  return perPlayer(playerIds, () =>
    Object.fromEntries(
      literals.resourceIds.map((resourceId) => [resourceId, 0]),
    ) as Record<ResourceId, number>,
  );
}

export const defaults = {
  zones: (playerIds?: readonly string[]) => ({
    shared: cloneManifestDefault({"charter-deck":[],"charter-played":[]}),
    perPlayer: buildPerPlayerCardIds(resolveDefaultPlayerIds(playerIds)),
    visibility: cloneManifestDefault({"charter-deck":"hidden","charter-hand":"ownerOnly","charter-played":"public"}),
    cardSetIdsByZoneId: cloneManifestDefault({"charter-deck":["charter-cards"],"charter-hand":["charter-cards"],"charter-played":["charter-cards"]}),
  }) as TableState["zones"],
  decks: () => cloneManifestDefault({"charter-deck":[],"charter-played":[]}) as TableState["decks"],
  hands: (playerIds?: readonly string[]) =>
    buildPerPlayerCardIds(resolveDefaultPlayerIds(playerIds)) as TableState["hands"],
  handVisibility: () => cloneManifestDefault({"charter-hand":"ownerOnly"}) as TableState["handVisibility"],
  ownerOfCard: () => cloneManifestDefault({"claimMarker-1":null,"claimMarker-2":null,"landmark-1":null,"landmark-2":null,"landmark-3":null,"landmark-4":null,"landmark-5":null,"scout-1":null,"scout-10":null,"scout-11":null,"scout-12":null,"scout-13":null,"scout-14":null,"scout-2":null,"scout-3":null,"scout-4":null,"scout-5":null,"scout-6":null,"scout-7":null,"scout-8":null,"scout-9":null,"shortcut-1":null,"shortcut-2":null,"surveyGrant-1":null,"surveyGrant-2":null}) as TableState["ownerOfCard"],
  visibility: () => cloneManifestDefault({"claimMarker-1":{"faceUp":true},"claimMarker-2":{"faceUp":true},"landmark-1":{"faceUp":true},"landmark-2":{"faceUp":true},"landmark-3":{"faceUp":true},"landmark-4":{"faceUp":true},"landmark-5":{"faceUp":true},"scout-1":{"faceUp":true},"scout-10":{"faceUp":true},"scout-11":{"faceUp":true},"scout-12":{"faceUp":true},"scout-13":{"faceUp":true},"scout-14":{"faceUp":true},"scout-2":{"faceUp":true},"scout-3":{"faceUp":true},"scout-4":{"faceUp":true},"scout-5":{"faceUp":true},"scout-6":{"faceUp":true},"scout-7":{"faceUp":true},"scout-8":{"faceUp":true},"scout-9":{"faceUp":true},"shortcut-1":{"faceUp":true},"shortcut-2":{"faceUp":true},"surveyGrant-1":{"faceUp":true},"surveyGrant-2":{"faceUp":true}}) as TableState["visibility"],
  resources: (playerIds?: readonly string[]) =>
    buildPlayerResources(resolveDefaultPlayerIds(playerIds)),
} as const;

type GeneratedStaticBoards = Pick<PublicTableState["boards"], "byId" | "hex" | "square">;
type GeneratedStaticBoardsJsonEnvelope = Omit<StaticBoardsJsonEnvelope<TableState>, "boards"> & {
  boards: GeneratedStaticBoards;
};
const manifestStaticData = staticBoardsData as unknown as GeneratedStaticBoardsJsonEnvelope;
export const staticBoards = manifestStaticData.boards;

const baseInitialTable = cloneManifestDefault<TableState>(manifestStaticData.initialTable);
const baseDeckCardsByZoneId = baseInitialTable.decks as Record<SharedZoneId, readonly CardId[]>;

export function createInitialTable(options: {
  playerIds?: readonly string[];
  shuffleItems?: <Value>(values: readonly Value[]) => Value[];
} = {}): TableState {
  const resolvedPlayerIds = resolveDefaultPlayerIds(options.playerIds);
  const shuffleItems =
    options.shuffleItems ?? (<Value>(values: readonly Value[]) => [...values]);
  const table = cloneManifestDefault(baseInitialTable) as TableState;
  table.playerOrder = [...resolvedPlayerIds];
  table.zones = defaults.zones(resolvedPlayerIds);
  table.decks = defaults.decks();
  table.hands = defaults.hands(resolvedPlayerIds);
  table.resources = defaults.resources(resolvedPlayerIds);
  const componentLocations = cloneManifestDefault(
    baseInitialTable.componentLocations,
  ) as TableState["componentLocations"];

  for (const [zoneId, baseDeckCardIds] of Object.entries(
    baseDeckCardsByZoneId,
  ) as Array<[SharedZoneId, readonly CardId[]]>) {
    const shuffled = shuffleItems(baseDeckCardIds);
    (table.decks as Record<string, CardId[]>)[zoneId] = [...shuffled];
    (table.zones.shared as Record<string, CardId[]>)[zoneId] = [...shuffled];
    shuffled.forEach((componentId, position) => {
      const location = componentLocations[componentId];
      if (!location || location.type !== "InDeck") {
        return;
      }
      componentLocations[componentId] = {
        ...location,
        position,
      };
    });
  }

  table.componentLocations = componentLocations;
  return tableSchema.parse(table);
}

export const schemas = {
  table: tableSchema,
  runtime: runtimeSchema,
} as const;

export function createGameStateSchema<
  PhaseNameSchema extends z.ZodType<unknown>,
  PublicSchema extends z.ZodType<unknown>,
  PrivateSchema extends z.ZodType<unknown>,
  HiddenSchema extends z.ZodType<unknown>,
  PhasesSchema extends z.ZodType<unknown>,
>({
  phaseNameSchema,
  publicSchema,
  privateSchema,
  hiddenSchema,
  phasesSchema,
}: {
  phaseNameSchema: PhaseNameSchema;
  publicSchema: PublicSchema;
  privateSchema: PrivateSchema;
  hiddenSchema: HiddenSchema;
  phasesSchema: PhasesSchema;
}) {
  return createManifestGameStateSchema({
    tableSchema,
    playerIdSchema: ids.playerId,
    setupProfileIdSchema: ids.setupProfileId,
    phaseNameSchema,
    publicSchema,
    privateSchema,
    hiddenSchema,
    phasesSchema,
  });
}

export const manifestContract: ReducerManifestContract<
  PublicTableState,
  string,
  PublicPlayerId,
  DeckId,
  HandId,
  CardId
> = {
  literals,
  ids,
  defaults,
  staticBoards,
  setupOptionsById,
  setupChoiceIdsByOptionId,
  setupProfilesById,
  tableSchema,
  runtimeSchema,
  createGameStateSchema,
};

const boardIdsByLayoutLookup = {
  "hex": ["frontier"] as const,
} as const;
const boardBaseIdsByLayoutLookup = {
  "hex": ["frontier"] as const,
} as const;
const boardIdsByBaseIdLookup = {
  "frontier": ["frontier"] as const,
} as const;
const boardBaseIdsByTemplateIdLookup = {
  "star-frontier": ["frontier"] as const,
} as const;
const boardLayoutByIdLookup = {
  "frontier": "hex",
} as const;
const boardTemplateLayoutByIdLookup = {
  "star-frontier": "hex",
} as const;
const boardIdsByTypeIdLookup = {

} as const;
const spaceIdsByBoardIdLookup = {
  "frontier": ["h-0-0", "h-1-0", "h-1-1", "h-1-2", "h-1-3", "h-1-4", "h-1-5", "h-2-0", "h-2-1", "h-2-10", "h-2-11", "h-2-2", "h-2-3", "h-2-4", "h-2-5", "h-2-6", "h-2-7", "h-2-8", "h-2-9", "o-0", "o-1", "o-10", "o-11", "o-12", "o-13", "o-14", "o-15", "o-16", "o-17", "o-2", "o-3", "o-4", "o-5", "o-6", "o-7", "o-8", "o-9"] as const,
} as const;
const spaceTypeIdByBoardIdLookup = {
  "frontier": {
    "h-0-0": "land",
    "h-1-0": "land",
    "h-1-1": "land",
    "h-1-2": "land",
    "h-1-3": "land",
    "h-1-4": "land",
    "h-1-5": "land",
    "h-2-0": "land",
    "h-2-1": "land",
    "h-2-10": "land",
    "h-2-11": "land",
    "h-2-2": "land",
    "h-2-3": "land",
    "h-2-4": "land",
    "h-2-5": "land",
    "h-2-6": "land",
    "h-2-7": "land",
    "h-2-8": "land",
    "h-2-9": "land",
    "o-0": "borderland",
    "o-1": "borderland",
    "o-10": "borderland",
    "o-11": "borderland",
    "o-12": "borderland",
    "o-13": "borderland",
    "o-14": "borderland",
    "o-15": "borderland",
    "o-16": "borderland",
    "o-17": "borderland",
    "o-2": "borderland",
    "o-3": "borderland",
    "o-4": "borderland",
    "o-5": "borderland",
    "o-6": "borderland",
    "o-7": "borderland",
    "o-8": "borderland",
    "o-9": "borderland"
  }
} as const;
const spaceIdsByTypeIdLookup = {
  "borderland": ["o-0", "o-1", "o-10", "o-11", "o-12", "o-13", "o-14", "o-15", "o-16", "o-17", "o-2", "o-3", "o-4", "o-5", "o-6", "o-7", "o-8", "o-9"] as const,
  "land": ["h-0-0", "h-1-0", "h-1-1", "h-1-2", "h-1-3", "h-1-4", "h-1-5", "h-2-0", "h-2-1", "h-2-10", "h-2-11", "h-2-2", "h-2-3", "h-2-4", "h-2-5", "h-2-6", "h-2-7", "h-2-8", "h-2-9"] as const,
} as const;
const containerIdsByBoardIdLookup = {
  "frontier": [] as const,
} as const;
const containerHostByBoardIdLookup = {
  "frontier": {}
} as const;
const relationTypeIdsByBoardIdLookup = {
  "frontier": ["adjacent"] as const,
} as const;
const edgeIdsByTypeIdLookup = {
  "relay": ["hex-edge:-2,7,-5::-4,8,-4", "hex-edge:-4,-4,8::-5,-2,7", "hex-edge:-5,7,-2::-7,8,-1", "hex-edge:-7,2,5::-8,4,4", "hex-edge:1,-8,7::2,-7,5", "hex-edge:2,5,-7::4,4,-8", "hex-edge:4,-8,4::5,-7,2", "hex-edge:4,4,-8::5,2,-7", "hex-edge:7,-2,-5::8,-4,-4"] as const,
} as const;
const edgeIdsByBoardIdAndTypeIdLookup = {
  "frontier": {
    "relay": [
      "hex-edge:-2,7,-5::-4,8,-4",
      "hex-edge:-4,-4,8::-5,-2,7",
      "hex-edge:-5,7,-2::-7,8,-1",
      "hex-edge:-7,2,5::-8,4,4",
      "hex-edge:1,-8,7::2,-7,5",
      "hex-edge:2,5,-7::4,4,-8",
      "hex-edge:4,-8,4::5,-7,2",
      "hex-edge:4,4,-8::5,2,-7",
      "hex-edge:7,-2,-5::8,-4,-4"
    ]
  }
} as const;
const vertexIdsByTypeIdLookup = {

} as const;
const vertexIdsByBoardIdAndTypeIdLookup = {
  "frontier": {}
} as const;
const authoredHexEdgesByBoardIdLookup = {
  "frontier": [
    {
      "ref": {
        "spaces": [
          "h-2-11",
          "o-16"
        ]
      },
      "fields": {
        "relayIndex": 0
      },
      "typeId": "relay"
    },
    {
      "ref": {
        "spaces": [
          "h-2-11",
          "o-17"
        ]
      },
      "fields": {
        "relayIndex": 1
      },
      "typeId": "relay"
    },
    {
      "ref": {
        "spaces": [
          "h-2-1",
          "o-1"
        ]
      },
      "fields": {
        "relayIndex": 2
      },
      "typeId": "relay"
    },
    {
      "ref": {
        "spaces": [
          "h-2-3",
          "o-4"
        ]
      },
      "fields": {
        "relayIndex": 3
      },
      "typeId": "relay"
    },
    {
      "ref": {
        "spaces": [
          "h-2-4",
          "o-5"
        ]
      },
      "fields": {
        "relayIndex": 4
      },
      "typeId": "relay"
    },
    {
      "ref": {
        "spaces": [
          "h-2-5",
          "o-8"
        ]
      },
      "fields": {
        "relayIndex": 5
      },
      "typeId": "relay"
    },
    {
      "ref": {
        "spaces": [
          "h-2-7",
          "o-10"
        ]
      },
      "fields": {
        "relayIndex": 6
      },
      "typeId": "relay"
    },
    {
      "ref": {
        "spaces": [
          "h-2-8",
          "o-13"
        ]
      },
      "fields": {
        "relayIndex": 7
      },
      "typeId": "relay"
    },
    {
      "ref": {
        "spaces": [
          "h-2-9",
          "o-14"
        ]
      },
      "fields": {
        "relayIndex": 8
      },
      "typeId": "relay"
    }
  ]
} as const;
const authoredHexVerticesByBoardIdLookup = {
  "frontier": []
} as const;
const authoredHexEdgeIdsByBoardIdAndRefLookup = {
  "frontier": {
    "h-2-1$$o-1": "hex-edge:7,-2,-5::8,-4,-4",
    "h-2-11$$o-16": "hex-edge:2,5,-7::4,4,-8",
    "h-2-11$$o-17": "hex-edge:4,4,-8::5,2,-7",
    "h-2-3$$o-4": "hex-edge:4,-8,4::5,-7,2",
    "h-2-4$$o-5": "hex-edge:1,-8,7::2,-7,5",
    "h-2-5$$o-8": "hex-edge:-4,-4,8::-5,-2,7",
    "h-2-7$$o-10": "hex-edge:-7,2,5::-8,4,4",
    "h-2-8$$o-13": "hex-edge:-5,7,-2::-7,8,-1",
    "h-2-9$$o-14": "hex-edge:-2,7,-5::-4,8,-4"
  }
} as const;
const authoredHexVertexIdsByBoardIdAndRefLookup = {
  "frontier": {}
} as const;

function authoredHexRefKey(spaceIds: readonly string[]): string {
  return [...spaceIds]
    .sort((left, right) => left.localeCompare(right))
    .join("$$");
}

type BoardLookupIdValue<
  Lookup extends Record<string, Record<string, readonly string[]>>,
  Key extends keyof Lookup,
> = Extract<Lookup[Key][keyof Lookup[Key]], readonly string[]>[number];

function flattenBoardScopedIds<
  Lookup extends Record<string, Record<string, readonly string[]>>,
  Key extends keyof Lookup,
>(lookup: Lookup, key: Key): ReadonlyArray<BoardLookupIdValue<Lookup, Key>> {
  return Object.values(lookup[key] ?? {}).flat() as ReadonlyArray<
    BoardLookupIdValue<Lookup, Key>
  >;
}

export const boardHelpers = {
  boardIdsForLayout<
    LayoutValue extends keyof typeof boardIdsByLayoutLookup,
  >(layout: LayoutValue): (typeof boardIdsByLayoutLookup)[LayoutValue] {
    return boardIdsByLayoutLookup[layout];
  },
  boardBaseIdsForLayout<
    LayoutValue extends keyof typeof boardBaseIdsByLayoutLookup,
  >(layout: LayoutValue): (typeof boardBaseIdsByLayoutLookup)[LayoutValue] {
    return boardBaseIdsByLayoutLookup[layout];
  },
  boardIdsForBase<
    BoardBaseIdValue extends keyof typeof boardIdsByBaseIdLookup,
  >(
    boardBaseId: BoardBaseIdValue,
  ): (typeof boardIdsByBaseIdLookup)[BoardBaseIdValue] {
    return boardIdsByBaseIdLookup[boardBaseId];
  },
  boardBaseIdsForTemplate<
    TemplateIdValue extends keyof typeof boardBaseIdsByTemplateIdLookup,
  >(
    templateId: TemplateIdValue,
  ): (typeof boardBaseIdsByTemplateIdLookup)[TemplateIdValue] {
    return boardBaseIdsByTemplateIdLookup[templateId];
  },
  boardIdsForType<TypeIdValue extends keyof typeof boardIdsByTypeIdLookup>(
    typeId: TypeIdValue,
  ): (typeof boardIdsByTypeIdLookup)[TypeIdValue] {
    return boardIdsByTypeIdLookup[typeId];
  },
  boardLayout<BoardIdValue extends keyof typeof boardLayoutByIdLookup>(
    boardId: BoardIdValue,
  ): (typeof boardLayoutByIdLookup)[BoardIdValue] {
    return boardLayoutByIdLookup[boardId];
  },
  boardTemplateLayout<
    TemplateIdValue extends keyof typeof boardTemplateLayoutByIdLookup,
  >(
    templateId: TemplateIdValue,
  ): (typeof boardTemplateLayoutByIdLookup)[TemplateIdValue] {
    return boardTemplateLayoutByIdLookup[templateId];
  },
  spaceIds<BoardIdValue extends keyof typeof spaceIdsByBoardIdLookup>(
    boardId: BoardIdValue,
  ): (typeof spaceIdsByBoardIdLookup)[BoardIdValue] {
    return spaceIdsByBoardIdLookup[boardId];
  },
  spaceRecord<
    BoardIdValue extends keyof typeof spaceIdsByBoardIdLookup,
    Value,
  >(
    boardId: BoardIdValue,
    initial:
      | Value
      | ((
          spaceId: (typeof spaceIdsByBoardIdLookup)[BoardIdValue][number],
        ) => Value),
  ): Record<(typeof spaceIdsByBoardIdLookup)[BoardIdValue][number], Value> {
    const spaceIds = spaceIdsByBoardIdLookup[boardId];
    if (!spaceIds) {
      throw new Error(`Unknown board '${String(boardId)}'.`);
    }
    return buildTypedRecord(spaceIds, initial) as Record<
      (typeof spaceIdsByBoardIdLookup)[BoardIdValue][number],
      Value
    >;
  },
  isSpaceId<BoardIdValue extends keyof typeof spaceIdsByBoardIdLookup>(
    boardId: BoardIdValue,
    value: string,
  ): value is (typeof spaceIdsByBoardIdLookup)[BoardIdValue][number] {
    const spaceIds = spaceIdsByBoardIdLookup[boardId];
    return spaceIds ? isTypedId(spaceIds, value) : false;
  },
  expectSpaceId<BoardIdValue extends keyof typeof spaceIdsByBoardIdLookup>(
    boardId: BoardIdValue,
    value: string,
  ): (typeof spaceIdsByBoardIdLookup)[BoardIdValue][number] {
    const spaceIds = spaceIdsByBoardIdLookup[boardId];
    if (!spaceIds || !isTypedId(spaceIds, value)) {
      throw new Error(
        `Unknown space id '${value}' on board '${String(boardId)}'.`,
      );
    }
    return value as (typeof spaceIdsByBoardIdLookup)[BoardIdValue][number];
  },
  spaceKinds<BoardIdValue extends keyof typeof spaceTypeIdByBoardIdLookup>(
    boardId: BoardIdValue,
  ): (typeof spaceTypeIdByBoardIdLookup)[BoardIdValue] {
    return spaceTypeIdByBoardIdLookup[boardId];
  },
  spaceIdsForType<TypeIdValue extends keyof typeof spaceIdsByTypeIdLookup>(
    typeId: TypeIdValue,
  ): (typeof spaceIdsByTypeIdLookup)[TypeIdValue] {
    return spaceIdsByTypeIdLookup[typeId];
  },
  containerIds<BoardIdValue extends keyof typeof containerIdsByBoardIdLookup>(
    boardId: BoardIdValue,
  ): (typeof containerIdsByBoardIdLookup)[BoardIdValue] {
    return containerIdsByBoardIdLookup[boardId];
  },
  containerRecord<
    BoardIdValue extends keyof typeof containerIdsByBoardIdLookup,
    Value,
  >(
    boardId: BoardIdValue,
    initial:
      | Value
      | ((
          containerId: (typeof containerIdsByBoardIdLookup)[BoardIdValue][number],
        ) => Value),
  ): Record<
    (typeof containerIdsByBoardIdLookup)[BoardIdValue][number],
    Value
  > {
    const containerIds = containerIdsByBoardIdLookup[boardId];
    if (!containerIds) {
      throw new Error(`Unknown board '${String(boardId)}'.`);
    }
    return buildTypedRecord(containerIds, initial) as Record<
      (typeof containerIdsByBoardIdLookup)[BoardIdValue][number],
      Value
    >;
  },
  isContainerId<
    BoardIdValue extends keyof typeof containerIdsByBoardIdLookup,
  >(
    boardId: BoardIdValue,
    value: string,
  ): value is (typeof containerIdsByBoardIdLookup)[BoardIdValue][number] {
    const containerIds = containerIdsByBoardIdLookup[boardId];
    return containerIds ? isTypedId(containerIds, value) : false;
  },
  expectContainerId<
    BoardIdValue extends keyof typeof containerIdsByBoardIdLookup,
  >(
    boardId: BoardIdValue,
    value: string,
  ): (typeof containerIdsByBoardIdLookup)[BoardIdValue][number] {
    const containerIds = containerIdsByBoardIdLookup[boardId];
    if (!containerIds || !isTypedId(containerIds, value)) {
      throw new Error(
        `Unknown container id '${value}' on board '${String(boardId)}'.`,
      );
    }
    return value as (typeof containerIdsByBoardIdLookup)[BoardIdValue][number];
  },
  containerHost<
    BoardIdValue extends keyof typeof containerHostByBoardIdLookup,
    ContainerIdValue extends keyof (typeof containerHostByBoardIdLookup)[BoardIdValue],
  >(
    boardId: BoardIdValue,
    containerId: ContainerIdValue,
  ): (typeof containerHostByBoardIdLookup)[BoardIdValue][ContainerIdValue] {
    const containers = containerHostByBoardIdLookup[boardId];
    const containerHost = containers?.[containerId];
    if (!containerHost) {
      throw new Error(
        `Unknown container '${String(containerId)}' on board '${String(boardId)}'.`,
      );
    }
    return containerHost as (typeof containerHostByBoardIdLookup)[BoardIdValue][ContainerIdValue];
  },
  relationTypeIds<
    BoardIdValue extends keyof typeof relationTypeIdsByBoardIdLookup,
  >(
    boardId: BoardIdValue,
  ): (typeof relationTypeIdsByBoardIdLookup)[BoardIdValue] {
    return relationTypeIdsByBoardIdLookup[boardId];
  },
  relationTypeRecord<
    BoardIdValue extends keyof typeof relationTypeIdsByBoardIdLookup,
    Value,
  >(
    boardId: BoardIdValue,
    initial:
      | Value
      | ((
          relationTypeId: (typeof relationTypeIdsByBoardIdLookup)[BoardIdValue][number],
        ) => Value),
  ): Record<
    (typeof relationTypeIdsByBoardIdLookup)[BoardIdValue][number],
    Value
  > {
    const relationTypeIds = relationTypeIdsByBoardIdLookup[boardId];
    if (!relationTypeIds) {
      throw new Error(`Unknown board '${String(boardId)}'.`);
    }
    return buildTypedRecord(relationTypeIds, initial) as Record<
      (typeof relationTypeIdsByBoardIdLookup)[BoardIdValue][number],
      Value
    >;
  },
  isRelationTypeId<
    BoardIdValue extends keyof typeof relationTypeIdsByBoardIdLookup,
  >(
    boardId: BoardIdValue,
    value: string,
  ): value is (typeof relationTypeIdsByBoardIdLookup)[BoardIdValue][number] {
    const relationTypeIds = relationTypeIdsByBoardIdLookup[boardId];
    return relationTypeIds ? isTypedId(relationTypeIds, value) : false;
  },
  expectRelationTypeId<
    BoardIdValue extends keyof typeof relationTypeIdsByBoardIdLookup,
  >(
    boardId: BoardIdValue,
    value: string,
  ): (typeof relationTypeIdsByBoardIdLookup)[BoardIdValue][number] {
    const relationTypeIds = relationTypeIdsByBoardIdLookup[boardId];
    if (!relationTypeIds || !isTypedId(relationTypeIds, value)) {
      throw new Error(
        `Unknown relation type id '${value}' on board '${String(boardId)}'.`,
      );
    }
    return value as (typeof relationTypeIdsByBoardIdLookup)[BoardIdValue][number];
  },
  authoredHexEdges<
    BoardIdValue extends keyof typeof authoredHexEdgesByBoardIdLookup,
  >(
    boardId: BoardIdValue,
  ): (typeof authoredHexEdgesByBoardIdLookup)[BoardIdValue] {
    const authoredHexEdges = authoredHexEdgesByBoardIdLookup[boardId];
    if (!authoredHexEdges) {
      throw new Error(`Unknown hex board '${String(boardId)}'.`);
    }
    return authoredHexEdges;
  },
  authoredHexVertices<
    BoardIdValue extends keyof typeof authoredHexVerticesByBoardIdLookup,
  >(
    boardId: BoardIdValue,
  ): (typeof authoredHexVerticesByBoardIdLookup)[BoardIdValue] {
    const authoredHexVertices = authoredHexVerticesByBoardIdLookup[boardId];
    if (!authoredHexVertices) {
      throw new Error(`Unknown hex board '${String(boardId)}'.`);
    }
    return authoredHexVertices;
  },
  resolveHexEdgeId<
    BoardIdValue extends keyof typeof authoredHexEdgeIdsByBoardIdAndRefLookup,
  >(
    boardId: BoardIdValue,
    ref: HexAuthoredEdgeRef<BoardIdValue>,
  ): HexEdgeState<BoardIdValue>["id"] {
    const boardEdges = authoredHexEdgeIdsByBoardIdAndRefLookup[boardId];
    if (!boardEdges) {
      throw new Error(`Unknown hex board '${String(boardId)}'.`);
    }
    const edgeRef = ref as { spaces: readonly string[] };
    const edgeId = (boardEdges as Record<string, HexEdgeState<BoardIdValue>["id"]>)[
      authoredHexRefKey(edgeRef.spaces)
    ];
    if (!edgeId) {
      throw new Error(
        `Unknown authored hex edge ref '${edgeRef.spaces.join(", ")}' on board '${String(boardId)}'.`,
      );
    }
    return edgeId as HexEdgeState<BoardIdValue>["id"];
  },
  resolveHexVertexId<
    BoardIdValue extends keyof typeof authoredHexVertexIdsByBoardIdAndRefLookup,
  >(
    boardId: BoardIdValue,
    ref: HexAuthoredVertexRef<BoardIdValue>,
  ): HexVertexState<BoardIdValue>["id"] {
    const boardVertices = authoredHexVertexIdsByBoardIdAndRefLookup[boardId];
    if (!boardVertices) {
      throw new Error(`Unknown hex board '${String(boardId)}'.`);
    }
    const vertexRef = ref as { spaces: readonly string[] };
    const vertexId = (
      boardVertices as Record<string, HexVertexState<BoardIdValue>["id"]>
    )[authoredHexRefKey(vertexRef.spaces)];
    if (!vertexId) {
      throw new Error(
        `Unknown authored hex vertex ref '${vertexRef.spaces.join(", ")}' on board '${String(boardId)}'.`,
      );
    }
    return vertexId as HexVertexState<BoardIdValue>["id"];
  },
  edgeIdsForType<TypeIdValue extends keyof typeof edgeIdsByTypeIdLookup>(
    typeId: TypeIdValue,
  ): (typeof edgeIdsByTypeIdLookup)[TypeIdValue] {
    return edgeIdsByTypeIdLookup[typeId];
  },
  edgeRecord<
    BoardIdValue extends keyof typeof edgeIdsByBoardIdAndTypeIdLookup,
    Value,
  >(
    boardId: BoardIdValue,
    initial:
      | Value
      | ((
          edgeId: BoardLookupIdValue<
            typeof edgeIdsByBoardIdAndTypeIdLookup,
            BoardIdValue
          >,
        ) => Value),
  ): Record<
    BoardLookupIdValue<typeof edgeIdsByBoardIdAndTypeIdLookup, BoardIdValue>,
    Value
  > {
    const boardEdges = edgeIdsByBoardIdAndTypeIdLookup[boardId];
    const edgeIds = boardEdges
      ? flattenBoardScopedIds(edgeIdsByBoardIdAndTypeIdLookup, boardId)
      : undefined;
    if (!edgeIds) {
      throw new Error(`Unknown board '${String(boardId)}'.`);
    }
    return buildTypedRecord(edgeIds, initial) as Record<
      BoardLookupIdValue<typeof edgeIdsByBoardIdAndTypeIdLookup, BoardIdValue>,
      Value
    >;
  },
  isEdgeId<BoardIdValue extends keyof typeof edgeIdsByBoardIdAndTypeIdLookup>(
    boardId: BoardIdValue,
    value: string,
  ): value is BoardLookupIdValue<
    typeof edgeIdsByBoardIdAndTypeIdLookup,
    BoardIdValue
  > {
    const boardEdges = edgeIdsByBoardIdAndTypeIdLookup[boardId];
    const edgeIds = boardEdges
      ? flattenBoardScopedIds(edgeIdsByBoardIdAndTypeIdLookup, boardId)
      : undefined;
    return edgeIds ? isTypedId(edgeIds, value) : false;
  },
  expectEdgeId<
    BoardIdValue extends keyof typeof edgeIdsByBoardIdAndTypeIdLookup,
  >(
    boardId: BoardIdValue,
    value: string,
  ): BoardLookupIdValue<
    typeof edgeIdsByBoardIdAndTypeIdLookup,
    BoardIdValue
  > {
    const boardEdges = edgeIdsByBoardIdAndTypeIdLookup[boardId];
    const edgeIds = boardEdges
      ? flattenBoardScopedIds(edgeIdsByBoardIdAndTypeIdLookup, boardId)
      : undefined;
    if (!edgeIds || !isTypedId(edgeIds, value)) {
      throw new Error(
        `Unknown edge id '${value}' on board '${String(boardId)}'.`,
      );
    }
    return value as BoardLookupIdValue<
      typeof edgeIdsByBoardIdAndTypeIdLookup,
      BoardIdValue
    >;
  },
  edgeIds<
    BoardIdValue extends keyof typeof edgeIdsByBoardIdAndTypeIdLookup,
    TypeIdValue extends keyof (typeof edgeIdsByBoardIdAndTypeIdLookup)[BoardIdValue],
  >(
    boardId: BoardIdValue,
    typeId: TypeIdValue,
  ): (typeof edgeIdsByBoardIdAndTypeIdLookup)[BoardIdValue][TypeIdValue] {
    const boardEdges = edgeIdsByBoardIdAndTypeIdLookup[boardId];
    const edgeIds = boardEdges?.[typeId];
    if (!edgeIds) {
      throw new Error(
        `Unknown edge type '${String(typeId)}' on board '${String(boardId)}'.`,
      );
    }
    return edgeIds as (typeof edgeIdsByBoardIdAndTypeIdLookup)[BoardIdValue][TypeIdValue];
  },
  vertexIdsForType<TypeIdValue extends keyof typeof vertexIdsByTypeIdLookup>(
    typeId: TypeIdValue,
  ): (typeof vertexIdsByTypeIdLookup)[TypeIdValue] {
    return vertexIdsByTypeIdLookup[typeId];
  },
  vertexRecord<
    BoardIdValue extends keyof typeof vertexIdsByBoardIdAndTypeIdLookup,
    Value,
  >(
    boardId: BoardIdValue,
    initial:
      | Value
      | ((
          vertexId: BoardLookupIdValue<
            typeof vertexIdsByBoardIdAndTypeIdLookup,
            BoardIdValue
          >,
        ) => Value),
  ): Record<
    BoardLookupIdValue<typeof vertexIdsByBoardIdAndTypeIdLookup, BoardIdValue>,
    Value
  > {
    const boardVertices = vertexIdsByBoardIdAndTypeIdLookup[boardId];
    const vertexIds = boardVertices
      ? flattenBoardScopedIds(vertexIdsByBoardIdAndTypeIdLookup, boardId)
      : undefined;
    if (!vertexIds) {
      throw new Error(`Unknown board '${String(boardId)}'.`);
    }
    return buildTypedRecord(vertexIds, initial) as Record<
      BoardLookupIdValue<typeof vertexIdsByBoardIdAndTypeIdLookup, BoardIdValue>,
      Value
    >;
  },
  isVertexId<
    BoardIdValue extends keyof typeof vertexIdsByBoardIdAndTypeIdLookup,
  >(
    boardId: BoardIdValue,
    value: string,
  ): value is BoardLookupIdValue<
    typeof vertexIdsByBoardIdAndTypeIdLookup,
    BoardIdValue
  > {
    const boardVertices = vertexIdsByBoardIdAndTypeIdLookup[boardId];
    const vertexIds = boardVertices
      ? flattenBoardScopedIds(vertexIdsByBoardIdAndTypeIdLookup, boardId)
      : undefined;
    return vertexIds ? isTypedId(vertexIds, value) : false;
  },
  expectVertexId<
    BoardIdValue extends keyof typeof vertexIdsByBoardIdAndTypeIdLookup,
  >(
    boardId: BoardIdValue,
    value: string,
  ): BoardLookupIdValue<
    typeof vertexIdsByBoardIdAndTypeIdLookup,
    BoardIdValue
  > {
    const boardVertices = vertexIdsByBoardIdAndTypeIdLookup[boardId];
    const vertexIds = boardVertices
      ? flattenBoardScopedIds(vertexIdsByBoardIdAndTypeIdLookup, boardId)
      : undefined;
    if (!vertexIds || !isTypedId(vertexIds, value)) {
      throw new Error(
        `Unknown vertex id '${value}' on board '${String(boardId)}'.`,
      );
    }
    return value as BoardLookupIdValue<
      typeof vertexIdsByBoardIdAndTypeIdLookup,
      BoardIdValue
    >;
  },
  vertexIds<
    BoardIdValue extends keyof typeof vertexIdsByBoardIdAndTypeIdLookup,
    TypeIdValue extends keyof (typeof vertexIdsByBoardIdAndTypeIdLookup)[BoardIdValue],
  >(
    boardId: BoardIdValue,
    typeId: TypeIdValue,
  ): (typeof vertexIdsByBoardIdAndTypeIdLookup)[BoardIdValue][TypeIdValue] {
    const boardVertices = vertexIdsByBoardIdAndTypeIdLookup[boardId];
    const vertexIds = boardVertices?.[typeId];
    if (!vertexIds) {
      throw new Error(
        `Unknown vertex type '${String(typeId)}' on board '${String(boardId)}'.`,
      );
    }
    return vertexIds as (typeof vertexIdsByBoardIdAndTypeIdLookup)[BoardIdValue][TypeIdValue];
  },
  // Returns a `BoardRef` describing a per-player board scoped to the supplied
  // seat. The old `boardIdForPlayer` returned a concrete runtime-board-id
  // string, which encoded the "one board per maxPlayers seat" assumption in
  // static data. Under the PerPlayer model the runtime roster is not known at
  // generate time, so consumers deal with `BoardRef` and let the runtime
  // resolve the actual owner seat.
  boardRefForPlayer(
    boardBaseId: BoardBaseId,
    playerId: PlayerId,
  ): PerPlayerBoardRef<BoardBaseId, PlayerId> {
    return boardRef(boardBaseId, playerId) as PerPlayerBoardRef<
      BoardBaseId,
      PlayerId
    >;
  },
  sharedBoardRef(
    boardBaseId: BoardBaseId,
  ): SharedBoardRef<BoardBaseId> {
    return boardRef(boardBaseId) as SharedBoardRef<BoardBaseId>;
  },
} as const;

export type SetupProfilesDefinition = Record<
  SetupProfileId,
  SetupProfileDefinition<string, typeof manifestContract>
>;

export function setupProfiles<const Profiles extends SetupProfilesDefinition>(
  profiles: Profiles,
): Profiles {
  return profiles;
}

export function shuffle(
  container: SetupBootstrapContainerRef<typeof manifestContract>,
): SetupBootstrapStep<typeof manifestContract> {
  return createShuffleStep<typeof manifestContract>(container);
}

export function dealToPlayerZone(options: {
  from: Extract<
    SetupBootstrapContainerRef<typeof manifestContract>,
    { type: "sharedZone" | "sharedBoardContainer" }
  >;
  zoneId: Extract<
    SetupBootstrapPerPlayerContainerTemplateRef<typeof manifestContract>,
    { type: "playerZone" }
  >["zoneId"];
  count: number;
  playerIds?: readonly PlayerId[];
}): SetupBootstrapStep<typeof manifestContract> {
  return createDealToPlayerZoneStep<typeof manifestContract>(options);
}

export function dealToPlayerBoardContainer(options: {
  from: Extract<
    SetupBootstrapContainerRef<typeof manifestContract>,
    { type: "sharedZone" | "sharedBoardContainer" }
  >;
  boardId: Extract<
    SetupBootstrapPerPlayerContainerTemplateRef<typeof manifestContract>,
    { type: "playerBoardContainer" }
  >["boardId"];
  containerId: Extract<
    SetupBootstrapPerPlayerContainerTemplateRef<typeof manifestContract>,
    { type: "playerBoardContainer" }
  >["containerId"];
  count: number;
  playerIds?: readonly PlayerId[];
}): SetupBootstrapStep<typeof manifestContract> {
  return createDealToPlayerBoardContainerStep<typeof manifestContract>(options);
}

export function seedSharedBoardContainer(options: {
  from: SetupBootstrapContainerRef<typeof manifestContract>;
  boardId: Extract<
    SetupBootstrapDestinationRef<typeof manifestContract>,
    { type: "sharedBoardContainer" }
  >["boardId"];
  containerId: Extract<
    SetupBootstrapDestinationRef<typeof manifestContract>,
    { type: "sharedBoardContainer" }
  >["containerId"];
  count?: number;
  componentIds?: readonly (
    | CardIdOfManifest<typeof manifestContract>
    | PieceIdOfManifest<typeof manifestContract>
    | DieIdOfManifest<typeof manifestContract>
  )[];
}): SetupBootstrapStep<typeof manifestContract> {
  return createSeedSharedBoardContainerStep<typeof manifestContract>(options);
}

export function seedSharedBoardSpace(options: {
  from: SetupBootstrapContainerRef<typeof manifestContract>;
  boardId: Extract<
    SetupBootstrapDestinationRef<typeof manifestContract>,
    { type: "sharedBoardSpace" }
  >["boardId"];
  spaceId: Extract<
    SetupBootstrapDestinationRef<typeof manifestContract>,
    { type: "sharedBoardSpace" }
  >["spaceId"];
  count?: number;
  componentIds?: readonly (
    | CardIdOfManifest<typeof manifestContract>
    | PieceIdOfManifest<typeof manifestContract>
    | DieIdOfManifest<typeof manifestContract>
  )[];
}): SetupBootstrapStep<typeof manifestContract> {
  return createSeedSharedBoardSpaceStep<typeof manifestContract>(options);
}

export default manifestContract;
