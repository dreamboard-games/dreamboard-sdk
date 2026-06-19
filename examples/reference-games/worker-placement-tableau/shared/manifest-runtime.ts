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
import type {
  PlayerId as PublicPlayerId,
  TableState as PublicTableState,
} from "./manifest-types";

const unknownRecordSchema = assumeManifestSchema<RuntimeRecord>(
  z.record(z.string(), z.unknown()),
);

function resolveDefaultPlayerIds(
  playerIds: readonly string[] | undefined,
): readonly PlayerId[] {
  return resolveManifestPlayerIds(literals.playerIds, playerIds);
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
const boardLayoutSchema = createManifestStringLiteralSchema(
  literals.boardLayouts,
);
const setupOptionIdSchema = createManifestStringLiteralSchema(
  literals.setupOptionIds,
);
const setupProfileIdSchema = createManifestStringLiteralSchema(
  literals.setupProfileIds,
);
const cardSetIdSchema = createManifestStringLiteralSchema(literals.cardSetIds);
const cardTypeSchema = createManifestStringLiteralSchema(literals.cardTypes);
const cardIdSchema = createManifestStringLiteralSchema(literals.cardIds);
const deckIdSchema = createManifestStringLiteralSchema(literals.deckIds);
const handIdSchema = createManifestStringLiteralSchema(literals.handIds);
const sharedZoneIdSchema = createManifestStringLiteralSchema(
  literals.sharedZoneIds,
);
const playerZoneIdSchema = createManifestStringLiteralSchema(
  literals.playerZoneIds,
);
const zoneIdSchema = createManifestStringLiteralSchema(literals.zoneIds);
const resourceIdSchema = createManifestStringLiteralSchema(
  literals.resourceIds,
);
const pieceTypeIdSchema = createManifestStringLiteralSchema(
  literals.pieceTypeIds,
);
const pieceIdSchema = createManifestStringLiteralSchema(literals.pieceIds);
const dieTypeIdSchema = createManifestStringLiteralSchema(literals.dieTypeIds);
const dieIdSchema = createManifestStringLiteralSchema(literals.dieIds);
const boardTypeIdSchema = createManifestStringLiteralSchema(
  literals.boardTypeIds,
);
const boardBaseIdSchema = createManifestStringLiteralSchema(
  literals.boardBaseIds,
);
const boardIdSchema = createManifestStringLiteralSchema(literals.boardIds);
const boardContainerIdSchema = createManifestStringLiteralSchema(
  literals.boardContainerIds,
);
const relationTypeIdSchema = createManifestStringLiteralSchema(
  literals.relationTypeIds,
);
const edgeIdSchema = createManifestStringLiteralSchema(literals.edgeIds);
const edgeTypeIdSchema = createManifestStringLiteralSchema(
  literals.edgeTypeIds,
);
const vertexIdSchema = createManifestStringLiteralSchema(literals.vertexIds);
const vertexTypeIdSchema = createManifestStringLiteralSchema(
  literals.vertexTypeIds,
);
const spaceIdSchema = createManifestStringLiteralSchema(literals.spaceIds);
const spaceTypeIdSchema = createManifestStringLiteralSchema(
  literals.spaceTypeIds,
);

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
  apprenticeTrial: "apprentice-trial",
  architectsPlan: "architects-plan",
  foreman: "foreman",
  forgeOrder: "forge-order",
  furnitureCommission: "furniture-commission",
  grandAtelier: "grand-atelier",
  guildScholar: "guild-scholar",
  inspiration: "inspiration",
  lumberStash: "lumber-stash",
  mastersDisplay: "masters-display",
  mixedSet: "mixed-set",
  patronsFavor: "patrons-favor",
  quickDelivery: "quick-delivery",
  reassign: "reassign",
  rowOfPride: "row-of-pride",
  spareHands: "spare-hands",
  stoneCache: "stone-cache",
  stoneSculpture: "stone-sculpture",
  tirelessMaster: "tireless-master",
  weaversRequest: "weavers-request",
} as const satisfies Record<string, CardType>;

