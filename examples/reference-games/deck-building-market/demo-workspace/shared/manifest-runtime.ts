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
  "brainstorm": "brainstorm",
  "concept": "concept",
  "critic": "critic",
  "doodle": "doodle",
  "eraser": "eraser",
  "gallery": "gallery",
  "idea": "idea",
  "inkwork": "inkwork",
  "masterpiece": "masterpiece",
  "openMic": "open-mic",
  "sketch": "sketch",
  "sketchpad": "sketchpad",
  "smudge": "smudge",
  "studio": "studio",
  "studioVisit": "studio-visit",
} as const satisfies Record<string, CardType>;

export const zones = {
  "deck": "deck",
  "discard": "discard",
  "hand": "hand",
  "inPlay": "in-play",
  "supplyBrainstorm": "supply-brainstorm",
  "supplyConcept": "supply-concept",
  "supplyCritic": "supply-critic",
  "supplyDoodle": "supply-doodle",
  "supplyEraser": "supply-eraser",
  "supplyGallery": "supply-gallery",
  "supplyIdea": "supply-idea",
  "supplyInkwork": "supply-inkwork",
  "supplyMasterpiece": "supply-masterpiece",
  "supplyOpenMic": "supply-open-mic",
  "supplySketch": "supply-sketch",
  "supplySketchpad": "supply-sketchpad",
  "supplySmudge": "supply-smudge",
  "supplyStudio": "supply-studio",
  "supplyStudioVisit": "supply-studio-visit",
  "trash": "trash",
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
  "supply-brainstorm": ComponentId[];
  "supply-concept": ComponentId[];
  "supply-critic": ComponentId[];
  "supply-doodle": ComponentId[];
  "supply-eraser": ComponentId[];
  "supply-gallery": ComponentId[];
  "supply-idea": ComponentId[];
  "supply-inkwork": ComponentId[];
  "supply-masterpiece": ComponentId[];
  "supply-open-mic": ComponentId[];
  "supply-sketch": ComponentId[];
  "supply-sketchpad": ComponentId[];
  "supply-smudge": ComponentId[];
  "supply-studio": ComponentId[];
  "supply-studio-visit": ComponentId[];
  "trash": ComponentId[];
};
export type ComponentIdsByPlayerZoneId = {
  "deck": PerPlayer<ComponentId[]>;
  "discard": PerPlayer<ComponentId[]>;
  "hand": PerPlayer<ComponentId[]>;
  "in-play": PerPlayer<ComponentId[]>;
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
export const setupOptionsById = {
  "default-game": {
    "id": "default-game",
    "name": "Default game",
    "description": "Two-player Sketchbook with the standard kingdom.",
    "choices": [
      {
        "id": "default-game",
        "label": "Default game",
        "description": null
      }
    ]
  }
} as const;
export const setupChoiceIdsByOptionId = {
  "default-game": ["default-game"] as const,
} as const;
export const setupProfilesById = {
  "default-setup": {
    "id": "default-setup",
    "name": "Default setup",
    "description": null,
    "optionValues": {
      "default-game": "default-game"
    }
  },
  "empty-masterpiece-regression": {
    "id": "empty-masterpiece-regression",
    "name": "Empty Masterpiece regression",
    "description": "Reducer-test profile that starts with the Masterpiece pile depleted before the next end-turn boundary.",
    "optionValues": {
      "default-game": "default-game"
    }
  }
} as const;

export type SketchbookCardsDoodleCardProperties = {
  "cost": number;
  "coins": number;
};

export const SketchbookCardsDoodleCardPropertiesSchema = z.object({
  "cost": z.number().int(),
  "coins": z.number().int(),
});

export type SketchbookCardsSketchCardProperties = {
  "cost": number;
  "coins": number;
};

export const SketchbookCardsSketchCardPropertiesSchema = z.object({
  "cost": z.number().int(),
  "coins": z.number().int(),
});

export type SketchbookCardsInkworkCardProperties = {
  "cost": number;
  "coins": number;
};

export const SketchbookCardsInkworkCardPropertiesSchema = z.object({
  "cost": z.number().int(),
  "coins": z.number().int(),
});

export type SketchbookCardsIdeaCardProperties = {
  "cost": number;
  "vp": number;
};

export const SketchbookCardsIdeaCardPropertiesSchema = z.object({
  "cost": z.number().int(),
  "vp": z.number().int(),
});

export type SketchbookCardsConceptCardProperties = {
  "cost": number;
  "vp": number;
};

export const SketchbookCardsConceptCardPropertiesSchema = z.object({
  "cost": z.number().int(),
  "vp": z.number().int(),
});

export type SketchbookCardsMasterpieceCardProperties = {
  "cost": number;
  "vp": number;
};

export const SketchbookCardsMasterpieceCardPropertiesSchema = z.object({
  "cost": z.number().int(),
  "vp": z.number().int(),
});

export type SketchbookCardsSmudgeCardProperties = {
  "cost": number;
  "vp": number;
};

export const SketchbookCardsSmudgeCardPropertiesSchema = z.object({
  "cost": z.number().int(),
  "vp": z.number().int(),
});

export type SketchbookCardsBrainstormCardProperties = {
  "cost": number;
};

export const SketchbookCardsBrainstormCardPropertiesSchema = z.object({
  "cost": z.number().int(),
});

export type SketchbookCardsStudioCardProperties = {
  "cost": number;
};

export const SketchbookCardsStudioCardPropertiesSchema = z.object({
  "cost": z.number().int(),
});

export type SketchbookCardsGalleryCardProperties = {
  "cost": number;
};

export const SketchbookCardsGalleryCardPropertiesSchema = z.object({
  "cost": z.number().int(),
});

export type SketchbookCardsOpenMicCardProperties = {
  "cost": number;
};

export const SketchbookCardsOpenMicCardPropertiesSchema = z.object({
  "cost": z.number().int(),
});

export type SketchbookCardsCriticCardProperties = {
  "cost": number;
};

export const SketchbookCardsCriticCardPropertiesSchema = z.object({
  "cost": z.number().int(),
});

export type SketchbookCardsEraserCardProperties = {
  "cost": number;
};

export const SketchbookCardsEraserCardPropertiesSchema = z.object({
  "cost": z.number().int(),
});

export type SketchbookCardsSketchpadCardProperties = {
  "cost": number;
};

export const SketchbookCardsSketchpadCardPropertiesSchema = z.object({
  "cost": z.number().int(),
});

export type SketchbookCardsStudioVisitCardProperties = {
  "cost": number;
};

export const SketchbookCardsStudioVisitCardPropertiesSchema = z.object({
  "cost": z.number().int(),
});

export type SketchbookCardsCardProperties = SketchbookCardsDoodleCardProperties | SketchbookCardsSketchCardProperties | SketchbookCardsInkworkCardProperties | SketchbookCardsIdeaCardProperties | SketchbookCardsConceptCardProperties | SketchbookCardsMasterpieceCardProperties | SketchbookCardsSmudgeCardProperties | SketchbookCardsBrainstormCardProperties | SketchbookCardsStudioCardProperties | SketchbookCardsGalleryCardProperties | SketchbookCardsOpenMicCardProperties | SketchbookCardsCriticCardProperties | SketchbookCardsEraserCardProperties | SketchbookCardsSketchpadCardProperties | SketchbookCardsStudioVisitCardProperties;

export const SketchbookCardsCardPropertiesSchema = z.union([SketchbookCardsDoodleCardPropertiesSchema, SketchbookCardsSketchCardPropertiesSchema, SketchbookCardsInkworkCardPropertiesSchema, SketchbookCardsIdeaCardPropertiesSchema, SketchbookCardsConceptCardPropertiesSchema, SketchbookCardsMasterpieceCardPropertiesSchema, SketchbookCardsSmudgeCardPropertiesSchema, SketchbookCardsBrainstormCardPropertiesSchema, SketchbookCardsStudioCardPropertiesSchema, SketchbookCardsGalleryCardPropertiesSchema, SketchbookCardsOpenMicCardPropertiesSchema, SketchbookCardsCriticCardPropertiesSchema, SketchbookCardsEraserCardPropertiesSchema, SketchbookCardsSketchpadCardPropertiesSchema, SketchbookCardsStudioVisitCardPropertiesSchema]);

export type SketchbookCardsCardId = "doodle-1" | "doodle-2" | "doodle-3" | "doodle-4" | "doodle-5" | "doodle-6" | "doodle-7" | "doodle-8" | "doodle-9" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-60" | "sketch-1" | "sketch-2" | "sketch-3" | "sketch-4" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-40" | "inkwork-1" | "inkwork-2" | "inkwork-3" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-30" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "smudge-1" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "smudge-10" | "brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7";



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

export type CardProperties = SketchbookCardsCardProperties;

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
  "brainstorm-1": CardStateRecord<"brainstorm-1", "sketchbook-cards", "brainstorm", SketchbookCardsBrainstormCardProperties>;
  "brainstorm-2": CardStateRecord<"brainstorm-2", "sketchbook-cards", "brainstorm", SketchbookCardsBrainstormCardProperties>;
  "brainstorm-3": CardStateRecord<"brainstorm-3", "sketchbook-cards", "brainstorm", SketchbookCardsBrainstormCardProperties>;
  "brainstorm-4": CardStateRecord<"brainstorm-4", "sketchbook-cards", "brainstorm", SketchbookCardsBrainstormCardProperties>;
  "brainstorm-5": CardStateRecord<"brainstorm-5", "sketchbook-cards", "brainstorm", SketchbookCardsBrainstormCardProperties>;
  "brainstorm-6": CardStateRecord<"brainstorm-6", "sketchbook-cards", "brainstorm", SketchbookCardsBrainstormCardProperties>;
  "brainstorm-7": CardStateRecord<"brainstorm-7", "sketchbook-cards", "brainstorm", SketchbookCardsBrainstormCardProperties>;
  "concept-1": CardStateRecord<"concept-1", "sketchbook-cards", "concept", SketchbookCardsConceptCardProperties>;
  "concept-2": CardStateRecord<"concept-2", "sketchbook-cards", "concept", SketchbookCardsConceptCardProperties>;
  "concept-3": CardStateRecord<"concept-3", "sketchbook-cards", "concept", SketchbookCardsConceptCardProperties>;
  "concept-4": CardStateRecord<"concept-4", "sketchbook-cards", "concept", SketchbookCardsConceptCardProperties>;
  "concept-5": CardStateRecord<"concept-5", "sketchbook-cards", "concept", SketchbookCardsConceptCardProperties>;
  "concept-6": CardStateRecord<"concept-6", "sketchbook-cards", "concept", SketchbookCardsConceptCardProperties>;
  "concept-7": CardStateRecord<"concept-7", "sketchbook-cards", "concept", SketchbookCardsConceptCardProperties>;
  "concept-8": CardStateRecord<"concept-8", "sketchbook-cards", "concept", SketchbookCardsConceptCardProperties>;
  "critic-1": CardStateRecord<"critic-1", "sketchbook-cards", "critic", SketchbookCardsCriticCardProperties>;
  "critic-2": CardStateRecord<"critic-2", "sketchbook-cards", "critic", SketchbookCardsCriticCardProperties>;
  "critic-3": CardStateRecord<"critic-3", "sketchbook-cards", "critic", SketchbookCardsCriticCardProperties>;
  "critic-4": CardStateRecord<"critic-4", "sketchbook-cards", "critic", SketchbookCardsCriticCardProperties>;
  "critic-5": CardStateRecord<"critic-5", "sketchbook-cards", "critic", SketchbookCardsCriticCardProperties>;
  "critic-6": CardStateRecord<"critic-6", "sketchbook-cards", "critic", SketchbookCardsCriticCardProperties>;
  "critic-7": CardStateRecord<"critic-7", "sketchbook-cards", "critic", SketchbookCardsCriticCardProperties>;
  "doodle-1": CardStateRecord<"doodle-1", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-10": CardStateRecord<"doodle-10", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-11": CardStateRecord<"doodle-11", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-12": CardStateRecord<"doodle-12", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-13": CardStateRecord<"doodle-13", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-14": CardStateRecord<"doodle-14", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-15": CardStateRecord<"doodle-15", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-16": CardStateRecord<"doodle-16", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-17": CardStateRecord<"doodle-17", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-18": CardStateRecord<"doodle-18", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-19": CardStateRecord<"doodle-19", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-2": CardStateRecord<"doodle-2", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-20": CardStateRecord<"doodle-20", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-21": CardStateRecord<"doodle-21", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-22": CardStateRecord<"doodle-22", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-23": CardStateRecord<"doodle-23", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-24": CardStateRecord<"doodle-24", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-25": CardStateRecord<"doodle-25", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-26": CardStateRecord<"doodle-26", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-27": CardStateRecord<"doodle-27", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-28": CardStateRecord<"doodle-28", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-29": CardStateRecord<"doodle-29", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-3": CardStateRecord<"doodle-3", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-30": CardStateRecord<"doodle-30", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-31": CardStateRecord<"doodle-31", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-32": CardStateRecord<"doodle-32", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-33": CardStateRecord<"doodle-33", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-34": CardStateRecord<"doodle-34", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-35": CardStateRecord<"doodle-35", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-36": CardStateRecord<"doodle-36", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-37": CardStateRecord<"doodle-37", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-38": CardStateRecord<"doodle-38", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-39": CardStateRecord<"doodle-39", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-4": CardStateRecord<"doodle-4", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-40": CardStateRecord<"doodle-40", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-41": CardStateRecord<"doodle-41", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-42": CardStateRecord<"doodle-42", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-43": CardStateRecord<"doodle-43", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-44": CardStateRecord<"doodle-44", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-45": CardStateRecord<"doodle-45", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-46": CardStateRecord<"doodle-46", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-47": CardStateRecord<"doodle-47", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-48": CardStateRecord<"doodle-48", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-49": CardStateRecord<"doodle-49", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-5": CardStateRecord<"doodle-5", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-50": CardStateRecord<"doodle-50", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-51": CardStateRecord<"doodle-51", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-52": CardStateRecord<"doodle-52", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-53": CardStateRecord<"doodle-53", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-54": CardStateRecord<"doodle-54", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-55": CardStateRecord<"doodle-55", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-56": CardStateRecord<"doodle-56", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-57": CardStateRecord<"doodle-57", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-58": CardStateRecord<"doodle-58", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-59": CardStateRecord<"doodle-59", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-6": CardStateRecord<"doodle-6", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-60": CardStateRecord<"doodle-60", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-7": CardStateRecord<"doodle-7", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-8": CardStateRecord<"doodle-8", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "doodle-9": CardStateRecord<"doodle-9", "sketchbook-cards", "doodle", SketchbookCardsDoodleCardProperties>;
  "eraser-1": CardStateRecord<"eraser-1", "sketchbook-cards", "eraser", SketchbookCardsEraserCardProperties>;
  "eraser-2": CardStateRecord<"eraser-2", "sketchbook-cards", "eraser", SketchbookCardsEraserCardProperties>;
  "eraser-3": CardStateRecord<"eraser-3", "sketchbook-cards", "eraser", SketchbookCardsEraserCardProperties>;
  "eraser-4": CardStateRecord<"eraser-4", "sketchbook-cards", "eraser", SketchbookCardsEraserCardProperties>;
  "eraser-5": CardStateRecord<"eraser-5", "sketchbook-cards", "eraser", SketchbookCardsEraserCardProperties>;
  "eraser-6": CardStateRecord<"eraser-6", "sketchbook-cards", "eraser", SketchbookCardsEraserCardProperties>;
  "eraser-7": CardStateRecord<"eraser-7", "sketchbook-cards", "eraser", SketchbookCardsEraserCardProperties>;
  "gallery-1": CardStateRecord<"gallery-1", "sketchbook-cards", "gallery", SketchbookCardsGalleryCardProperties>;
  "gallery-2": CardStateRecord<"gallery-2", "sketchbook-cards", "gallery", SketchbookCardsGalleryCardProperties>;
  "gallery-3": CardStateRecord<"gallery-3", "sketchbook-cards", "gallery", SketchbookCardsGalleryCardProperties>;
  "gallery-4": CardStateRecord<"gallery-4", "sketchbook-cards", "gallery", SketchbookCardsGalleryCardProperties>;
  "gallery-5": CardStateRecord<"gallery-5", "sketchbook-cards", "gallery", SketchbookCardsGalleryCardProperties>;
  "gallery-6": CardStateRecord<"gallery-6", "sketchbook-cards", "gallery", SketchbookCardsGalleryCardProperties>;
  "gallery-7": CardStateRecord<"gallery-7", "sketchbook-cards", "gallery", SketchbookCardsGalleryCardProperties>;
  "idea-1": CardStateRecord<"idea-1", "sketchbook-cards", "idea", SketchbookCardsIdeaCardProperties>;
  "idea-2": CardStateRecord<"idea-2", "sketchbook-cards", "idea", SketchbookCardsIdeaCardProperties>;
  "idea-3": CardStateRecord<"idea-3", "sketchbook-cards", "idea", SketchbookCardsIdeaCardProperties>;
  "idea-4": CardStateRecord<"idea-4", "sketchbook-cards", "idea", SketchbookCardsIdeaCardProperties>;
  "idea-5": CardStateRecord<"idea-5", "sketchbook-cards", "idea", SketchbookCardsIdeaCardProperties>;
  "idea-6": CardStateRecord<"idea-6", "sketchbook-cards", "idea", SketchbookCardsIdeaCardProperties>;
  "idea-7": CardStateRecord<"idea-7", "sketchbook-cards", "idea", SketchbookCardsIdeaCardProperties>;
  "idea-8": CardStateRecord<"idea-8", "sketchbook-cards", "idea", SketchbookCardsIdeaCardProperties>;
  "inkwork-1": CardStateRecord<"inkwork-1", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-10": CardStateRecord<"inkwork-10", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-11": CardStateRecord<"inkwork-11", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-12": CardStateRecord<"inkwork-12", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-13": CardStateRecord<"inkwork-13", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-14": CardStateRecord<"inkwork-14", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-15": CardStateRecord<"inkwork-15", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-16": CardStateRecord<"inkwork-16", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-17": CardStateRecord<"inkwork-17", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-18": CardStateRecord<"inkwork-18", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-19": CardStateRecord<"inkwork-19", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-2": CardStateRecord<"inkwork-2", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-20": CardStateRecord<"inkwork-20", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-21": CardStateRecord<"inkwork-21", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-22": CardStateRecord<"inkwork-22", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-23": CardStateRecord<"inkwork-23", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-24": CardStateRecord<"inkwork-24", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-25": CardStateRecord<"inkwork-25", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-26": CardStateRecord<"inkwork-26", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-27": CardStateRecord<"inkwork-27", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-28": CardStateRecord<"inkwork-28", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-29": CardStateRecord<"inkwork-29", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-3": CardStateRecord<"inkwork-3", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-30": CardStateRecord<"inkwork-30", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-4": CardStateRecord<"inkwork-4", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-5": CardStateRecord<"inkwork-5", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-6": CardStateRecord<"inkwork-6", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-7": CardStateRecord<"inkwork-7", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-8": CardStateRecord<"inkwork-8", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "inkwork-9": CardStateRecord<"inkwork-9", "sketchbook-cards", "inkwork", SketchbookCardsInkworkCardProperties>;
  "masterpiece-1": CardStateRecord<"masterpiece-1", "sketchbook-cards", "masterpiece", SketchbookCardsMasterpieceCardProperties>;
  "masterpiece-2": CardStateRecord<"masterpiece-2", "sketchbook-cards", "masterpiece", SketchbookCardsMasterpieceCardProperties>;
  "masterpiece-3": CardStateRecord<"masterpiece-3", "sketchbook-cards", "masterpiece", SketchbookCardsMasterpieceCardProperties>;
  "masterpiece-4": CardStateRecord<"masterpiece-4", "sketchbook-cards", "masterpiece", SketchbookCardsMasterpieceCardProperties>;
  "masterpiece-5": CardStateRecord<"masterpiece-5", "sketchbook-cards", "masterpiece", SketchbookCardsMasterpieceCardProperties>;
  "masterpiece-6": CardStateRecord<"masterpiece-6", "sketchbook-cards", "masterpiece", SketchbookCardsMasterpieceCardProperties>;
  "masterpiece-7": CardStateRecord<"masterpiece-7", "sketchbook-cards", "masterpiece", SketchbookCardsMasterpieceCardProperties>;
  "masterpiece-8": CardStateRecord<"masterpiece-8", "sketchbook-cards", "masterpiece", SketchbookCardsMasterpieceCardProperties>;
  "open-mic-1": CardStateRecord<"open-mic-1", "sketchbook-cards", "open-mic", SketchbookCardsOpenMicCardProperties>;
  "open-mic-2": CardStateRecord<"open-mic-2", "sketchbook-cards", "open-mic", SketchbookCardsOpenMicCardProperties>;
  "open-mic-3": CardStateRecord<"open-mic-3", "sketchbook-cards", "open-mic", SketchbookCardsOpenMicCardProperties>;
  "open-mic-4": CardStateRecord<"open-mic-4", "sketchbook-cards", "open-mic", SketchbookCardsOpenMicCardProperties>;
  "open-mic-5": CardStateRecord<"open-mic-5", "sketchbook-cards", "open-mic", SketchbookCardsOpenMicCardProperties>;
  "open-mic-6": CardStateRecord<"open-mic-6", "sketchbook-cards", "open-mic", SketchbookCardsOpenMicCardProperties>;
  "open-mic-7": CardStateRecord<"open-mic-7", "sketchbook-cards", "open-mic", SketchbookCardsOpenMicCardProperties>;
  "sketch-1": CardStateRecord<"sketch-1", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-10": CardStateRecord<"sketch-10", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-11": CardStateRecord<"sketch-11", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-12": CardStateRecord<"sketch-12", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-13": CardStateRecord<"sketch-13", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-14": CardStateRecord<"sketch-14", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-15": CardStateRecord<"sketch-15", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-16": CardStateRecord<"sketch-16", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-17": CardStateRecord<"sketch-17", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-18": CardStateRecord<"sketch-18", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-19": CardStateRecord<"sketch-19", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-2": CardStateRecord<"sketch-2", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-20": CardStateRecord<"sketch-20", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-21": CardStateRecord<"sketch-21", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-22": CardStateRecord<"sketch-22", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-23": CardStateRecord<"sketch-23", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-24": CardStateRecord<"sketch-24", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-25": CardStateRecord<"sketch-25", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-26": CardStateRecord<"sketch-26", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-27": CardStateRecord<"sketch-27", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-28": CardStateRecord<"sketch-28", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-29": CardStateRecord<"sketch-29", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-3": CardStateRecord<"sketch-3", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-30": CardStateRecord<"sketch-30", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-31": CardStateRecord<"sketch-31", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-32": CardStateRecord<"sketch-32", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-33": CardStateRecord<"sketch-33", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-34": CardStateRecord<"sketch-34", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-35": CardStateRecord<"sketch-35", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-36": CardStateRecord<"sketch-36", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-37": CardStateRecord<"sketch-37", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-38": CardStateRecord<"sketch-38", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-39": CardStateRecord<"sketch-39", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-4": CardStateRecord<"sketch-4", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-40": CardStateRecord<"sketch-40", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-5": CardStateRecord<"sketch-5", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-6": CardStateRecord<"sketch-6", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-7": CardStateRecord<"sketch-7", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-8": CardStateRecord<"sketch-8", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketch-9": CardStateRecord<"sketch-9", "sketchbook-cards", "sketch", SketchbookCardsSketchCardProperties>;
  "sketchpad-1": CardStateRecord<"sketchpad-1", "sketchbook-cards", "sketchpad", SketchbookCardsSketchpadCardProperties>;
  "sketchpad-2": CardStateRecord<"sketchpad-2", "sketchbook-cards", "sketchpad", SketchbookCardsSketchpadCardProperties>;
  "sketchpad-3": CardStateRecord<"sketchpad-3", "sketchbook-cards", "sketchpad", SketchbookCardsSketchpadCardProperties>;
  "sketchpad-4": CardStateRecord<"sketchpad-4", "sketchbook-cards", "sketchpad", SketchbookCardsSketchpadCardProperties>;
  "sketchpad-5": CardStateRecord<"sketchpad-5", "sketchbook-cards", "sketchpad", SketchbookCardsSketchpadCardProperties>;
  "sketchpad-6": CardStateRecord<"sketchpad-6", "sketchbook-cards", "sketchpad", SketchbookCardsSketchpadCardProperties>;
  "sketchpad-7": CardStateRecord<"sketchpad-7", "sketchbook-cards", "sketchpad", SketchbookCardsSketchpadCardProperties>;
  "smudge-1": CardStateRecord<"smudge-1", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "smudge-10": CardStateRecord<"smudge-10", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "smudge-2": CardStateRecord<"smudge-2", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "smudge-3": CardStateRecord<"smudge-3", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "smudge-4": CardStateRecord<"smudge-4", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "smudge-5": CardStateRecord<"smudge-5", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "smudge-6": CardStateRecord<"smudge-6", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "smudge-7": CardStateRecord<"smudge-7", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "smudge-8": CardStateRecord<"smudge-8", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "smudge-9": CardStateRecord<"smudge-9", "sketchbook-cards", "smudge", SketchbookCardsSmudgeCardProperties>;
  "studio-1": CardStateRecord<"studio-1", "sketchbook-cards", "studio", SketchbookCardsStudioCardProperties>;
  "studio-2": CardStateRecord<"studio-2", "sketchbook-cards", "studio", SketchbookCardsStudioCardProperties>;
  "studio-3": CardStateRecord<"studio-3", "sketchbook-cards", "studio", SketchbookCardsStudioCardProperties>;
  "studio-4": CardStateRecord<"studio-4", "sketchbook-cards", "studio", SketchbookCardsStudioCardProperties>;
  "studio-5": CardStateRecord<"studio-5", "sketchbook-cards", "studio", SketchbookCardsStudioCardProperties>;
  "studio-6": CardStateRecord<"studio-6", "sketchbook-cards", "studio", SketchbookCardsStudioCardProperties>;
  "studio-7": CardStateRecord<"studio-7", "sketchbook-cards", "studio", SketchbookCardsStudioCardProperties>;
  "studio-visit-1": CardStateRecord<"studio-visit-1", "sketchbook-cards", "studio-visit", SketchbookCardsStudioVisitCardProperties>;
  "studio-visit-2": CardStateRecord<"studio-visit-2", "sketchbook-cards", "studio-visit", SketchbookCardsStudioVisitCardProperties>;
  "studio-visit-3": CardStateRecord<"studio-visit-3", "sketchbook-cards", "studio-visit", SketchbookCardsStudioVisitCardProperties>;
  "studio-visit-4": CardStateRecord<"studio-visit-4", "sketchbook-cards", "studio-visit", SketchbookCardsStudioVisitCardProperties>;
  "studio-visit-5": CardStateRecord<"studio-visit-5", "sketchbook-cards", "studio-visit", SketchbookCardsStudioVisitCardProperties>;
  "studio-visit-6": CardStateRecord<"studio-visit-6", "sketchbook-cards", "studio-visit", SketchbookCardsStudioVisitCardProperties>;
  "studio-visit-7": CardStateRecord<"studio-visit-7", "sketchbook-cards", "studio-visit", SketchbookCardsStudioVisitCardProperties>;
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

export type PieceStateById = Record<string, never>;

export type DieStateById = Record<string, never>;
export type CardIdsBySharedZoneId = {
  "supply-brainstorm": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-concept": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-critic": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-doodle": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-eraser": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-gallery": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-idea": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-inkwork": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-masterpiece": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-open-mic": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-sketch": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-sketchpad": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-smudge": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-studio": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "supply-studio-visit": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
  "trash": Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">;
};
export type CardIdsByPlayerZoneId = {
  "deck": PerPlayer<Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">>;
  "discard": PerPlayer<Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">>;
  "hand": PerPlayer<Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">>;
  "in-play": PerPlayer<Array<"brainstorm-1" | "brainstorm-2" | "brainstorm-3" | "brainstorm-4" | "brainstorm-5" | "brainstorm-6" | "brainstorm-7" | "concept-1" | "concept-2" | "concept-3" | "concept-4" | "concept-5" | "concept-6" | "concept-7" | "concept-8" | "critic-1" | "critic-2" | "critic-3" | "critic-4" | "critic-5" | "critic-6" | "critic-7" | "doodle-1" | "doodle-10" | "doodle-11" | "doodle-12" | "doodle-13" | "doodle-14" | "doodle-15" | "doodle-16" | "doodle-17" | "doodle-18" | "doodle-19" | "doodle-2" | "doodle-20" | "doodle-21" | "doodle-22" | "doodle-23" | "doodle-24" | "doodle-25" | "doodle-26" | "doodle-27" | "doodle-28" | "doodle-29" | "doodle-3" | "doodle-30" | "doodle-31" | "doodle-32" | "doodle-33" | "doodle-34" | "doodle-35" | "doodle-36" | "doodle-37" | "doodle-38" | "doodle-39" | "doodle-4" | "doodle-40" | "doodle-41" | "doodle-42" | "doodle-43" | "doodle-44" | "doodle-45" | "doodle-46" | "doodle-47" | "doodle-48" | "doodle-49" | "doodle-5" | "doodle-50" | "doodle-51" | "doodle-52" | "doodle-53" | "doodle-54" | "doodle-55" | "doodle-56" | "doodle-57" | "doodle-58" | "doodle-59" | "doodle-6" | "doodle-60" | "doodle-7" | "doodle-8" | "doodle-9" | "eraser-1" | "eraser-2" | "eraser-3" | "eraser-4" | "eraser-5" | "eraser-6" | "eraser-7" | "gallery-1" | "gallery-2" | "gallery-3" | "gallery-4" | "gallery-5" | "gallery-6" | "gallery-7" | "idea-1" | "idea-2" | "idea-3" | "idea-4" | "idea-5" | "idea-6" | "idea-7" | "idea-8" | "inkwork-1" | "inkwork-10" | "inkwork-11" | "inkwork-12" | "inkwork-13" | "inkwork-14" | "inkwork-15" | "inkwork-16" | "inkwork-17" | "inkwork-18" | "inkwork-19" | "inkwork-2" | "inkwork-20" | "inkwork-21" | "inkwork-22" | "inkwork-23" | "inkwork-24" | "inkwork-25" | "inkwork-26" | "inkwork-27" | "inkwork-28" | "inkwork-29" | "inkwork-3" | "inkwork-30" | "inkwork-4" | "inkwork-5" | "inkwork-6" | "inkwork-7" | "inkwork-8" | "inkwork-9" | "masterpiece-1" | "masterpiece-2" | "masterpiece-3" | "masterpiece-4" | "masterpiece-5" | "masterpiece-6" | "masterpiece-7" | "masterpiece-8" | "open-mic-1" | "open-mic-2" | "open-mic-3" | "open-mic-4" | "open-mic-5" | "open-mic-6" | "open-mic-7" | "sketch-1" | "sketch-10" | "sketch-11" | "sketch-12" | "sketch-13" | "sketch-14" | "sketch-15" | "sketch-16" | "sketch-17" | "sketch-18" | "sketch-19" | "sketch-2" | "sketch-20" | "sketch-21" | "sketch-22" | "sketch-23" | "sketch-24" | "sketch-25" | "sketch-26" | "sketch-27" | "sketch-28" | "sketch-29" | "sketch-3" | "sketch-30" | "sketch-31" | "sketch-32" | "sketch-33" | "sketch-34" | "sketch-35" | "sketch-36" | "sketch-37" | "sketch-38" | "sketch-39" | "sketch-4" | "sketch-40" | "sketch-5" | "sketch-6" | "sketch-7" | "sketch-8" | "sketch-9" | "sketchpad-1" | "sketchpad-2" | "sketchpad-3" | "sketchpad-4" | "sketchpad-5" | "sketchpad-6" | "sketchpad-7" | "smudge-1" | "smudge-10" | "smudge-2" | "smudge-3" | "smudge-4" | "smudge-5" | "smudge-6" | "smudge-7" | "smudge-8" | "smudge-9" | "studio-1" | "studio-2" | "studio-3" | "studio-4" | "studio-5" | "studio-6" | "studio-7" | "studio-visit-1" | "studio-visit-2" | "studio-visit-3" | "studio-visit-4" | "studio-visit-5" | "studio-visit-6" | "studio-visit-7">>;
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

};

export type HexBoardStateById = Record<string, never>;

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

export type BoardStateRecord = never;

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
  "sketchbook-cards:doodle": SketchbookCardsDoodleCardPropertiesSchema,
  "sketchbook-cards:sketch": SketchbookCardsSketchCardPropertiesSchema,
  "sketchbook-cards:inkwork": SketchbookCardsInkworkCardPropertiesSchema,
  "sketchbook-cards:idea": SketchbookCardsIdeaCardPropertiesSchema,
  "sketchbook-cards:concept": SketchbookCardsConceptCardPropertiesSchema,
  "sketchbook-cards:masterpiece": SketchbookCardsMasterpieceCardPropertiesSchema,
  "sketchbook-cards:smudge": SketchbookCardsSmudgeCardPropertiesSchema,
  "sketchbook-cards:brainstorm": SketchbookCardsBrainstormCardPropertiesSchema,
  "sketchbook-cards:studio": SketchbookCardsStudioCardPropertiesSchema,
  "sketchbook-cards:gallery": SketchbookCardsGalleryCardPropertiesSchema,
  "sketchbook-cards:open-mic": SketchbookCardsOpenMicCardPropertiesSchema,
  "sketchbook-cards:critic": SketchbookCardsCriticCardPropertiesSchema,
  "sketchbook-cards:eraser": SketchbookCardsEraserCardPropertiesSchema,
  "sketchbook-cards:sketchpad": SketchbookCardsSketchpadCardPropertiesSchema,
  "sketchbook-cards:studio-visit": SketchbookCardsStudioVisitCardPropertiesSchema,
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
const pieceStateByIdSchema = z.object({});
const dieStateByIdSchema = z.object({});
const boardStateByIdSchema = z.object({});
const hexBoardStateByIdSchema = z.object({});
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
    shared: cloneManifestDefault({"supply-brainstorm":[],"supply-concept":[],"supply-critic":[],"supply-doodle":[],"supply-eraser":[],"supply-gallery":[],"supply-idea":[],"supply-inkwork":[],"supply-masterpiece":[],"supply-open-mic":[],"supply-sketch":[],"supply-sketchpad":[],"supply-smudge":[],"supply-studio":[],"supply-studio-visit":[],"trash":[]}),
    perPlayer: buildPerPlayerCardIds(resolveDefaultPlayerIds(playerIds)),
    visibility: cloneManifestDefault({"deck":"ownerOnly","discard":"public","hand":"ownerOnly","in-play":"public","supply-brainstorm":"public","supply-concept":"public","supply-critic":"public","supply-doodle":"public","supply-eraser":"public","supply-gallery":"public","supply-idea":"public","supply-inkwork":"public","supply-masterpiece":"public","supply-open-mic":"public","supply-sketch":"public","supply-sketchpad":"public","supply-smudge":"public","supply-studio":"public","supply-studio-visit":"public","trash":"public"}),
    cardSetIdsByZoneId: cloneManifestDefault({"deck":["sketchbook-cards"],"discard":["sketchbook-cards"],"hand":["sketchbook-cards"],"in-play":["sketchbook-cards"],"supply-brainstorm":["sketchbook-cards"],"supply-concept":["sketchbook-cards"],"supply-critic":["sketchbook-cards"],"supply-doodle":["sketchbook-cards"],"supply-eraser":["sketchbook-cards"],"supply-gallery":["sketchbook-cards"],"supply-idea":["sketchbook-cards"],"supply-inkwork":["sketchbook-cards"],"supply-masterpiece":["sketchbook-cards"],"supply-open-mic":["sketchbook-cards"],"supply-sketch":["sketchbook-cards"],"supply-sketchpad":["sketchbook-cards"],"supply-smudge":["sketchbook-cards"],"supply-studio":["sketchbook-cards"],"supply-studio-visit":["sketchbook-cards"],"trash":["sketchbook-cards"]}),
  }) as TableState["zones"],
  decks: () => cloneManifestDefault({"supply-brainstorm":[],"supply-concept":[],"supply-critic":[],"supply-doodle":[],"supply-eraser":[],"supply-gallery":[],"supply-idea":[],"supply-inkwork":[],"supply-masterpiece":[],"supply-open-mic":[],"supply-sketch":[],"supply-sketchpad":[],"supply-smudge":[],"supply-studio":[],"supply-studio-visit":[],"trash":[]}) as TableState["decks"],
  hands: (playerIds?: readonly string[]) =>
    buildPerPlayerCardIds(resolveDefaultPlayerIds(playerIds)) as TableState["hands"],
  handVisibility: () => cloneManifestDefault({"deck":"ownerOnly","discard":"public","hand":"ownerOnly","in-play":"public"}) as TableState["handVisibility"],
  ownerOfCard: () => cloneManifestDefault({"brainstorm-1":null,"brainstorm-2":null,"brainstorm-3":null,"brainstorm-4":null,"brainstorm-5":null,"brainstorm-6":null,"brainstorm-7":null,"concept-1":null,"concept-2":null,"concept-3":null,"concept-4":null,"concept-5":null,"concept-6":null,"concept-7":null,"concept-8":null,"critic-1":null,"critic-2":null,"critic-3":null,"critic-4":null,"critic-5":null,"critic-6":null,"critic-7":null,"doodle-1":null,"doodle-10":null,"doodle-11":null,"doodle-12":null,"doodle-13":null,"doodle-14":null,"doodle-15":null,"doodle-16":null,"doodle-17":null,"doodle-18":null,"doodle-19":null,"doodle-2":null,"doodle-20":null,"doodle-21":null,"doodle-22":null,"doodle-23":null,"doodle-24":null,"doodle-25":null,"doodle-26":null,"doodle-27":null,"doodle-28":null,"doodle-29":null,"doodle-3":null,"doodle-30":null,"doodle-31":null,"doodle-32":null,"doodle-33":null,"doodle-34":null,"doodle-35":null,"doodle-36":null,"doodle-37":null,"doodle-38":null,"doodle-39":null,"doodle-4":null,"doodle-40":null,"doodle-41":null,"doodle-42":null,"doodle-43":null,"doodle-44":null,"doodle-45":null,"doodle-46":null,"doodle-47":null,"doodle-48":null,"doodle-49":null,"doodle-5":null,"doodle-50":null,"doodle-51":null,"doodle-52":null,"doodle-53":null,"doodle-54":null,"doodle-55":null,"doodle-56":null,"doodle-57":null,"doodle-58":null,"doodle-59":null,"doodle-6":null,"doodle-60":null,"doodle-7":null,"doodle-8":null,"doodle-9":null,"eraser-1":null,"eraser-2":null,"eraser-3":null,"eraser-4":null,"eraser-5":null,"eraser-6":null,"eraser-7":null,"gallery-1":null,"gallery-2":null,"gallery-3":null,"gallery-4":null,"gallery-5":null,"gallery-6":null,"gallery-7":null,"idea-1":null,"idea-2":null,"idea-3":null,"idea-4":null,"idea-5":null,"idea-6":null,"idea-7":null,"idea-8":null,"inkwork-1":null,"inkwork-10":null,"inkwork-11":null,"inkwork-12":null,"inkwork-13":null,"inkwork-14":null,"inkwork-15":null,"inkwork-16":null,"inkwork-17":null,"inkwork-18":null,"inkwork-19":null,"inkwork-2":null,"inkwork-20":null,"inkwork-21":null,"inkwork-22":null,"inkwork-23":null,"inkwork-24":null,"inkwork-25":null,"inkwork-26":null,"inkwork-27":null,"inkwork-28":null,"inkwork-29":null,"inkwork-3":null,"inkwork-30":null,"inkwork-4":null,"inkwork-5":null,"inkwork-6":null,"inkwork-7":null,"inkwork-8":null,"inkwork-9":null,"masterpiece-1":null,"masterpiece-2":null,"masterpiece-3":null,"masterpiece-4":null,"masterpiece-5":null,"masterpiece-6":null,"masterpiece-7":null,"masterpiece-8":null,"open-mic-1":null,"open-mic-2":null,"open-mic-3":null,"open-mic-4":null,"open-mic-5":null,"open-mic-6":null,"open-mic-7":null,"sketch-1":null,"sketch-10":null,"sketch-11":null,"sketch-12":null,"sketch-13":null,"sketch-14":null,"sketch-15":null,"sketch-16":null,"sketch-17":null,"sketch-18":null,"sketch-19":null,"sketch-2":null,"sketch-20":null,"sketch-21":null,"sketch-22":null,"sketch-23":null,"sketch-24":null,"sketch-25":null,"sketch-26":null,"sketch-27":null,"sketch-28":null,"sketch-29":null,"sketch-3":null,"sketch-30":null,"sketch-31":null,"sketch-32":null,"sketch-33":null,"sketch-34":null,"sketch-35":null,"sketch-36":null,"sketch-37":null,"sketch-38":null,"sketch-39":null,"sketch-4":null,"sketch-40":null,"sketch-5":null,"sketch-6":null,"sketch-7":null,"sketch-8":null,"sketch-9":null,"sketchpad-1":null,"sketchpad-2":null,"sketchpad-3":null,"sketchpad-4":null,"sketchpad-5":null,"sketchpad-6":null,"sketchpad-7":null,"smudge-1":null,"smudge-10":null,"smudge-2":null,"smudge-3":null,"smudge-4":null,"smudge-5":null,"smudge-6":null,"smudge-7":null,"smudge-8":null,"smudge-9":null,"studio-1":null,"studio-2":null,"studio-3":null,"studio-4":null,"studio-5":null,"studio-6":null,"studio-7":null,"studio-visit-1":null,"studio-visit-2":null,"studio-visit-3":null,"studio-visit-4":null,"studio-visit-5":null,"studio-visit-6":null,"studio-visit-7":null}) as TableState["ownerOfCard"],
  visibility: () => cloneManifestDefault({"brainstorm-1":{"faceUp":true},"brainstorm-2":{"faceUp":true},"brainstorm-3":{"faceUp":true},"brainstorm-4":{"faceUp":true},"brainstorm-5":{"faceUp":true},"brainstorm-6":{"faceUp":true},"brainstorm-7":{"faceUp":true},"concept-1":{"faceUp":true},"concept-2":{"faceUp":true},"concept-3":{"faceUp":true},"concept-4":{"faceUp":true},"concept-5":{"faceUp":true},"concept-6":{"faceUp":true},"concept-7":{"faceUp":true},"concept-8":{"faceUp":true},"critic-1":{"faceUp":true},"critic-2":{"faceUp":true},"critic-3":{"faceUp":true},"critic-4":{"faceUp":true},"critic-5":{"faceUp":true},"critic-6":{"faceUp":true},"critic-7":{"faceUp":true},"doodle-1":{"faceUp":true},"doodle-10":{"faceUp":true},"doodle-11":{"faceUp":true},"doodle-12":{"faceUp":true},"doodle-13":{"faceUp":true},"doodle-14":{"faceUp":true},"doodle-15":{"faceUp":true},"doodle-16":{"faceUp":true},"doodle-17":{"faceUp":true},"doodle-18":{"faceUp":true},"doodle-19":{"faceUp":true},"doodle-2":{"faceUp":true},"doodle-20":{"faceUp":true},"doodle-21":{"faceUp":true},"doodle-22":{"faceUp":true},"doodle-23":{"faceUp":true},"doodle-24":{"faceUp":true},"doodle-25":{"faceUp":true},"doodle-26":{"faceUp":true},"doodle-27":{"faceUp":true},"doodle-28":{"faceUp":true},"doodle-29":{"faceUp":true},"doodle-3":{"faceUp":true},"doodle-30":{"faceUp":true},"doodle-31":{"faceUp":true},"doodle-32":{"faceUp":true},"doodle-33":{"faceUp":true},"doodle-34":{"faceUp":true},"doodle-35":{"faceUp":true},"doodle-36":{"faceUp":true},"doodle-37":{"faceUp":true},"doodle-38":{"faceUp":true},"doodle-39":{"faceUp":true},"doodle-4":{"faceUp":true},"doodle-40":{"faceUp":true},"doodle-41":{"faceUp":true},"doodle-42":{"faceUp":true},"doodle-43":{"faceUp":true},"doodle-44":{"faceUp":true},"doodle-45":{"faceUp":true},"doodle-46":{"faceUp":true},"doodle-47":{"faceUp":true},"doodle-48":{"faceUp":true},"doodle-49":{"faceUp":true},"doodle-5":{"faceUp":true},"doodle-50":{"faceUp":true},"doodle-51":{"faceUp":true},"doodle-52":{"faceUp":true},"doodle-53":{"faceUp":true},"doodle-54":{"faceUp":true},"doodle-55":{"faceUp":true},"doodle-56":{"faceUp":true},"doodle-57":{"faceUp":true},"doodle-58":{"faceUp":true},"doodle-59":{"faceUp":true},"doodle-6":{"faceUp":true},"doodle-60":{"faceUp":true},"doodle-7":{"faceUp":true},"doodle-8":{"faceUp":true},"doodle-9":{"faceUp":true},"eraser-1":{"faceUp":true},"eraser-2":{"faceUp":true},"eraser-3":{"faceUp":true},"eraser-4":{"faceUp":true},"eraser-5":{"faceUp":true},"eraser-6":{"faceUp":true},"eraser-7":{"faceUp":true},"gallery-1":{"faceUp":true},"gallery-2":{"faceUp":true},"gallery-3":{"faceUp":true},"gallery-4":{"faceUp":true},"gallery-5":{"faceUp":true},"gallery-6":{"faceUp":true},"gallery-7":{"faceUp":true},"idea-1":{"faceUp":true},"idea-2":{"faceUp":true},"idea-3":{"faceUp":true},"idea-4":{"faceUp":true},"idea-5":{"faceUp":true},"idea-6":{"faceUp":true},"idea-7":{"faceUp":true},"idea-8":{"faceUp":true},"inkwork-1":{"faceUp":true},"inkwork-10":{"faceUp":true},"inkwork-11":{"faceUp":true},"inkwork-12":{"faceUp":true},"inkwork-13":{"faceUp":true},"inkwork-14":{"faceUp":true},"inkwork-15":{"faceUp":true},"inkwork-16":{"faceUp":true},"inkwork-17":{"faceUp":true},"inkwork-18":{"faceUp":true},"inkwork-19":{"faceUp":true},"inkwork-2":{"faceUp":true},"inkwork-20":{"faceUp":true},"inkwork-21":{"faceUp":true},"inkwork-22":{"faceUp":true},"inkwork-23":{"faceUp":true},"inkwork-24":{"faceUp":true},"inkwork-25":{"faceUp":true},"inkwork-26":{"faceUp":true},"inkwork-27":{"faceUp":true},"inkwork-28":{"faceUp":true},"inkwork-29":{"faceUp":true},"inkwork-3":{"faceUp":true},"inkwork-30":{"faceUp":true},"inkwork-4":{"faceUp":true},"inkwork-5":{"faceUp":true},"inkwork-6":{"faceUp":true},"inkwork-7":{"faceUp":true},"inkwork-8":{"faceUp":true},"inkwork-9":{"faceUp":true},"masterpiece-1":{"faceUp":true},"masterpiece-2":{"faceUp":true},"masterpiece-3":{"faceUp":true},"masterpiece-4":{"faceUp":true},"masterpiece-5":{"faceUp":true},"masterpiece-6":{"faceUp":true},"masterpiece-7":{"faceUp":true},"masterpiece-8":{"faceUp":true},"open-mic-1":{"faceUp":true},"open-mic-2":{"faceUp":true},"open-mic-3":{"faceUp":true},"open-mic-4":{"faceUp":true},"open-mic-5":{"faceUp":true},"open-mic-6":{"faceUp":true},"open-mic-7":{"faceUp":true},"sketch-1":{"faceUp":true},"sketch-10":{"faceUp":true},"sketch-11":{"faceUp":true},"sketch-12":{"faceUp":true},"sketch-13":{"faceUp":true},"sketch-14":{"faceUp":true},"sketch-15":{"faceUp":true},"sketch-16":{"faceUp":true},"sketch-17":{"faceUp":true},"sketch-18":{"faceUp":true},"sketch-19":{"faceUp":true},"sketch-2":{"faceUp":true},"sketch-20":{"faceUp":true},"sketch-21":{"faceUp":true},"sketch-22":{"faceUp":true},"sketch-23":{"faceUp":true},"sketch-24":{"faceUp":true},"sketch-25":{"faceUp":true},"sketch-26":{"faceUp":true},"sketch-27":{"faceUp":true},"sketch-28":{"faceUp":true},"sketch-29":{"faceUp":true},"sketch-3":{"faceUp":true},"sketch-30":{"faceUp":true},"sketch-31":{"faceUp":true},"sketch-32":{"faceUp":true},"sketch-33":{"faceUp":true},"sketch-34":{"faceUp":true},"sketch-35":{"faceUp":true},"sketch-36":{"faceUp":true},"sketch-37":{"faceUp":true},"sketch-38":{"faceUp":true},"sketch-39":{"faceUp":true},"sketch-4":{"faceUp":true},"sketch-40":{"faceUp":true},"sketch-5":{"faceUp":true},"sketch-6":{"faceUp":true},"sketch-7":{"faceUp":true},"sketch-8":{"faceUp":true},"sketch-9":{"faceUp":true},"sketchpad-1":{"faceUp":true},"sketchpad-2":{"faceUp":true},"sketchpad-3":{"faceUp":true},"sketchpad-4":{"faceUp":true},"sketchpad-5":{"faceUp":true},"sketchpad-6":{"faceUp":true},"sketchpad-7":{"faceUp":true},"smudge-1":{"faceUp":true},"smudge-10":{"faceUp":true},"smudge-2":{"faceUp":true},"smudge-3":{"faceUp":true},"smudge-4":{"faceUp":true},"smudge-5":{"faceUp":true},"smudge-6":{"faceUp":true},"smudge-7":{"faceUp":true},"smudge-8":{"faceUp":true},"smudge-9":{"faceUp":true},"studio-1":{"faceUp":true},"studio-2":{"faceUp":true},"studio-3":{"faceUp":true},"studio-4":{"faceUp":true},"studio-5":{"faceUp":true},"studio-6":{"faceUp":true},"studio-7":{"faceUp":true},"studio-visit-1":{"faceUp":true},"studio-visit-2":{"faceUp":true},"studio-visit-3":{"faceUp":true},"studio-visit-4":{"faceUp":true},"studio-visit-5":{"faceUp":true},"studio-visit-6":{"faceUp":true},"studio-visit-7":{"faceUp":true}}) as TableState["visibility"],
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

} as const;
const boardBaseIdsByLayoutLookup = {

} as const;
const boardIdsByBaseIdLookup = {

} as const;
const boardBaseIdsByTemplateIdLookup = {

} as const;
const boardLayoutByIdLookup = {

} as const;
const boardTemplateLayoutByIdLookup = {

} as const;
const boardIdsByTypeIdLookup = {

} as const;
const spaceIdsByBoardIdLookup = {

} as const;
const spaceTypeIdByBoardIdLookup = {} as const;
const spaceIdsByTypeIdLookup = {

} as const;
const containerIdsByBoardIdLookup = {

} as const;
const containerHostByBoardIdLookup = {} as const;
const relationTypeIdsByBoardIdLookup = {

} as const;
const edgeIdsByTypeIdLookup = {

} as const;
const edgeIdsByBoardIdAndTypeIdLookup = {} as const;
const vertexIdsByTypeIdLookup = {

} as const;
const vertexIdsByBoardIdAndTypeIdLookup = {} as const;
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
