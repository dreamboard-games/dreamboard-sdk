import type { RuntimeJson } from "../runtime-json";
// Public SDK contract DTOs extracted from Dreamboard's public API schema.
// This package owns these types for SDK consumers; backend API clients are published separately.

/**
 * Supported player-count metadata for the game
 */
export type PlayersDefinition = {
  minPlayers: number;
  maxPlayers: number;
  optimalPlayers?: number;
};

export type PresetCardSetDefinition = {
  /**
   * Unique local identifier for the authored card set
   */
  id: string;
  /**
   * Built-in preset card-set selector
   */
  presetId: string;
  /**
   * Display name of the card set
   */
  name: string;
  /**
   * Type of card set source
   */
  type: "preset";
  /**
   * Default initial home for cards materialized from the preset.
   */
  defaultHome: ComponentHomeSpec;
};

/**
 * Arbitrary authored JSON value.
 */
export type JsonValue = RuntimeJson;

export type PropertySchema = {
  /**
   * The data type of the property.
   */
  type:
    | "string"
    | "integer"
    | "number"
    | "boolean"
    | "zoneId"
    | "cardId"
    | "playerId"
    | "boardId"
    | "edgeId"
    | "vertexId"
    | "spaceId"
    | "pieceId"
    | "dieId"
    | "resourceId"
    | "array"
    | "object"
    | "record"
    | "enum";
  /**
   * Optional description of the property's purpose and usage.
   */
  description?: string;
  /**
   * Whether an object property may be omitted.
   */
  optional?: boolean;
  /**
   * Whether the value may be null.
   */
  nullable?: boolean;
  /**
   * Optional authored default value for this property. When present, omitted
   * seed values materialize to the default and generated TypeScript treats
   * the property as present even if `optional: true` is also set.
   *
   */
  default?: JsonValue;
  /**
   * For array types, the schema of the array items. Required if type is 'array'.
   */
  items?: PropertySchema;
  /**
   * For object types, the schema of the object's properties. Required if type is 'object'.
   */
  properties?: {
    [key: string]: PropertySchema;
  };
  /**
   * For enum types, the list of allowed string values. Required if type is 'enum'.
   */
  enums?: Array<string>;
  /**
   * For record types, the schema of the record's values. Required if type is 'record'.
   */
  values?: PropertySchema;
};

export type ObjectSchema = {
  /**
   * Map of property names to their schemas. Type is always 'object' and all properties are required.
   */
  properties: {
    [key: string]: PropertySchema;
  };
};

export type CardPropertySchemaVariants = {
  /**
   * Property schemas present on every card-type variant.
   */
  shared?: {
    [key: string]: PropertySchema;
  };
  /**
   * Property schema for each card type in this manual card set.
   */
  variants: {
    [key: string]: ObjectSchema;
  };
};

export type CardPropertySchema = ObjectSchema | CardPropertySchemaVariants;

export type DetachedHomeSpec = {
  type: "detached";
};

export type ZoneHomeSpec = {
  type: "zone";
  zoneId: string;
};

export type SpaceHomeSpec = {
  type: "space";
  boardId: string;
  spaceId: string;
};

export type ContainerHomeSpec = {
  type: "container";
  boardId: string;
  containerId: string;
};

/**
 * Tiled board edge identified by the spaces that border it
 */
export type BoardEdgeRef = {
  spaces: Array<string>;
};

export type EdgeHomeSpec = {
  type: "edge";
  boardId: string;
  ref: BoardEdgeRef;
};

/**
 * Tiled board vertex identified by the spaces that touch it
 */
export type BoardVertexRef = {
  spaces: Array<string>;
};

export type VertexHomeSpec = {
  type: "vertex";
  boardId: string;
  ref: BoardVertexRef;
};

export type PieceSlotHostRef = {
  kind: "piece";
  id: string;
};

export type DieSlotHostRef = {
  kind: "die";
  id: string;
};