export const zones = {
  apprenticeDeck: "apprentice-deck",
  apprenticeDiscard: "apprentice-discard",
  apprenticeHand: "apprentice-hand",
  apprenticeTableau: "apprentice-tableau",
  orderDeck: "order-deck",
  orderDiscard: "order-discard",
  orderHand: "order-hand",
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
    return expectTypedId(
      literals.boardContainerIds,
      value,
      "board container id",
    );
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
  "apprentice-deck": ComponentId[];
  "apprentice-discard": ComponentId[];
  "order-deck": ComponentId[];
  "order-discard": ComponentId[];
};
export type ComponentIdsByPlayerZoneId = {
  "apprentice-hand": PerPlayer<ComponentId[]>;
  "apprentice-tableau": PerPlayer<ComponentId[]>;
  "order-hand": PerPlayer<ComponentId[]>;
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
export const setupChoiceIdsByOptionId = {} as const;
export const setupProfilesById = {
  standard: {
    id: "standard",
    name: "Standard",
    description:
      "Standard Artisans' Guild setup: 6 fixed action spaces + 3 randomly-drawn variable spaces.",
    optionValues: null,
  },
  "test-end-game": {
    id: "test-end-game",
    name: "Test end-game",
    description:
      "Reducer-test profile that pre-seeds a near-end-of-season-6 state for scoring tests.",
    optionValues: null,
  },
  "test-fixed-spaces": {
    id: "test-fixed-spaces",
    name: "Test fixed spaces",
    description:
      "Reducer-test profile that activates a deterministic set of 3 variable action spaces.",
    optionValues: null,
  },
} as const;

export type OrderCardsCardProperties = {
  orderId:
    | "furniture-commission"
    | "stone-sculpture"
    | "masters-display"
    | "forge-order"
    | "weavers-request"
    | "apprentice-trial"
    | "mixed-set"
    | "architects-plan"
    | "row-of-pride"
    | "grand-atelier";
  rewardVP: number;
  rewardCoin: number;
};

export const OrderCardsCardPropertiesSchema = z.object({
  orderId: z.enum([
    "furniture-commission",
    "stone-sculpture",
    "masters-display",
    "forge-order",
    "weavers-request",
    "apprentice-trial",
    "mixed-set",
    "architects-plan",
    "row-of-pride",
    "grand-atelier",
  ]),
  rewardVP: z.number().int(),
  rewardCoin: z.number().int(),
});

export type OrderCardsCardId =
  | "furniture-commission"
  | "stone-sculpture"
  | "masters-display"
  | "forge-order"
  | "weavers-request"
  | "apprentice-trial"
  | "mixed-set"
  | "architects-plan"
  | "row-of-pride"
  | "grand-atelier";

export type ApprenticeCardsCardProperties = {
  apprenticeId:
    | "quick-delivery"
    | "lumber-stash"
    | "stone-cache"
    | "spare-hands"
    | "inspiration"
    | "reassign"
    | "foreman"
    | "tireless-master"
    | "guild-scholar"
    | "patrons-favor";
  lifecycle: "oneShot" | "persistent";
};

export const ApprenticeCardsCardPropertiesSchema = z.object({
  apprenticeId: z.enum([
    "quick-delivery",
    "lumber-stash",
    "stone-cache",
    "spare-hands",
    "inspiration",
    "reassign",
    "foreman",
    "tireless-master",
    "guild-scholar",
    "patrons-favor",
  ]),
  lifecycle: z.enum(["oneShot", "persistent"]),
});

export type ApprenticeCardsCardId =
  | "quick-delivery"
  | "lumber-stash"
  | "stone-cache"
  | "spare-hands"
  | "inspiration"
  | "reassign"
  | "foreman"
  | "tireless-master"
  | "guild-scholar"
  | "patrons-favor";

export type ActionBoardBoardFields = RuntimeRecord;

export const ActionBoardBoardFieldsSchema = z.record(z.string(), z.unknown());

export type ActionBoardSpaceFields = {
  actionId:
    | "lumberyard"
    | "quarry"
    | "market"
    | "guild-hall"
    | "training-hall"
    | "workshop"
    | "masons-lodge"
    | "trade-post"
    | "patrons-estate"
    | "forge"
    | "library"
    | "apothecary";
  poolKind: "fixed" | "variable";
};

export const ActionBoardSpaceFieldsSchema = z.object({
  actionId: z.enum([
    "lumberyard",
    "quarry",
    "market",
    "guild-hall",
    "training-hall",
    "workshop",
    "masons-lodge",
    "trade-post",
    "patrons-estate",
    "forge",
    "library",
    "apothecary",
  ]),
  poolKind: z.enum(["fixed", "variable"]),
});

export type ActionBoardRelationFields = RuntimeRecord;

export const ActionBoardRelationFieldsSchema = z.record(
  z.string(),
  z.unknown(),
);

export type ActionBoardContainerFields = RuntimeRecord;

export const ActionBoardContainerFieldsSchema = z.record(
  z.string(),
  z.unknown(),
);

export type ActionBoardEdgeFields = RuntimeRecord;

export const ActionBoardEdgeFieldsSchema = z.record(z.string(), z.unknown());

export type ActionBoardVertexFields = RuntimeRecord;

export const ActionBoardVertexFieldsSchema = z.record(z.string(), z.unknown());

export type WakeUpTrackBoardFields = RuntimeRecord;

export const WakeUpTrackBoardFieldsSchema = z.record(z.string(), z.unknown());

export type WakeUpTrackSpaceFields = {
  slotIndex: number;
  turnOrder: "first" | "second";
  bonusKind: "none" | "coin" | "apprentice-card" | "wood-stone";
};

export const WakeUpTrackSpaceFieldsSchema = z.object({
  slotIndex: z.number().int(),
  turnOrder: z.enum(["first", "second"]),
  bonusKind: z.enum(["none", "coin", "apprentice-card", "wood-stone"]),
});

export type WakeUpTrackRelationFields = RuntimeRecord;

export const WakeUpTrackRelationFieldsSchema = z.record(
  z.string(),
  z.unknown(),
);

export type WakeUpTrackContainerFields = RuntimeRecord;

export const WakeUpTrackContainerFieldsSchema = z.record(
  z.string(),
  z.unknown(),
);

export type WakeUpTrackEdgeFields = RuntimeRecord;

export const WakeUpTrackEdgeFieldsSchema = z.record(z.string(), z.unknown());

export type WakeUpTrackVertexFields = RuntimeRecord;

export const WakeUpTrackVertexFieldsSchema = z.record(z.string(), z.unknown());

export type WorkshopMatBoardFields = RuntimeRecord;

export const WorkshopMatBoardFieldsSchema = z.record(z.string(), z.unknown());

export type WorkshopMatSpaceFields = RuntimeRecord;

export const WorkshopMatSpaceFieldsSchema = z.record(z.string(), z.unknown());

export type WorkshopMatRelationFields = RuntimeRecord;

export const WorkshopMatRelationFieldsSchema = z.record(
  z.string(),
  z.unknown(),
);

export type WorkshopMatContainerFields = RuntimeRecord;

export const WorkshopMatContainerFieldsSchema = z.record(
  z.string(),
  z.unknown(),
);

export type WorkshopMatEdgeFields = RuntimeRecord;

export const WorkshopMatEdgeFieldsSchema = z.record(z.string(), z.unknown());

export type WorkshopMatVertexFields = RuntimeRecord;

export const WorkshopMatVertexFieldsSchema = z.record(z.string(), z.unknown());

export type ApprenticePieceFields = RuntimeRecord;

export const ApprenticePieceFieldsSchema = z.record(z.string(), z.unknown());

export type MasterPieceFields = RuntimeRecord;

export const MasterPieceFieldsSchema = z.record(z.string(), z.unknown());

export type BoardFieldsByBoardId = {
  "action-board": ActionBoardBoardFields;
  "wake-up-track": WakeUpTrackBoardFields;
  "workshop-mat:player-1": WorkshopMatBoardFields;
  "workshop-mat:player-2": WorkshopMatBoardFields;
};

export type BoardSpaceFieldsByBoardId = {
  "action-board": ActionBoardSpaceFields;
  "wake-up-track": WakeUpTrackSpaceFields;
  "workshop-mat:player-1": WorkshopMatSpaceFields;
  "workshop-mat:player-2": WorkshopMatSpaceFields;
};

export type BoardRelationFieldsByBoardId = {
  "action-board": ActionBoardRelationFields;
  "wake-up-track": WakeUpTrackRelationFields;
  "workshop-mat:player-1": WorkshopMatRelationFields;
  "workshop-mat:player-2": WorkshopMatRelationFields;
};

export type BoardContainerFieldsByBoardId = {
  "action-board": ActionBoardContainerFields;
  "wake-up-track": WakeUpTrackContainerFields;
  "workshop-mat:player-1": WorkshopMatContainerFields;
  "workshop-mat:player-2": WorkshopMatContainerFields;
};

export type HexEdgeFieldsByBoardId = Record<string, never>;

export type HexVertexFieldsByBoardId = Record<string, never>;

export type SquareEdgeFieldsByBoardId = {
  "action-board": ActionBoardEdgeFields;
  "wake-up-track": WakeUpTrackEdgeFields;
  "workshop-mat:player-1": WorkshopMatEdgeFields;
  "workshop-mat:player-2": WorkshopMatEdgeFields;
};

export type SquareVertexFieldsByBoardId = {
  "action-board": ActionBoardVertexFields;
  "wake-up-track": WakeUpTrackVertexFields;
  "workshop-mat:player-1": WorkshopMatVertexFields;
  "workshop-mat:player-2": WorkshopMatVertexFields;
};

export type TiledEdgeFieldsByBoardId = {
  "action-board": ActionBoardEdgeFields;
  "wake-up-track": WakeUpTrackEdgeFields;
  "workshop-mat:player-1": WorkshopMatEdgeFields;
  "workshop-mat:player-2": WorkshopMatEdgeFields;
};

export type TiledVertexFieldsByBoardId = {
  "action-board": ActionBoardVertexFields;
  "wake-up-track": WakeUpTrackVertexFields;
  "workshop-mat:player-1": WorkshopMatVertexFields;
  "workshop-mat:player-2": WorkshopMatVertexFields;
};

export type PieceFieldsByTypeId = {
  apprentice: ApprenticePieceFields;
  master: MasterPieceFields;
};

export type DieFieldsByTypeId = Record<string, RuntimeRecord>;

export type CardProperties =
  | OrderCardsCardProperties
  | ApprenticeCardsCardProperties;

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
  "apprentice-trial": CardStateRecord<
    "apprentice-trial",
    "order-cards",
    "apprentice-trial",
    OrderCardsCardProperties
  >;
  "architects-plan": CardStateRecord<
    "architects-plan",
    "order-cards",
    "architects-plan",
    OrderCardsCardProperties
  >;
  foreman: CardStateRecord<
    "foreman",
    "apprentice-cards",
    "foreman",
    ApprenticeCardsCardProperties
  >;
  "forge-order": CardStateRecord<
    "forge-order",
    "order-cards",
    "forge-order",
    OrderCardsCardProperties
  >;
  "furniture-commission": CardStateRecord<
    "furniture-commission",
    "order-cards",
    "furniture-commission",
    OrderCardsCardProperties
  >;
  "grand-atelier": CardStateRecord<
    "grand-atelier",
    "order-cards",
    "grand-atelier",
    OrderCardsCardProperties
  >;
  "guild-scholar": CardStateRecord<
    "guild-scholar",
    "apprentice-cards",
    "guild-scholar",
    ApprenticeCardsCardProperties
  >;
  inspiration: CardStateRecord<
    "inspiration",
    "apprentice-cards",
    "inspiration",
    ApprenticeCardsCardProperties
  >;
  "lumber-stash": CardStateRecord<
    "lumber-stash",
    "apprentice-cards",
    "lumber-stash",
    ApprenticeCardsCardProperties
  >;
  "masters-display": CardStateRecord<
    "masters-display",
    "order-cards",
    "masters-display",
    OrderCardsCardProperties
  >;
  "mixed-set": CardStateRecord<
    "mixed-set",
    "order-cards",
    "mixed-set",
    OrderCardsCardProperties
  >;
  "patrons-favor": CardStateRecord<
    "patrons-favor",
    "apprentice-cards",
    "patrons-favor",
    ApprenticeCardsCardProperties
  >;
  "quick-delivery": CardStateRecord<
    "quick-delivery",
    "apprentice-cards",
    "quick-delivery",
    ApprenticeCardsCardProperties
  >;
  reassign: CardStateRecord<
    "reassign",
    "apprentice-cards",
    "reassign",
    ApprenticeCardsCardProperties
  >;
  "row-of-pride": CardStateRecord<
    "row-of-pride",
    "order-cards",
    "row-of-pride",
    OrderCardsCardProperties
  >;
  "spare-hands": CardStateRecord<
    "spare-hands",
    "apprentice-cards",
    "spare-hands",
    ApprenticeCardsCardProperties
  >;
  "stone-cache": CardStateRecord<
    "stone-cache",
    "apprentice-cards",
    "stone-cache",
    ApprenticeCardsCardProperties
  >;
  "stone-sculpture": CardStateRecord<
    "stone-sculpture",
    "order-cards",
    "stone-sculpture",
    OrderCardsCardProperties
  >;
  "tireless-master": CardStateRecord<
    "tireless-master",
    "apprentice-cards",
    "tireless-master",
    ApprenticeCardsCardProperties
  >;
  "weavers-request": CardStateRecord<
    "weavers-request",
    "order-cards",
    "weavers-request",
    OrderCardsCardProperties
  >;
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
  "apprentice-p1-1": PieceStateRecord<
    "apprentice-p1-1",
    "apprentice",
    ApprenticePieceFields
  >;
  "apprentice-p1-2": PieceStateRecord<
    "apprentice-p1-2",
    "apprentice",
    ApprenticePieceFields
  >;
  "apprentice-p1-3": PieceStateRecord<
    "apprentice-p1-3",
    "apprentice",
    ApprenticePieceFields
  >;
  "apprentice-p1-4": PieceStateRecord<
    "apprentice-p1-4",
    "apprentice",
    ApprenticePieceFields
  >;
  "apprentice-p2-1": PieceStateRecord<
    "apprentice-p2-1",
    "apprentice",
    ApprenticePieceFields
  >;
  "apprentice-p2-2": PieceStateRecord<
    "apprentice-p2-2",
    "apprentice",
    ApprenticePieceFields
  >;
  "apprentice-p2-3": PieceStateRecord<
    "apprentice-p2-3",
    "apprentice",
    ApprenticePieceFields
  >;
  "apprentice-p2-4": PieceStateRecord<
    "apprentice-p2-4",
    "apprentice",
    ApprenticePieceFields
  >;
  "master-p1": PieceStateRecord<"master-p1", "master", MasterPieceFields>;
  "master-p2": PieceStateRecord<"master-p2", "master", MasterPieceFields>;
};

