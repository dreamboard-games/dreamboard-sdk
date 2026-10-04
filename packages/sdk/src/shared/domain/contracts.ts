import type * as z from "zod";
import type * as manifestSchemas from "./manifest-schema.js";
import type { RuntimeJson } from "../runtime-json";
// Public SDK contracts. Manifest DTOs derive from the SDK structural schema;
// backend API clients are published separately.

/**
 * Supported player-count metadata for the game
 */
export type PlayersDefinition = z.infer<
  typeof manifestSchemas.PlayersDefinitionSchema
>;

/**
 * Arbitrary authored JSON value.
 */
export type JsonValue = RuntimeJson;

/** Portable JSON Schema emitted by SDK field-schema authoring. */
export type FieldSchemaJson = z.infer<
  typeof manifestSchemas.FieldSchemaJsonSchema
>;
export type CardSchemaJson = z.infer<
  typeof manifestSchemas.CardSchemaJsonSchema
>;

export type DetachedHomeSpec = z.infer<
  typeof manifestSchemas.DetachedHomeSpecSchema
>;

export type ZoneHomeSpec = z.infer<typeof manifestSchemas.ZoneHomeSpecSchema>;

export type SpaceHomeSpec = z.infer<typeof manifestSchemas.SpaceHomeSpecSchema>;

export type ContainerHomeSpec = z.infer<
  typeof manifestSchemas.ContainerHomeSpecSchema
>;

/**
 * Tiled board edge identified by the spaces that border it
 */
export type BoardEdgeRef = z.infer<typeof manifestSchemas.BoardEdgeRefSchema>;

export type EdgeHomeSpec = z.infer<typeof manifestSchemas.EdgeHomeSpecSchema>;

/**
 * Tiled board vertex identified by the spaces that touch it
 */
export type BoardVertexRef = z.infer<
  typeof manifestSchemas.BoardVertexRefSchema
>;

export type VertexHomeSpec = z.infer<
  typeof manifestSchemas.VertexHomeSpecSchema
>;

export type PieceSlotHostRef = z.infer<
  typeof manifestSchemas.PieceSlotHostRefSchema
>;

export type DieSlotHostRef = z.infer<
  typeof manifestSchemas.DieSlotHostRefSchema
>;

export type SlotHostRef = z.infer<typeof manifestSchemas.SlotHostRefSchema>;

export type SlotHomeSpec = z.infer<typeof manifestSchemas.SlotHomeSpecSchema>;

export type ComponentHomeSpec = z.infer<
  typeof manifestSchemas.ComponentHomeSpecSchema
>;

/**
 * Default authored visibility for a component instance
 */
export type ComponentVisibilitySpec = z.infer<
  typeof manifestSchemas.ComponentVisibilitySpecSchema
>;

export type BoardCard = z.infer<typeof manifestSchemas.BoardCardSchema>;

export type CardSetDefinition = z.infer<
  typeof manifestSchemas.CardSetDefinitionSchema
>;

/**
 * Whether authored topology exists once for the table or once per player
 */
export type TopologyScope = z.infer<typeof manifestSchemas.TopologyScopeSchema>;

/**
 * Default topology visibility for a zone or slot
 */
export type ZoneVisibility = z.infer<
  typeof manifestSchemas.ZoneVisibilitySchema
>;

/**
 * Generic authored container that can hold cards, pieces, or dice
 */
export type ZoneSpec = z.infer<typeof manifestSchemas.ZoneSpecSchema>;

/**
 * Stable authored board space or slot anchor
 */
export type BoardSpaceSpec = z.infer<
  typeof manifestSchemas.BoardSpaceSpecSchema
>;

/**
 * Named relation between two authored spaces
 */
export type BoardRelationSpec = z.infer<
  typeof manifestSchemas.BoardRelationSpecSchema
>;

export type BoardHostSpec = z.infer<typeof manifestSchemas.BoardHostSpecSchema>;

export type SpaceHostSpec = z.infer<typeof manifestSchemas.SpaceHostSpecSchema>;