export type SlotHostRef =
  | ({
      kind: "piece";
    } & PieceSlotHostRef)
  | ({
      kind: "die";
    } & DieSlotHostRef);

export type SlotHomeSpec = {
  type: "slot";
  host: SlotHostRef;
  slotId: string;
};

export type ComponentHomeSpec =
  | ({
      type: "detached";
    } & DetachedHomeSpec)
  | ({
      type: "zone";
    } & ZoneHomeSpec)
  | ({
      type: "space";
    } & SpaceHomeSpec)
  | ({
      type: "container";
    } & ContainerHomeSpec)
  | ({
      type: "edge";
    } & EdgeHomeSpec)
  | ({
      type: "vertex";
    } & VertexHomeSpec)
  | ({
      type: "slot";
    } & SlotHomeSpec);

/**
 * Default authored visibility for a component instance
 */
export type ComponentVisibilitySpec = {
  faceUp?: boolean;
  /**
   * When omitted, visible to all players
   */
  visibleTo?: Array<string>;
};

export type BoardCard = {
  /**
   * Card type identifier used to generate runtime CardIds. When count > 1, runtime IDs are generated as '{type}-1', '{type}-2', etc.
   */
  type: string;
  /**
   * Display name of the card
   */
  name: string;
  /**
   * URL to the card's image
   */
  imageUrl?: string;
  /**
   * Text content on the card
   */
  text?: string;
  /**
   * Number of copies of this card
   */
  count: number;
  /**
   * Optional authored card category or subtype identifier
   */
  cardType?: string;
  /**
   * Optional per-card initial home. Omitted cards use their manual card set's
   * defaultHome. Compatibility declarations such as allowedCardSetIds never
   * imply placement. Player-scoped distribution belongs in reducer setup.
   */
  home?: ComponentHomeSpec;
  /**
   * Default authored visibility for the card inventory
   */
  visibility?: ComponentVisibilitySpec;
  /**
   * Actual property values for this specific card instance. Keys must match the properties defined in the referenced cardSchema.
   */
  properties: {
    [key: string]: JsonValue;
  };
};

export type ManualCardSetDefinition = {
  /**
   * Unique identifier for the card set
   */
  id: string;
  /**
   * Display name of the card set
   */
  name: string;
  /**
   * Type of card set source
   */
  type: "manual";
  /**
   * Schema definition for authored card properties in this card set
   */
  cardSchema: CardPropertySchema;
  /**
   * Default initial home for cards that do not declare a per-card home.
   */
  defaultHome: ComponentHomeSpec;
  /**
   * List of authored cards in this card set
   */
  cards: Array<BoardCard>;
};

export type CardSetDefinition =
  | ({
      type: "preset";
    } & PresetCardSetDefinition)
  | ({
      type: "manual";
    } & ManualCardSetDefinition);

/**
 * Whether authored topology exists once for the table or once per player
 */
export type TopologyScope = "shared" | "perPlayer";

/**
 * Default topology visibility for a zone or slot
 */
export type ZoneVisibility = "ownerOnly" | "public" | "hidden";

/**
 * Generic authored container that can hold cards, pieces, or dice
 */
export type ZoneSpec = {
  /**
   * Stable zone identifier
   */
  id: string;
  /**
   * Display name for the zone
   */
  name: string;
  scope: TopologyScope;
  /**
   * Optional card-set restriction for this zone
   */
  allowedCardSetIds?: Array<string>;
  visibility?: ZoneVisibility;
};

/**
 * Stable authored board space or slot anchor
 */