export type DieStateById = Record<string, never>;
export type CardIdsBySharedZoneId = {
  "apprentice-deck": Array<
    | "foreman"
    | "guild-scholar"
    | "inspiration"
    | "lumber-stash"
    | "patrons-favor"
    | "quick-delivery"
    | "reassign"
    | "spare-hands"
    | "stone-cache"
    | "tireless-master"
  >;
  "apprentice-discard": Array<
    | "foreman"
    | "guild-scholar"
    | "inspiration"
    | "lumber-stash"
    | "patrons-favor"
    | "quick-delivery"
    | "reassign"
    | "spare-hands"
    | "stone-cache"
    | "tireless-master"
  >;
  "order-deck": Array<
    | "apprentice-trial"
    | "architects-plan"
    | "forge-order"
    | "furniture-commission"
    | "grand-atelier"
    | "masters-display"
    | "mixed-set"
    | "row-of-pride"
    | "stone-sculpture"
    | "weavers-request"
  >;
  "order-discard": Array<
    | "apprentice-trial"
    | "architects-plan"
    | "forge-order"
    | "furniture-commission"
    | "grand-atelier"
    | "masters-display"
    | "mixed-set"
    | "row-of-pride"
    | "stone-sculpture"
    | "weavers-request"
  >;
};
export type CardIdsByPlayerZoneId = {
  "apprentice-hand": PerPlayer<
    Array<
      | "foreman"
      | "guild-scholar"
      | "inspiration"
      | "lumber-stash"
      | "patrons-favor"
      | "quick-delivery"
      | "reassign"
      | "spare-hands"
      | "stone-cache"
      | "tireless-master"
    >
  >;
  "apprentice-tableau": PerPlayer<
    Array<
      | "foreman"
      | "guild-scholar"
      | "inspiration"
      | "lumber-stash"
      | "patrons-favor"
      | "quick-delivery"
      | "reassign"
      | "spare-hands"
      | "stone-cache"
      | "tireless-master"
    >
  >;
  "order-hand": PerPlayer<
    Array<
      | "apprentice-trial"
      | "architects-plan"
      | "forge-order"
      | "furniture-commission"
      | "grand-atelier"
      | "masters-display"
      | "mixed-set"
      | "row-of-pride"
      | "stone-sculpture"
      | "weavers-request"
    >
  >;
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
  "action-board": SquareBoardStateRecord<
    "action-board",
    | "apothecary"
    | "forge"
    | "guild-hall"
    | "library"
    | "lumberyard"
    | "market"
    | "masons-lodge"
    | "patrons-estate"
    | "quarry"
    | "trade-post"
    | "training-hall"
    | "workshop",
    never,
    | "square-edge:0,0::0,1"
    | "square-edge:0,0::1,0"
    | "square-edge:0,1::0,2"
    | "square-edge:0,1::1,1"
    | "square-edge:0,2::0,3"
    | "square-edge:0,2::1,2"
    | "square-edge:0,3::0,4"
    | "square-edge:0,3::1,3"
    | "square-edge:0,4::1,4"
    | "square-edge:1,0::1,1"
    | "square-edge:1,0::2,0"
    | "square-edge:1,1::1,2"
    | "square-edge:1,1::2,1"
    | "square-edge:1,2::1,3"
    | "square-edge:1,2::2,2"
    | "square-edge:1,3::1,4"
    | "square-edge:1,3::2,3"
    | "square-edge:1,4::2,4"
    | "square-edge:2,0::2,1"
    | "square-edge:2,0::3,0"
    | "square-edge:2,1::2,2"
    | "square-edge:2,1::3,1"
    | "square-edge:2,2::2,3"
    | "square-edge:2,2::3,2"
    | "square-edge:2,3::2,4"
    | "square-edge:2,3::3,3"
    | "square-edge:2,4::3,4"
    | "square-edge:3,0::3,1"
    | "square-edge:3,1::3,2"
    | "square-edge:3,2::3,3"
    | "square-edge:3,3::3,4",
    | "square-vertex:0,0"
    | "square-vertex:0,1"
    | "square-vertex:0,2"
    | "square-vertex:0,3"
    | "square-vertex:0,4"
    | "square-vertex:1,0"
    | "square-vertex:1,1"
    | "square-vertex:1,2"
    | "square-vertex:1,3"
    | "square-vertex:1,4"
    | "square-vertex:2,0"
    | "square-vertex:2,1"
    | "square-vertex:2,2"
    | "square-vertex:2,3"
    | "square-vertex:2,4"
    | "square-vertex:3,0"
    | "square-vertex:3,1"
    | "square-vertex:3,2"
    | "square-vertex:3,3"
    | "square-vertex:3,4",
    ActionBoardBoardFields,
    ActionBoardSpaceFields,
    ActionBoardRelationFields,
    ActionBoardContainerFields,
    ActionBoardEdgeFields,
    ActionBoardVertexFields
  >;
  "wake-up-track": SquareBoardStateRecord<
    "wake-up-track",
    "wake-up-1" | "wake-up-2" | "wake-up-3" | "wake-up-4",
    never,
    | "square-edge:0,0::0,1"
    | "square-edge:0,0::1,0"
    | "square-edge:0,1::1,1"
    | "square-edge:1,0::1,1"
    | "square-edge:1,0::2,0"
    | "square-edge:1,1::2,1"
    | "square-edge:2,0::2,1"
    | "square-edge:2,0::3,0"
    | "square-edge:2,1::3,1"
    | "square-edge:3,0::3,1"
    | "square-edge:3,0::4,0"
    | "square-edge:3,1::4,1"
    | "square-edge:4,0::4,1",
    | "square-vertex:0,0"
    | "square-vertex:0,1"
    | "square-vertex:1,0"
    | "square-vertex:1,1"
    | "square-vertex:2,0"
    | "square-vertex:2,1"
    | "square-vertex:3,0"
    | "square-vertex:3,1"
    | "square-vertex:4,0"
    | "square-vertex:4,1",
    WakeUpTrackBoardFields,
    WakeUpTrackSpaceFields,
    WakeUpTrackRelationFields,
    WakeUpTrackContainerFields,
    WakeUpTrackEdgeFields,
    WakeUpTrackVertexFields
  >;
  "workshop-mat:player-1": SquareBoardStateRecord<
    "workshop-mat:player-1",
    | "cell-r0-c0"
    | "cell-r0-c1"
    | "cell-r0-c2"
    | "cell-r0-c3"
    | "cell-r1-c0"
    | "cell-r1-c1"
    | "cell-r1-c2"
    | "cell-r1-c3"
    | "cell-r2-c0"
    | "cell-r2-c1"
    | "cell-r2-c2"
    | "cell-r2-c3",
    never,
    | "square-edge:0,0::0,1"
    | "square-edge:0,0::1,0"
    | "square-edge:0,1::0,2"
    | "square-edge:0,1::1,1"
    | "square-edge:0,2::0,3"
    | "square-edge:0,2::1,2"
    | "square-edge:0,3::1,3"
    | "square-edge:1,0::1,1"
    | "square-edge:1,0::2,0"
    | "square-edge:1,1::1,2"
    | "square-edge:1,1::2,1"
    | "square-edge:1,2::1,3"
    | "square-edge:1,2::2,2"
    | "square-edge:1,3::2,3"
    | "square-edge:2,0::2,1"
    | "square-edge:2,0::3,0"
    | "square-edge:2,1::2,2"
    | "square-edge:2,1::3,1"
    | "square-edge:2,2::2,3"
    | "square-edge:2,2::3,2"
    | "square-edge:2,3::3,3"
    | "square-edge:3,0::3,1"
    | "square-edge:3,0::4,0"
    | "square-edge:3,1::3,2"
    | "square-edge:3,1::4,1"
    | "square-edge:3,2::3,3"
    | "square-edge:3,2::4,2"
    | "square-edge:3,3::4,3"
    | "square-edge:4,0::4,1"
    | "square-edge:4,1::4,2"
    | "square-edge:4,2::4,3",
    | "square-vertex:0,0"
    | "square-vertex:0,1"
    | "square-vertex:0,2"
    | "square-vertex:0,3"
    | "square-vertex:1,0"
    | "square-vertex:1,1"
    | "square-vertex:1,2"
    | "square-vertex:1,3"
    | "square-vertex:2,0"
    | "square-vertex:2,1"
    | "square-vertex:2,2"
    | "square-vertex:2,3"
    | "square-vertex:3,0"
    | "square-vertex:3,1"
    | "square-vertex:3,2"
    | "square-vertex:3,3"
    | "square-vertex:4,0"
    | "square-vertex:4,1"
    | "square-vertex:4,2"
    | "square-vertex:4,3",
    WorkshopMatBoardFields,
    WorkshopMatSpaceFields,
    WorkshopMatRelationFields,
    WorkshopMatContainerFields,
    WorkshopMatEdgeFields,
    WorkshopMatVertexFields
  >;
  "workshop-mat:player-2": SquareBoardStateRecord<
    "workshop-mat:player-2",
    | "cell-r0-c0"
    | "cell-r0-c1"
    | "cell-r0-c2"
    | "cell-r0-c3"
    | "cell-r1-c0"
    | "cell-r1-c1"
    | "cell-r1-c2"
    | "cell-r1-c3"
    | "cell-r2-c0"
    | "cell-r2-c1"
    | "cell-r2-c2"
    | "cell-r2-c3",
    never,
    | "square-edge:0,0::0,1"
    | "square-edge:0,0::1,0"
    | "square-edge:0,1::0,2"
    | "square-edge:0,1::1,1"
    | "square-edge:0,2::0,3"
    | "square-edge:0,2::1,2"
    | "square-edge:0,3::1,3"
    | "square-edge:1,0::1,1"
    | "square-edge:1,0::2,0"
    | "square-edge:1,1::1,2"
    | "square-edge:1,1::2,1"
    | "square-edge:1,2::1,3"
    | "square-edge:1,2::2,2"
    | "square-edge:1,3::2,3"
    | "square-edge:2,0::2,1"
    | "square-edge:2,0::3,0"
    | "square-edge:2,1::2,2"
    | "square-edge:2,1::3,1"
    | "square-edge:2,2::2,3"
    | "square-edge:2,2::3,2"
    | "square-edge:2,3::3,3"
    | "square-edge:3,0::3,1"
    | "square-edge:3,0::4,0"
    | "square-edge:3,1::3,2"
    | "square-edge:3,1::4,1"
    | "square-edge:3,2::3,3"
    | "square-edge:3,2::4,2"
    | "square-edge:3,3::4,3"
    | "square-edge:4,0::4,1"
    | "square-edge:4,1::4,2"
    | "square-edge:4,2::4,3",
    | "square-vertex:0,0"
    | "square-vertex:0,1"
    | "square-vertex:0,2"
    | "square-vertex:0,3"
    | "square-vertex:1,0"
    | "square-vertex:1,1"
    | "square-vertex:1,2"
    | "square-vertex:1,3"
    | "square-vertex:2,0"
    | "square-vertex:2,1"
    | "square-vertex:2,2"
    | "square-vertex:2,3"
    | "square-vertex:3,0"
    | "square-vertex:3,1"
    | "square-vertex:3,2"
    | "square-vertex:3,3"
    | "square-vertex:4,0"
    | "square-vertex:4,1"
    | "square-vertex:4,2"
    | "square-vertex:4,3",
    WorkshopMatBoardFields,
    WorkshopMatSpaceFields,
    WorkshopMatRelationFields,
    WorkshopMatContainerFields,
    WorkshopMatEdgeFields,
    WorkshopMatVertexFields
  >;
};