export type BoardContainerHostSpec = z.infer<
  typeof manifestSchemas.BoardContainerHostSpecSchema
>;

/**
 * Authored board-attached or space-attached container/slot
 */
export type BoardContainerSpec = z.infer<
  typeof manifestSchemas.BoardContainerSpecSchema
>;

/**
 * Visual orientation for authored hex coordinates
 */
export type HexOrientation = z.infer<
  typeof manifestSchemas.HexOrientationSchema
>;
export type HexCoordinate = z.infer<typeof manifestSchemas.HexCoordinateSchema>;
export type HexShape = z.infer<typeof manifestSchemas.HexShapeSchema>;
export type HexSpaceOverride = z.infer<
  typeof manifestSchemas.HexSpaceOverrideSchema
>;

/**
 * One authored hex space in axial coordinates
 */
export type HexSpaceSpec = z.infer<typeof manifestSchemas.HexSpaceSpecSchema>;

/**
 * Hex edge identified by two adjacent hex spaces
 */
export type HexEdgeRef = z.infer<typeof manifestSchemas.HexEdgeRefSchema>;

/**
 * Authored metadata attached to one derived hex edge
 */
export type HexEdgeSpec = z.infer<typeof manifestSchemas.HexEdgeSpecSchema>;

/**
 * Hex vertex identified by three touching hex spaces
 */
export type HexVertexRef = z.infer<typeof manifestSchemas.HexVertexRefSchema>;

/**
 * Authored metadata attached to one derived hex vertex
 */
export type HexVertexSpec = z.infer<typeof manifestSchemas.HexVertexSpecSchema>;

/**
 * One authored square space in row/column coordinates
 */
export type SquareSpaceSpec = z.infer<
  typeof manifestSchemas.SquareSpaceSpecSchema
>;

/**
 * Authored metadata attached to one derived square edge
 */
export type SquareEdgeSpec = z.infer<
  typeof manifestSchemas.SquareEdgeSpecSchema
>;

/**
 * Authored metadata attached to one derived square vertex
 */
export type SquareVertexSpec = z.infer<
  typeof manifestSchemas.SquareVertexSpecSchema
>;

/**
 * Shared or per-player authored board instance shell
 */
export type GenericBoardSpec = z.infer<
  typeof manifestSchemas.GenericBoardSpecSchema
>;

/**
 * Shared or per-player authored hex board instance shell
 */
export type HexBoardSpec = z.infer<typeof manifestSchemas.HexBoardSpecSchema>;

/**
 * Shared or per-player authored square board instance shell
 */
export type SquareBoardSpec = z.infer<
  typeof manifestSchemas.SquareBoardSpecSchema
>;

export type BoardSpec = z.infer<typeof manifestSchemas.BoardSpecSchema>;

/**
 * Named authored slot exposed by a piece or die type
 */
export type ComponentSlotSpec = z.infer<
  typeof manifestSchemas.ComponentSlotSpecSchema
>;

/**
 * Reusable authored piece type
 */
export type PieceTypeSpec = z.infer<typeof manifestSchemas.PieceTypeSpecSchema>;

/**
 * Authored seeded piece inventory or supply definition
 */
export type PieceSeedSpec = z.infer<typeof manifestSchemas.PieceSeedSpecSchema>;

/**
 * Reusable authored die type
 */
export type DieTypeSpec = z.infer<typeof manifestSchemas.DieTypeSpecSchema>;

/**
 * Authored seeded die inventory or supply definition
 */
export type DieSeedSpec = z.infer<typeof manifestSchemas.DieSeedSpecSchema>;

/**
 * Definition of a game resource type
 */
export type ResourceDefinition = z.infer<
  typeof manifestSchemas.ResourceDefinitionSchema
>;

/**
 * Authoritative topology manifest for reducer-native games
 */
export type GameTopologyManifest = z.infer<
  typeof manifestSchemas.GameTopologyManifestSchema
>;

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
 * Engine-level structural board layout discriminator
 */
export type BoardLayout = "generic" | "hex" | "square";

/**
 * Unique identifier for the player (e.g., 'player-1')
 */
export type PlayerId = string;