export type BoardSpaceSpec = {
  /**
   * Stable space identifier local to the board
   */
  id: string;
  /**
   * Human-readable space name
   */
  name?: string;
  /**
   * Optional authored space type identifier
   */
  typeId?: string;
  /**
   * Typed authored fields validated against the board's spaceFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * Named relation between two authored spaces
 */
export type BoardRelationSpec = {
  /**
   * Optional stable relation identifier
   */
  id?: string;
  /**
   * Relation type identifier such as adjacent, covers, blocks, or linked
   */
  typeId: string;
  fromSpaceId: string;
  toSpaceId: string;
  directed?: boolean;
  /**
   * Typed authored relation fields validated against relationFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

export type BoardHostSpec = {
  type: "board";
};

export type SpaceHostSpec = {
  type: "space";
  spaceId: string;
};

export type BoardContainerHostSpec =
  | ({
      type: "board";
    } & BoardHostSpec)
  | ({
      type: "space";
    } & SpaceHostSpec);

/**
 * Authored board-attached or space-attached container/slot
 */
export type BoardContainerSpec = {
  /**
   * Stable container identifier local to the board
   */
  id: string;
  /**
   * Display name for the container
   */
  name: string;
  host: BoardContainerHostSpec;
  allowedCardSetIds?: Array<string>;
  /**
   * Typed authored container fields validated against containerFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * Visual orientation for authored hex coordinates
 */
export type HexOrientation = "pointy" | "flat";
export type HexCoordinate = { q: number; r: number };
export type HexShape =
  | { kind: "hexagon" | "spiral"; radius: number; center?: HexCoordinate }
  | { kind: "ring"; radius: number; center?: HexCoordinate }
  | { kind: "rectangle"; width: number; height: number; start?: HexCoordinate }
  | { kind: "coordinates"; coordinates: readonly HexCoordinate[] };
export type HexSpaceOverride = Omit<HexSpaceSpec, "id" | "q" | "r"> & {
  id?: string;
};

/**
 * One authored hex space in axial coordinates
 */
export type HexSpaceSpec = {
  /**
   * Stable space identifier local to the board
   */
  id: string;
  /**
   * Axial q coordinate
   */
  q: number;
  /**
   * Axial r coordinate
   */
  r: number;
  /**
   * Optional authored space type identifier
   */
  typeId?: string;
  /**
   * Optional hex-space label for setup or rendering
   */
  label?: string;
  /**
   * Typed authored fields validated against the board's spaceFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * Hex edge identified by two adjacent hex spaces
 */
export type HexEdgeRef =
  | { spaces: [string, string] }
  | { space: string; side: 0 | 1 | 2 | 3 | 4 | 5 };

/**
 * Authored metadata attached to one derived hex edge
 */
export type HexEdgeSpec = {
  ref: HexEdgeRef;
  /**
   * Optional authored edge type identifier
   */
  typeId?: string;
  /**
   * Optional edge label for setup or rendering
   */
  label?: string;
  tags?: Array<string>;
  /**
   * Typed authored edge fields validated against edgeFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * Hex vertex identified by three touching hex spaces
 */
export type HexVertexRef =
  | { spaces: [string, string, string] }
  | { space: string; corner: 0 | 1 | 2 | 3 | 4 | 5 };

/**
 * Authored metadata attached to one derived hex vertex
 */
export type HexVertexSpec = {
  ref: HexVertexRef;
  /**
   * Optional authored vertex type identifier
   */
  typeId?: string;
  /**
   * Optional vertex label for setup or rendering
   */
  label?: string;
  tags?: Array<string>;
  /**
   * Typed authored vertex fields validated against vertexFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * One authored square space in row/column coordinates
 */
export type SquareSpaceSpec = {
  /**
   * Stable space identifier local to the board
   */
  id: string;
  /**
   * Zero-based row coordinate
   */
  row: number;
  /**
   * Zero-based column coordinate
   */
  col: number;
  /**
   * Optional authored space type identifier
   */
  typeId?: string;
  /**
   * Optional square-space label for setup or rendering
   */
  label?: string;
  /**
   * Typed authored fields validated against the board's spaceFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * Authored metadata attached to one derived square edge
 */
export type SquareEdgeSpec = {
  ref: BoardEdgeRef;
  /**
   * Optional authored edge type identifier
   */
  typeId?: string;
  /**
   * Optional edge label for setup or rendering
   */
  label?: string;
  tags?: Array<string>;
  /**
   * Typed authored edge fields validated against edgeFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * Authored metadata attached to one derived square vertex
 */
export type SquareVertexSpec = {
  ref: BoardVertexRef;
  /**
   * Optional authored vertex type identifier
   */
  typeId?: string;
  /**
   * Optional vertex label for setup or rendering
   */
  label?: string;
  tags?: Array<string>;
  /**
   * Typed authored vertex fields validated against vertexFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * Shared or per-player authored board instance shell
 */
export type GenericBoardSpec = {
  /**
   * Stable board identifier
   */
  id: string;
  name: string;
  layout: "generic";
  /**
   * Optional authored board type identifier such as track, map, tableau, or grid
   */
  typeId?: string;
  scope: TopologyScope;
  boardFieldsSchema?: ObjectSchema;
  spaceFieldsSchema?: ObjectSchema;
  relationFieldsSchema?: ObjectSchema;
  containerFieldsSchema?: ObjectSchema;
  /**
   * Typed authored board fields validated against boardFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
  spaces?: Array<BoardSpaceSpec>;
  relations?: Array<BoardRelationSpec>;
  containers?: Array<BoardContainerSpec>;
};

/**
 * Shared or per-player authored hex board instance shell
 */
export type HexBoardSpec = {
  /**
   * Stable board identifier
   */
  id: string;
  name: string;
  layout: "hex";
  /**
   * Optional authored board type identifier
   */
  typeId?: string;
  scope: TopologyScope;
  /**
   * Shape used to generate spaces before exclusions and coordinate overrides
   */
  shape: HexShape;
  exclude?: Array<HexCoordinate>;
  orientation?: HexOrientation;
  boardFieldsSchema?: ObjectSchema;
  spaceFieldsSchema?: ObjectSchema;
  edgeFieldsSchema?: ObjectSchema;
  vertexFieldsSchema?: ObjectSchema;
  /**
   * Typed authored board fields validated against boardFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
  spaces?: { [coordinate: `${number},${number}`]: HexSpaceOverride };
  edges?: Array<HexEdgeSpec>;
  vertices?: Array<HexVertexSpec>;
};

/**
 * Shared or per-player authored square board instance shell
 */
export type SquareBoardSpec = {
  /**
   * Stable board identifier
   */
  id: string;
  name: string;
  layout: "square";
  /**
   * Optional authored board type identifier
   */
  typeId?: string;
  scope: TopologyScope;
  boardFieldsSchema?: ObjectSchema;
  spaceFieldsSchema?: ObjectSchema;
  relationFieldsSchema?: ObjectSchema;
  containerFieldsSchema?: ObjectSchema;
  edgeFieldsSchema?: ObjectSchema;
  vertexFieldsSchema?: ObjectSchema;
  /**
   * Typed authored board fields validated against boardFieldsSchema
   */
  fields?: {
    [key: string]: JsonValue;
  };
  spaces?: Array<SquareSpaceSpec>;
  relations?: Array<BoardRelationSpec>;
  containers?: Array<BoardContainerSpec>;
  edges?: Array<SquareEdgeSpec>;
  vertices?: Array<SquareVertexSpec>;
};

export type BoardSpec =
  | ({
      layout: "generic";
    } & GenericBoardSpec)
  | ({
      layout: "hex";
    } & HexBoardSpec)
  | ({
      layout: "square";
    } & SquareBoardSpec);

/**
 * Named authored slot exposed by a piece or die type
 */
export type ComponentSlotSpec = {
  id: string;
  name?: string;
};

/**
 * Reusable authored piece type
 */
export type PieceTypeSpec = {
  id: string;
  name: string;
  fieldsSchema?: ObjectSchema;
  slots?: Array<ComponentSlotSpec>;
};

/**
 * Authored seeded piece inventory or supply definition
 */
export type PieceSeedSpec = {
  /**
   * Stable piece id seed. When count > 1, runtime ids are generated as '{id}-1', '{id}-2', etc.
   */
  id?: string;
  name?: string;
  typeId: string;
  count?: number;
  ownerId?: string;
  home?: ComponentHomeSpec;
  visibility?: ComponentVisibilitySpec;
  /**
   * Typed authored piece fields validated against the piece type schema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * Reusable authored die type
 */
export type DieTypeSpec = {
  id: string;
  name: string;
  sides?: number;
  fieldsSchema?: ObjectSchema;
  slots?: Array<ComponentSlotSpec>;
};

/**
 * Authored seeded die inventory or supply definition
 */
export type DieSeedSpec = {
  /**
   * Stable die id seed. When count > 1, runtime ids are generated as '{id}-1', '{id}-2', etc.
   */
  id?: string;
  name?: string;
  typeId: string;
  count?: number;
  ownerId?: string;
  home?: ComponentHomeSpec;
  visibility?: ComponentVisibilitySpec;
  /**
   * Typed authored die fields validated against the die type schema
   */
  fields?: {
    [key: string]: JsonValue;
  };
};

/**
 * Definition of a game resource type
 */
export type ResourceDefinition = {
  /**
   * Unique identifier for the resource. Used as a typed ResourceId.
   */
  id: string;
  /**
   * Human-readable display name for the resource
   */
  name: string;
  /**
   * Optional compact icon or emoji rendered by generic UI resource controls.
   */
  icon?: string;
};

/**
 * One authored setup option choice
 */
/**
 * Authoritative topology manifest for reducer-native games
 */
export type GameTopologyManifest = {
  players: PlayersDefinition;
  /**
   * Authored card catalogs and schemas
   */
  cardSets: Array<CardSetDefinition>;
  /**
   * Shared and per-player authored containers
   */
  zones?: Array<ZoneSpec>;
  /**
   * Shared and per-player authored board shells
   */
  boards?: Array<BoardSpec>;
  pieceTypes?: Array<PieceTypeSpec>;
  pieceSeeds?: Array<PieceSeedSpec>;
  dieTypes?: Array<DieTypeSpec>;
  dieSeeds?: Array<DieSeedSpec>;
  resources?: Array<ResourceDefinition>;
};

/**
 * Authenticated user acting in a session.
 */
export type SessionActorAuthUser = {
  kind: "AUTH_USER";
  /**
   * Internal user id
   */
  id: string;
};

/**
 * Anonymous demo principal for one demo_sessions row (shared across tabs).
 */
export type SessionActorDemoGuest = {
  kind: "DEMO_GUEST";
  /**
   * demo_sessions.id
   */
  demoActorSessionId: string;
};

export type SessionActor =
  | ({
      kind: "AUTH_USER";
    } & SessionActorAuthUser)
  | ({
      kind: "DEMO_GUEST";
    } & SessionActorDemoGuest);

export type SessionGameSourceUserCompiled = {
  kind: "USER_COMPILED";
  ownerUserId: string;
  gameId: string;
  compiledResultId: string;
};

export type SessionGameSourceDemoRevision = {
  kind: "DEMO_REVISION";
  slug: string;
  revisionId: string;
};

export type SessionGameSource =
  | ({
      kind: "USER_COMPILED";
    } & SessionGameSourceUserCompiled)
  | ({
      kind: "DEMO_REVISION";
    } & SessionGameSourceDemoRevision);

export type SessionSnapshotPhase = "lobby" | "gameplay" | "ended";

export type HostSessionStatus = "active" | "ended";

/**
 * Summary of a game state history entry.
 */
export type HistoryEntrySummary = {
  id: string;

  version: number;
  timestamp: string;
  description: string;
  playerId?: string;
  actionType?: string;
  isCurrent: boolean;
};

export type SessionSnapshotHistory = {
  entries: Array<HistoryEntrySummary>;
  currentIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
};

export type HostSessionContext = {
  /**
   * Unique identifier for the session.
   */
  sessionId: string;
  /**
   * Memorable short code for sharing.
   */
  shortCode: string;
  phase: SessionSnapshotPhase;
  status: HostSessionStatus;
  hostActor: SessionActor;
  gameSource: SessionGameSource;
  /**
   * Player IDs the authenticated session actor may select.
   */
  switchablePlayerIds: Array<string>;
  history?: SessionSnapshotHistory;
};

export type SeatAssignment = {
  /**
   * Player identifier (e.g., 'player-1')
   */
  playerId: string;
  /**
   * Session actor controlling this seat (null if empty)
   */
  controllerActor?: SessionActor;
  /**
   * Display name for this seat/player
   */
  displayName: string;
  /**
   * Hex color code for the player (e.g., '#FF5733')
   */
  playerColor?: string;
  /**
   * Whether this seat is the host
   */
  isHost?: boolean;
};

export type HostLobbyView = {
  /**
   * Current public seat assignments for the session.
   */
  seats: Array<SeatAssignment>;
  /**
   * Whether the lobby can currently be started.
   */
  canStart: boolean;
  /**
   * Session actor that hosts this session.
   */
  hostActor: SessionActor;
};

export type HostLobbySessionSnapshot = {
  type: "lobby";
  context: HostSessionContext;
  lobby: HostLobbyView;
};

export type SimultaneousPhaseSnapshot = {
  phaseName: string;
  interactionId: string;
  actorIds: Array<string>;
  sealedPlayerIds: Array<string>;
  pendingPlayerIds: Array<string>;
};

export type HostGameplaySharedView = {
  /**
   * Player IDs currently active in the game state.
   */
  activePlayers: Array<string>;
  /**
   * Current reducer-native gameplay phase.
   */
  currentPhase: string;
  /**
   * Visibility-safe progress metadata for an active simultaneous-player phase.
   */
  simultaneousPhase?: SimultaneousPhaseSnapshot | null;
  /**
   * JSON-serialized dynamic view shared by every player for this projection.
   */
  dynamicView?: string | null;
  /**
   * JSON-serialized session-scoped static view. Populated on gameplay bootstrap payloads only.
   */
  boardStatic?: string | null;
  /**
   * Content hash of the session-scoped static view held on the host.
   */
  boardStaticHash?: string | null;
};

export type {
  InteractionCommitPolicy,
  InputSelection,
  InputDomain,
  InteractionInputDescriptor,
  InteractionAvailability,
  InteractionDescriptor,
} from "../interaction-schema";
import type {
  InputDomain,
  InputSelection,
  InteractionAvailability,
  InteractionDescriptor,
} from "../interaction-schema";
export type SingleInputSelection = Extract<InputSelection, { mode: "single" }>;
export type ManyInputSelection = Extract<InputSelection, { mode: "many" }>;
export type CardTargetDomain = Extract<InputDomain, { type: "cardTarget" }>;
export type ResolvedCardTargetDomain = CardTargetDomain;
export type BoardTargetDomain = Extract<InputDomain, { type: "boardTarget" }>;
export type ResolvedBoardTargetDomain = BoardTargetDomain;
export type ResourceMapDomain = Extract<InputDomain, { type: "resourceMap" }>;
export type ResourceMapDomainEntry = ResourceMapDomain["resources"][number];
export type BoundedNumberDomain = Extract<
  InputDomain,
  { type: "boundedNumber" }
>;
export type ChoiceDomain = Extract<InputDomain, { type: "choice" }>;
export type ChoiceDomainOption = ChoiceDomain["choices"][number];
export type ChoiceListDomain = Extract<InputDomain, { type: "choiceList" }>;
export type AvailableInteractionAvailability = Extract<
  InteractionAvailability,
  { status: "available" }
>;
export type NotYourTurnInteractionAvailability = Extract<
  InteractionAvailability,
  { status: "notYourTurn" }
>;
export type BlockedInteractionAvailability = Extract<
  InteractionAvailability,
  { status: "blocked" }
>;
export type InteractionDescriptorBase = Omit<InteractionDescriptor, "kind">;
export type ActionInteractionDescriptor = InteractionDescriptor;
export type ZoneHandles = import("../interaction-schema").ZoneInteractionRefs;

export type HostGameplaySeatView = {
  /**
   * Opaque revision token for this seat's available descriptors and input domains.
   */
  actionSetVersion: string;
  /**
   * JSON-serialized reducer-projected UI view for this player.
   */
  view: string | null;
  /**
   * Descriptor refs for interactions available to this player.
   */
  availableInteractionRefs: Array<string>;
  /**
   * Zone handles for this player, keyed by zone id.
   */
  zones: {
    [key: string]: ZoneHandles;
  };
};

export type HostPlayerGameplayView = {
  /**
   * Monotonic gameplay version for stale-client detection.
   */
  version: number;
  /**
   * Opaque revision token for the returned descriptors and input domains.
   */
  actionSetVersion: string;
  /**
   * Player ID currently selected for rendering and input.
   */
  perspectivePlayerId: string;
  shared: HostGameplaySharedView;
  /**
   * Deduplicated interaction descriptor registry keyed by stable descriptor ref.
   */
  interactionsByRef: {
    [key: string]: InteractionDescriptor;
  };
  /**
   * Player-scoped projections keyed by authorized player id.
   */
  seats: {
    [key: string]: HostGameplaySeatView;
  };
};

export type HostGameplaySessionSnapshot = {
  type: "gameplay";
  context: HostSessionContext;
  lobby: HostLobbyView;
  gameplay: HostPlayerGameplayView;
};

export type HostEndedSessionSnapshot = {
  type: "ended";
  context: HostSessionContext;
  lobby: HostLobbyView;
};

export type HostSessionSnapshot =
  | ({
      type: "lobby";
    } & HostLobbySessionSnapshot)
  | ({
      type: "gameplay";
    } & HostGameplaySessionSnapshot)
  | ({
      type: "ended";
    } & HostEndedSessionSnapshot);

export type HostSessionEventCausation = {
  clientActionId?: string;
};

export type HostSessionGameplayUpdatedEvent = {
  type: "session.gameplayUpdated";
  context: HostSessionContext;
  gameplay: HostPlayerGameplayView;
  causation?: HostSessionEventCausation;
};

export type HostActionSubmitResponse = {
  success: boolean;
  version: number;
  actionSetVersion: string;
  accepted?: boolean;
  durabilityStatus?: "COMMITTED";
  errorCode?: string;
  message?: string;
  clientActionId?: string;
  update?: HostSessionGameplayUpdatedEvent;
};

/**
 * Type of parameter accepted by a runtime action
 */
export type ParameterType =
  | "cardId"
  | "cardType"
  | "playerId"
  | "string"
  | "number"
  | "boolean"
  | "zoneId"
  | "pieceId"
  | "dieId"
  | "boardId"
  | "edgeId"
  | "vertexId"
  | "spaceId"
  | "resourceId";

/**
 * Defines a parameter for an action
 */
export type ActionParameterDefinition = {
  name: string;
  type: ParameterType;
  required?: boolean;
  array?: boolean;
  minLength?: number;
  maxLength?: number;
  /**
   * Optional card set ID to specify which card set a CARD_ID parameter refers to
   */
  cardSetId?: string;
  description?: string;
};

/**
 * Defines an available player action with metadata and parameter definitions
 */
export type ActionDefinition = {
  /**
   * Unique action identifier
   */
  actionType: string;
  /**
   * UI display name for this action
   */
  displayName: string;
  /**
   * Optional help text describing the action
   */
  description?: string;
  /**
   * List of parameters this action accepts
   */
  parameters: Array<ActionParameterDefinition>;
  /**
   * List of possible validation error codes
   */
  errorCodes?: Array<string>;
};

/**
 * Type of source for the card set
 */
export type CardSetSourceType = "preset" | "csv" | "manual";

/**
 * Engine-level structural board layout discriminator
 */
export type BoardLayout = "generic" | "hex" | "square";

/**
 * Unique identifier for the player (e.g., 'player-1')
 */
export type PlayerId = string;