export type HexBoardStateById = Record<string, never>;

export type SquareBoardStateById = {
  "action-board": BoardStateById["action-board"];
  "wake-up-track": BoardStateById["wake-up-track"];
  "workshop-mat:player-1": BoardStateById["workshop-mat:player-1"];
  "workshop-mat:player-2": BoardStateById["workshop-mat:player-2"];
};

type ManifestRecordValue<T> = T[keyof T];
type ManifestArrayElement<T> = T extends readonly (infer Item)[]
  ? Item
  : T extends (infer Item)[]
    ? Item
    : never;

export type BoardState<BoardIdValue extends BoardId = BoardId> =
  BoardIdValue extends keyof BoardStateById
    ? BoardStateById[BoardIdValue]
    : never;

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
  BoardIdValue extends keyof HexAuthoredEdgesByBoardId =
    keyof HexAuthoredEdgesByBoardId,
> = BoardIdValue extends keyof HexAuthoredEdgesByBoardId
  ? ManifestArrayElement<HexAuthoredEdgesByBoardId[BoardIdValue]>
  : never;

export type HexAuthoredEdgeRef<
  BoardIdValue extends keyof HexAuthoredEdgesByBoardId =
    keyof HexAuthoredEdgesByBoardId,
> = HexAuthoredEdgeState<BoardIdValue> extends { ref: infer Ref } ? Ref : never;

export type HexAuthoredVertexState<
  BoardIdValue extends keyof HexAuthoredVerticesByBoardId =
    keyof HexAuthoredVerticesByBoardId,
> = BoardIdValue extends keyof HexAuthoredVerticesByBoardId
  ? ManifestArrayElement<HexAuthoredVerticesByBoardId[BoardIdValue]>
  : never;

export type HexAuthoredVertexRef<
  BoardIdValue extends keyof HexAuthoredVerticesByBoardId =
    keyof HexAuthoredVerticesByBoardId,
> =
  HexAuthoredVertexState<BoardIdValue> extends { ref: infer Ref } ? Ref : never;

export type HexEdgeState<
  BoardIdValue extends keyof HexBoardStateById = keyof HexBoardStateById,
> = BoardIdValue extends keyof HexBoardStateById
  ? ManifestArrayElement<HexBoardStateById[BoardIdValue]["edges"]>
  : never;

export type HexEdgeFields<
  BoardIdValue extends keyof HexBoardStateById = keyof HexBoardStateById,
> =
  HexEdgeState<BoardIdValue> extends { fields: infer Fields } ? Fields : never;

export type HexVertexState<
  BoardIdValue extends keyof HexBoardStateById = keyof HexBoardStateById,
> = BoardIdValue extends keyof HexBoardStateById
  ? ManifestArrayElement<HexBoardStateById[BoardIdValue]["vertices"]>
  : never;

export type HexVertexFields<
  BoardIdValue extends keyof HexBoardStateById = keyof HexBoardStateById,
> =
  HexVertexState<BoardIdValue> extends { fields: infer Fields }
    ? Fields
    : never;

export type SquareEdgeState<
  BoardIdValue extends keyof SquareBoardStateById = keyof SquareBoardStateById,
> = BoardIdValue extends keyof SquareBoardStateById
  ? ManifestArrayElement<SquareBoardStateById[BoardIdValue]["edges"]>
  : never;

export type SquareEdgeFields<
  BoardIdValue extends keyof SquareBoardStateById = keyof SquareBoardStateById,
> =
  SquareEdgeState<BoardIdValue> extends { fields: infer Fields }
    ? Fields
    : never;

export type SquareVertexState<
  BoardIdValue extends keyof SquareBoardStateById = keyof SquareBoardStateById,
> = BoardIdValue extends keyof SquareBoardStateById
  ? ManifestArrayElement<SquareBoardStateById[BoardIdValue]["vertices"]>
  : never;

export type SquareVertexFields<
  BoardIdValue extends keyof SquareBoardStateById = keyof SquareBoardStateById,
> =
  SquareVertexState<BoardIdValue> extends { fields: infer Fields }
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

export type TiledVertexState<BoardIdValue extends TiledBoardId = TiledBoardId> =
  BoardIdValue extends keyof HexBoardStateById
    ? HexVertexState<BoardIdValue>
    : BoardIdValue extends keyof SquareBoardStateById
      ? SquareVertexState<BoardIdValue>
      : never;

export type TiledVertexFields<
  BoardIdValue extends TiledBoardId = TiledBoardId,
> =
  TiledVertexState<BoardIdValue> extends { fields: infer Fields }
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
  "order-cards": OrderCardsCardPropertiesSchema,
  "apprentice-cards": ApprenticeCardsCardPropertiesSchema,
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
  "apprentice-p1-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("apprentice-p1-1"),
    pieceTypeId: z.literal("apprentice"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: ApprenticePieceFieldsSchema,
  }),
  "apprentice-p1-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("apprentice-p1-2"),
    pieceTypeId: z.literal("apprentice"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: ApprenticePieceFieldsSchema,
  }),
  "apprentice-p1-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("apprentice-p1-3"),
    pieceTypeId: z.literal("apprentice"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: ApprenticePieceFieldsSchema,
  }),
  "apprentice-p1-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("apprentice-p1-4"),
    pieceTypeId: z.literal("apprentice"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: ApprenticePieceFieldsSchema,
  }),
  "apprentice-p2-1": z.object({
    componentType: z.string().optional(),
    id: z.literal("apprentice-p2-1"),
    pieceTypeId: z.literal("apprentice"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: ApprenticePieceFieldsSchema,
  }),
  "apprentice-p2-2": z.object({
    componentType: z.string().optional(),
    id: z.literal("apprentice-p2-2"),
    pieceTypeId: z.literal("apprentice"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: ApprenticePieceFieldsSchema,
  }),
  "apprentice-p2-3": z.object({
    componentType: z.string().optional(),
    id: z.literal("apprentice-p2-3"),
    pieceTypeId: z.literal("apprentice"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: ApprenticePieceFieldsSchema,
  }),
  "apprentice-p2-4": z.object({
    componentType: z.string().optional(),
    id: z.literal("apprentice-p2-4"),
    pieceTypeId: z.literal("apprentice"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: ApprenticePieceFieldsSchema,
  }),
  "master-p1": z.object({
    componentType: z.string().optional(),
    id: z.literal("master-p1"),
    pieceTypeId: z.literal("master"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: MasterPieceFieldsSchema,
  }),
  "master-p2": z.object({
    componentType: z.string().optional(),
    id: z.literal("master-p2"),
    pieceTypeId: z.literal("master"),
    pieceName: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    properties: MasterPieceFieldsSchema,
  }),
});
const dieStateByIdSchema = z.object({});
const boardStateByIdSchema = z.object({
  "action-board": z.object({
    id: z.literal("action-board"),
    baseId: z.literal("action-board"),
    layout: z.literal("square"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("shared"),
    playerId: ids.playerId.nullable().optional(),
    templateId: z.string().nullable().optional(),
    fields: ActionBoardBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        row: z.number().int(),
        col: z.number().int(),
        fields: ActionBoardSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: ids.relationTypeId,
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: ActionBoardRelationFieldsSchema,
      }),
    ),
    containers: z.object({}),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: ActionBoardEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(4),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: ActionBoardVertexFieldsSchema,
      }),
    ),
  }),
  "wake-up-track": z.object({
    id: z.literal("wake-up-track"),
    baseId: z.literal("wake-up-track"),
    layout: z.literal("square"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("shared"),
    playerId: ids.playerId.nullable().optional(),
    templateId: z.string().nullable().optional(),
    fields: WakeUpTrackBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        row: z.number().int(),
        col: z.number().int(),
        fields: WakeUpTrackSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: ids.relationTypeId,
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: WakeUpTrackRelationFieldsSchema,
      }),
    ),
    containers: z.object({}),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WakeUpTrackEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(4),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WakeUpTrackVertexFieldsSchema,
      }),
    ),
  }),
  "workshop-mat:player-1": z.object({
    id: z.literal("workshop-mat:player-1"),
    baseId: z.literal("workshop-mat"),
    layout: z.literal("square"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("perPlayer"),
    playerId: z.literal("player-1"),
    templateId: z.string().nullable().optional(),
    fields: WorkshopMatBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        row: z.number().int(),
        col: z.number().int(),
        fields: WorkshopMatSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: ids.relationTypeId,
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: WorkshopMatRelationFieldsSchema,
      }),
    ),
    containers: z.object({}),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WorkshopMatEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(4),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WorkshopMatVertexFieldsSchema,
      }),
    ),
  }),
  "workshop-mat:player-2": z.object({
    id: z.literal("workshop-mat:player-2"),
    baseId: z.literal("workshop-mat"),
    layout: z.literal("square"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("perPlayer"),
    playerId: z.literal("player-2"),
    templateId: z.string().nullable().optional(),
    fields: WorkshopMatBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        row: z.number().int(),
        col: z.number().int(),
        fields: WorkshopMatSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: ids.relationTypeId,
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: WorkshopMatRelationFieldsSchema,
      }),
    ),
    containers: z.object({}),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WorkshopMatEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(4),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WorkshopMatVertexFieldsSchema,
      }),
    ),
  }),
});
const hexBoardStateByIdSchema = z.object({});
const squareBoardStateByIdSchema = z.object({
  "action-board": z.object({
    id: z.literal("action-board"),
    baseId: z.literal("action-board"),
    layout: z.literal("square"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("shared"),
    playerId: ids.playerId.nullable().optional(),
    templateId: z.string().nullable().optional(),
    fields: ActionBoardBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        row: z.number().int(),
        col: z.number().int(),
        fields: ActionBoardSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: ids.relationTypeId,
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: ActionBoardRelationFieldsSchema,
      }),
    ),
    containers: z.object({}),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: ActionBoardEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(4),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: ActionBoardVertexFieldsSchema,
      }),
    ),
  }),
  "wake-up-track": z.object({
    id: z.literal("wake-up-track"),
    baseId: z.literal("wake-up-track"),
    layout: z.literal("square"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("shared"),
    playerId: ids.playerId.nullable().optional(),
    templateId: z.string().nullable().optional(),
    fields: WakeUpTrackBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        row: z.number().int(),
        col: z.number().int(),
        fields: WakeUpTrackSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: ids.relationTypeId,
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: WakeUpTrackRelationFieldsSchema,
      }),
    ),
    containers: z.object({}),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WakeUpTrackEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(4),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WakeUpTrackVertexFieldsSchema,
      }),
    ),
  }),
  "workshop-mat:player-1": z.object({
    id: z.literal("workshop-mat:player-1"),
    baseId: z.literal("workshop-mat"),
    layout: z.literal("square"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("perPlayer"),
    playerId: z.literal("player-1"),
    templateId: z.string().nullable().optional(),
    fields: WorkshopMatBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        row: z.number().int(),
        col: z.number().int(),
        fields: WorkshopMatSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: ids.relationTypeId,
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: WorkshopMatRelationFieldsSchema,
      }),
    ),
    containers: z.object({}),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WorkshopMatEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(4),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WorkshopMatVertexFieldsSchema,
      }),
    ),
  }),
  "workshop-mat:player-2": z.object({
    id: z.literal("workshop-mat:player-2"),
    baseId: z.literal("workshop-mat"),
    layout: z.literal("square"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.literal("perPlayer"),
    playerId: z.literal("player-2"),
    templateId: z.string().nullable().optional(),
    fields: WorkshopMatBoardFieldsSchema,
    // T220: see generic-board comment on the loose-keying choice.
    spaces: z.record(
      z.string(),
      z.object({
        id: ids.spaceId,
        name: z.string().nullable().optional(),
        typeId: ids.spaceTypeId.nullable().optional(),
        row: z.number().int(),
        col: z.number().int(),
        fields: WorkshopMatSpaceFieldsSchema,
        zoneId: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string().nullable().optional(),
        typeId: ids.relationTypeId,
        fromSpaceId: ids.spaceId,
        toSpaceId: ids.spaceId,
        directed: z.boolean(),
        fields: WorkshopMatRelationFieldsSchema,
      }),
    ),
    containers: z.object({}),
    edges: z.array(
      z.object({
        id: ids.edgeId,
        spaceIds: z.array(ids.spaceId).min(1).max(2),
        typeId: ids.edgeTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WorkshopMatEdgeFieldsSchema,
      }),
    ),
    vertices: z.array(
      z.object({
        id: ids.vertexId,
        spaceIds: z.array(ids.spaceId).min(1).max(4),
        typeId: ids.vertexTypeId.nullable().optional(),
        label: z.string().nullable().optional(),
        ownerId: ids.playerId.nullable().optional(),
        fields: WorkshopMatVertexFieldsSchema,
      }),
    ),
  }),
});
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
    visibility: z.record(
      zoneIdSchema,
      z.enum(["all", "ownerOnly", "public", "hidden"]),
    ),
    cardSetIdsByZoneId: z
      .record(zoneIdSchema, z.array(ids.cardSetId))
      .optional(),
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
  return perPlayer(
    playerIds,
    () =>
      Object.fromEntries(
        literals.resourceIds.map((resourceId) => [resourceId, 0]),
      ) as Record<ResourceId, number>,
  );
}

export const defaults = {
  zones: (playerIds?: readonly string[]) =>
    ({
      shared: cloneManifestDefault({
        "apprentice-deck": [],
        "apprentice-discard": [],
        "order-deck": [],
        "order-discard": [],
      }),
      perPlayer: buildPerPlayerCardIds(resolveDefaultPlayerIds(playerIds)),
      visibility: cloneManifestDefault({
        "apprentice-deck": "hidden",
        "apprentice-discard": "public",
        "apprentice-hand": "ownerOnly",
        "apprentice-tableau": "public",
        "order-deck": "hidden",
        "order-discard": "public",
        "order-hand": "ownerOnly",
      }),
      cardSetIdsByZoneId: cloneManifestDefault({
        "apprentice-deck": ["apprentice-cards"],
        "apprentice-discard": ["apprentice-cards"],
        "apprentice-hand": ["apprentice-cards"],
        "apprentice-tableau": ["apprentice-cards"],
        "order-deck": ["order-cards"],
        "order-discard": ["order-cards"],
        "order-hand": ["order-cards"],
      }),
    }) as TableState["zones"],
  decks: () =>
    cloneManifestDefault({
      "apprentice-deck": [],
      "apprentice-discard": [],
      "order-deck": [],
      "order-discard": [],
    }) as TableState["decks"],
  hands: (playerIds?: readonly string[]) =>
    buildPerPlayerCardIds(
      resolveDefaultPlayerIds(playerIds),
    ) as TableState["hands"],
  handVisibility: () =>
    cloneManifestDefault({
      "apprentice-hand": "ownerOnly",
      "apprentice-tableau": "public",
      "order-hand": "ownerOnly",
    }) as TableState["handVisibility"],
  ownerOfCard: () =>
    cloneManifestDefault({
      "apprentice-trial": null,
      "architects-plan": null,
      foreman: null,
      "forge-order": null,
      "furniture-commission": null,
      "grand-atelier": null,
      "guild-scholar": null,
      inspiration: null,
      "lumber-stash": null,
      "masters-display": null,
      "mixed-set": null,
      "patrons-favor": null,
      "quick-delivery": null,
      reassign: null,
      "row-of-pride": null,
      "spare-hands": null,
      "stone-cache": null,
      "stone-sculpture": null,
      "tireless-master": null,
      "weavers-request": null,
    }) as TableState["ownerOfCard"],
  visibility: () =>
    cloneManifestDefault({
      "apprentice-trial": { faceUp: true },
      "architects-plan": { faceUp: true },
      foreman: { faceUp: true },
      "forge-order": { faceUp: true },
      "furniture-commission": { faceUp: true },
      "grand-atelier": { faceUp: true },
      "guild-scholar": { faceUp: true },
      inspiration: { faceUp: true },
      "lumber-stash": { faceUp: true },
      "masters-display": { faceUp: true },
      "mixed-set": { faceUp: true },
      "patrons-favor": { faceUp: true },
      "quick-delivery": { faceUp: true },
      reassign: { faceUp: true },
      "row-of-pride": { faceUp: true },
      "spare-hands": { faceUp: true },
      "stone-cache": { faceUp: true },
      "stone-sculpture": { faceUp: true },
      "tireless-master": { faceUp: true },
      "weavers-request": { faceUp: true },
    }) as TableState["visibility"],
  resources: (playerIds?: readonly string[]) =>
    buildPlayerResources(resolveDefaultPlayerIds(playerIds)),
} as const;

type GeneratedStaticBoards = Pick<
  PublicTableState["boards"],
  "byId" | "hex" | "square"
>;
type GeneratedStaticBoardsJsonEnvelope = Omit<
  StaticBoardsJsonEnvelope<TableState>,
  "boards"
> & {
  boards: GeneratedStaticBoards;
};
const manifestStaticData =
  staticBoardsData as unknown as GeneratedStaticBoardsJsonEnvelope;
export const staticBoards = manifestStaticData.boards;

const baseInitialTable = cloneManifestDefault<TableState>(
  manifestStaticData.initialTable,
);
const baseDeckCardsByZoneId = baseInitialTable.decks as Record<
  SharedZoneId,
  readonly CardId[]
>;

export function createInitialTable(
  options: {
    playerIds?: readonly string[];
    shuffleItems?: <Value>(values: readonly Value[]) => Value[];
  } = {},
): TableState {
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
  square: [
    "action-board",
    "wake-up-track",
    "workshop-mat:player-1",
    "workshop-mat:player-2",
  ] as const,
} as const;
const boardBaseIdsByLayoutLookup = {
  square: ["action-board", "wake-up-track", "workshop-mat"] as const,
} as const;
const boardIdsByBaseIdLookup = {
  "action-board": ["action-board"] as const,
  "wake-up-track": ["wake-up-track"] as const,
  "workshop-mat": ["workshop-mat:player-1", "workshop-mat:player-2"] as const,
} as const;
const boardBaseIdsByTemplateIdLookup = {
  "action-board-template": ["action-board"] as const,
  "wake-up-track-template": ["wake-up-track"] as const,
  "workshop-mat-template": ["workshop-mat"] as const,
} as const;
const boardLayoutByIdLookup = {
  "action-board": "square",
  "wake-up-track": "square",
  "workshop-mat:player-1": "square",
  "workshop-mat:player-2": "square",
} as const;
const boardTemplateLayoutByIdLookup = {
  "action-board-template": "square",
  "wake-up-track-template": "square",
  "workshop-mat-template": "square",
} as const;
const boardIdsByTypeIdLookup = {} as const;
const spaceIdsByBoardIdLookup = {
  "action-board": [
    "apothecary",
    "forge",
    "guild-hall",
    "library",
    "lumberyard",
    "market",
    "masons-lodge",
    "patrons-estate",
    "quarry",
    "trade-post",
    "training-hall",
    "workshop",
  ] as const,
  "wake-up-track": [
    "wake-up-1",
    "wake-up-2",
    "wake-up-3",
    "wake-up-4",
  ] as const,
  "workshop-mat:player-1": [
    "cell-r0-c0",
    "cell-r0-c1",
    "cell-r0-c2",
    "cell-r0-c3",
    "cell-r1-c0",
    "cell-r1-c1",
    "cell-r1-c2",
    "cell-r1-c3",
    "cell-r2-c0",
    "cell-r2-c1",
    "cell-r2-c2",
    "cell-r2-c3",
  ] as const,
  "workshop-mat:player-2": [
    "cell-r0-c0",
    "cell-r0-c1",
    "cell-r0-c2",
    "cell-r0-c3",
    "cell-r1-c0",
    "cell-r1-c1",
    "cell-r1-c2",
    "cell-r1-c3",
    "cell-r2-c0",
    "cell-r2-c1",
    "cell-r2-c2",
    "cell-r2-c3",
  ] as const,
} as const;
const spaceTypeIdByBoardIdLookup = {
  "action-board": {
    apothecary: "variable",
    forge: "variable",
    "guild-hall": "fixed",
    library: "variable",
    lumberyard: "fixed",
    market: "fixed",
    "masons-lodge": "variable",
    "patrons-estate": "variable",
    quarry: "fixed",
    "trade-post": "variable",
    "training-hall": "fixed",
    workshop: "fixed",
  },
  "wake-up-track": {
    "wake-up-1": "wake-up-slot",
    "wake-up-2": "wake-up-slot",
    "wake-up-3": "wake-up-slot",
    "wake-up-4": "wake-up-slot",
  },
  "workshop-mat:player-1": {
    "cell-r0-c0": "cell",
    "cell-r0-c1": "cell",
    "cell-r0-c2": "cell",
    "cell-r0-c3": "cell",
    "cell-r1-c0": "cell",
    "cell-r1-c1": "cell",
    "cell-r1-c2": "cell",
    "cell-r1-c3": "cell",
    "cell-r2-c0": "cell",
    "cell-r2-c1": "cell",
    "cell-r2-c2": "cell",
    "cell-r2-c3": "cell",
  },
  "workshop-mat:player-2": {
    "cell-r0-c0": "cell",
    "cell-r0-c1": "cell",
    "cell-r0-c2": "cell",
    "cell-r0-c3": "cell",
    "cell-r1-c0": "cell",
    "cell-r1-c1": "cell",
    "cell-r1-c2": "cell",
    "cell-r1-c3": "cell",
    "cell-r2-c0": "cell",
    "cell-r2-c1": "cell",
    "cell-r2-c2": "cell",
    "cell-r2-c3": "cell",
  },
} as const;
const spaceIdsByTypeIdLookup = {
  cell: [
    "cell-r0-c0",
    "cell-r0-c1",
    "cell-r0-c2",
    "cell-r0-c3",
    "cell-r1-c0",
    "cell-r1-c1",
    "cell-r1-c2",
    "cell-r1-c3",
    "cell-r2-c0",
    "cell-r2-c1",
    "cell-r2-c2",
    "cell-r2-c3",
  ] as const,
  fixed: [
    "guild-hall",
    "lumberyard",
    "market",
    "quarry",
    "training-hall",
    "workshop",
  ] as const,
  variable: [
    "apothecary",
    "forge",
    "library",
    "masons-lodge",
    "patrons-estate",
    "trade-post",
  ] as const,
  "wake-up-slot": ["wake-up-1", "wake-up-2", "wake-up-3", "wake-up-4"] as const,
} as const;
const containerIdsByBoardIdLookup = {
  "action-board": [] as const,
  "wake-up-track": [] as const,
  "workshop-mat:player-1": [] as const,
  "workshop-mat:player-2": [] as const,
} as const;
const containerHostByBoardIdLookup = {
  "action-board": {},
  "wake-up-track": {},
  "workshop-mat:player-1": {},
  "workshop-mat:player-2": {},
} as const;
const relationTypeIdsByBoardIdLookup = {
  "action-board": ["adjacent"] as const,
  "wake-up-track": ["adjacent"] as const,
  "workshop-mat:player-1": ["adjacent"] as const,
  "workshop-mat:player-2": ["adjacent"] as const,
} as const;
const edgeIdsByTypeIdLookup = {} as const;
const edgeIdsByBoardIdAndTypeIdLookup = {
  "action-board": {},
  "wake-up-track": {},
  "workshop-mat:player-1": {},
  "workshop-mat:player-2": {},
} as const;
const vertexIdsByTypeIdLookup = {} as const;
const vertexIdsByBoardIdAndTypeIdLookup = {
  "action-board": {},
  "wake-up-track": {},
  "workshop-mat:player-1": {},
  "workshop-mat:player-2": {},
} as const;
const authoredHexEdgesByBoardIdLookup = {} as const;
const authoredHexVerticesByBoardIdLookup = {} as const;
const authoredHexEdgeIdsByBoardIdAndRefLookup = {} as const;
const authoredHexVertexIdsByBoardIdAndRefLookup = {} as const;

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
  boardIdsForLayout<LayoutValue extends keyof typeof boardIdsByLayoutLookup>(
    layout: LayoutValue,
  ): (typeof boardIdsByLayoutLookup)[LayoutValue] {
    return boardIdsByLayoutLookup[layout];
  },
  boardBaseIdsForLayout<
    LayoutValue extends keyof typeof boardBaseIdsByLayoutLookup,
  >(layout: LayoutValue): (typeof boardBaseIdsByLayoutLookup)[LayoutValue] {
    return boardBaseIdsByLayoutLookup[layout];
  },
  boardIdsForBase<BoardBaseIdValue extends keyof typeof boardIdsByBaseIdLookup>(
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
  spaceRecord<BoardIdValue extends keyof typeof spaceIdsByBoardIdLookup, Value>(
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
  ): Record<(typeof containerIdsByBoardIdLookup)[BoardIdValue][number], Value> {
    const containerIds = containerIdsByBoardIdLookup[boardId];
    if (!containerIds) {
      throw new Error(`Unknown board '${String(boardId)}'.`);
    }
    return buildTypedRecord(containerIds, initial) as Record<
      (typeof containerIdsByBoardIdLookup)[BoardIdValue][number],
      Value
    >;
  },
  isContainerId<BoardIdValue extends keyof typeof containerIdsByBoardIdLookup>(
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
    ContainerIdValue extends
      keyof (typeof containerHostByBoardIdLookup)[BoardIdValue],
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
    const edgeId = (
      boardEdges as Record<string, HexEdgeState<BoardIdValue>["id"]>
    )[authoredHexRefKey(edgeRef.spaces)];
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
  ): BoardLookupIdValue<typeof edgeIdsByBoardIdAndTypeIdLookup, BoardIdValue> {
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
    TypeIdValue extends
      keyof (typeof edgeIdsByBoardIdAndTypeIdLookup)[BoardIdValue],
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
      BoardLookupIdValue<
        typeof vertexIdsByBoardIdAndTypeIdLookup,
        BoardIdValue
      >,
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
    TypeIdValue extends
      keyof (typeof vertexIdsByBoardIdAndTypeIdLookup)[BoardIdValue],
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
  sharedBoardRef(boardBaseId: BoardBaseId): SharedBoardRef<BoardBaseId> {
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
