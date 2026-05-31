import type { PlayerId } from "@dreamboard/manifest-contract";
import type { HexColor } from "@dreamboard-games/ui-sdk";

/**
 * Plugin State Types
 *
 * These types define the state structure that the host app sends to the plugin
 * via state-sync messages. The plugin uses these types to access pre-computed
 * game state without needing to parse raw SSE messages.
 */

type ActionName = string;

export interface SeatAssignment {
  playerId: PlayerId;
  controllerUserId?: string;
  displayName: string;
  playerColor?: HexColor;
  isHost?: boolean;
}

export interface HistoryEntrySummary {
  id: string;
  version: number;
  timestamp: string;
  description: string;
  playerId?: PlayerId;
  actionType?: ActionName;
  isCurrent: boolean;
}

// ============================================================================
// Lobby State (from LOBBY_UPDATE messages)
// ============================================================================

/**
 * Lobby state for the pre-game lobby phase
 */
export interface LobbyState {
  /** Current seat assignments in the lobby */
  seats: SeatAssignment[];
  /** Whether the game can be started (all seats filled) */
  canStart: boolean;
  /** User ID of the session host */
  hostUserId: string;
}

// ============================================================================
// Notifications (from YOUR_TURN, ACTION_REJECTED, PROMPT_OPENED, etc.)
// ============================================================================

/**
 * Notification types that get queued for the plugin
 */
export type NotificationType =
  | "YOUR_TURN"
  | "PROMPT_OPENED"
  | "ACTION_EXECUTED"
  | "ACTION_REJECTED"
  | "TURN_CHANGED"
  | "STATE_CHANGED"
  | "GAME_ENDED"
  | "ERROR";

/**
 * YOUR_TURN notification payload
 */
export interface YourTurnPayload {
  type: "YOUR_TURN";
  activePlayers: PlayerId[];
}

/**
 * PROMPT_OPENED notification payload
 */
export interface PromptOpenedPayload {
  type: "PROMPT_OPENED";
  promptId: string;
  promptInstanceId: string;
  targetPlayer: PlayerId;
  title?: string;
}

/**
 * ACTION_EXECUTED notification payload
 */
export interface ActionExecutedPayload {
  type: "ACTION_EXECUTED";
  playerId: PlayerId;
  actionType: string;
}

/**
 * ACTION_REJECTED notification payload
 */
export interface ActionRejectedPayload {
  type: "ACTION_REJECTED";
  reason: string;
  targetPlayer?: string;
}

/**
 * STATE_CHANGED notification payload
 */
export interface StateChangedPayload {
  type: "STATE_CHANGED";
  newState: string;
}

/**
 * TURN_CHANGED notification payload
 */
export interface TurnChangedPayload {
  type: "TURN_CHANGED";
  previousPlayers: PlayerId[];
  currentPlayers: PlayerId[];
}

/**
 * GAME_ENDED notification payload
 */
export interface GameEndedPayload {
  type: "GAME_ENDED";
  winner?: string;
  finalScores: Record<string, number>;
  reason: string;
}

/**
 * ERROR notification payload
 */
export interface ErrorPayload {
  type: "ERROR";
  message: string;
  code?: string;
}

/**
 * Union of all notification payloads
 */
export type NotificationPayload =
  | YourTurnPayload
  | PromptOpenedPayload
  | ActionExecutedPayload
  | ActionRejectedPayload
  | TurnChangedPayload
  | StateChangedPayload
  | GameEndedPayload
  | ErrorPayload;

/**
 * Notification entry in the queue.
 * Notifications are ephemeral events that the plugin can consume and mark as read.
 */
export interface Notification {
  /** Unique notification ID */
  id: string;
  /** Type of notification */
  type: NotificationType;
  /** Type-specific payload */
  payload: NotificationPayload;
  /** Timestamp when the notification was created */
  timestamp: number;
  /** Whether the plugin has marked this notification as read */
  read: boolean;
}

// ============================================================================
// Session State
// ============================================================================

/**
 * Session state that gets synchronized to the plugin.
 * This includes player switching info that was previously sent via
 * separate player-switched messages.
 */
export interface PluginSessionState {
  /** Current session ID */
  sessionId: string | null;
  /** Player IDs that this user can control (immutable after game starts) */
  controllablePlayerIds: PlayerId[];
  /** The currently selected player ID that the user is controlling */
  controllingPlayerId: PlayerId | null;
  /** User ID of the controller */
  userId: string | null;
}

// ============================================================================
// History State (host only)
// ============================================================================

// HistoryEntrySummary is re-exported from @dreamboard-games/api-client (see imports above)

/**
 * History state for the host's history navigator.
 * Only sent to the host user.
 */
export interface HistoryState {
  /** List of history entries (newest first when displayed) */
  entries: HistoryEntrySummary[];
  /** Index of the current state in the history */
  currentIndex: number;
  /** Whether there are earlier states to restore to */
  canGoBack: boolean;
  /** Whether there are later states to restore to */
  canGoForward: boolean;
}

// ============================================================================
// Plugin State Snapshot
// ============================================================================

export interface GameplayPromptOption {
  id: string;
  label: string;
}

/** Choice option surfaced on a prompt-kind interaction's structured context. */
export interface InteractionContextOption {
  id: string;
  label?: string;
}

/** Structured context attached to a prompt-kind InteractionDescriptor. */
export interface InteractionContext {
  /** Addressed player id. */
  to: string;
  title?: string;
  /** Authored prompt payload. Shape is defined by the game's prompt schema. */
  payload?: Record<string, unknown>;
  /** Selectable options for choice-kind prompts. */
  options?: readonly InteractionContextOption[];
}

/**
 * Authoritative interaction descriptor resolved by the trusted bundle.
 * Eligibility, cost, and availability are authoritative — clients MUST NOT recompute.
 */
export type InteractionKind = "action" | "prompt";

export type InteractionCommitPolicy =
  | { mode: "manual" }
  | { mode: "autoWhenReady" };

export type InputSelection =
  | { mode: "single" }
  | { mode: "many"; min: number; max?: number; distinct?: boolean };

export type InputDomain =
  | CardTargetDomain
  | BoardTargetDomain
  | ResourceMapDomain
  | BoundedNumberDomain
  | ChoiceDomain
  | ChoiceListDomain;

export type InputDomainResolver =
  | EagerInputDomainDependencies
  | LazyInputDomainDependencies;

export interface EagerInputDomainDependencies {
  mode: "eager";
  dependentCases: readonly InputDomainDependencyCase[];
}

export interface LazyInputDomainDependencies {
  mode: "lazy";
  dependsOn: readonly string[];
  resolver: {
    interactionKey?: string;
    inputKey: string;
  };
}

export interface ResolvedCardTargetDomain {
  type: "cardTarget";
  projection: "resolved";
  zoneId?: string;
  zoneIds?: readonly string[];
  eligibleTargets: readonly string[];
  selection?: InputSelection;
  dependencies?: InputDomainResolver;
}

export interface LazyCardTargetDomain {
  type: "cardTarget";
  projection: "lazy";
  zoneId?: string;
  zoneIds?: readonly string[];
  selection?: InputSelection;
  dependencies: LazyInputDomainDependencies;
}

export type CardTargetDomain = ResolvedCardTargetDomain | LazyCardTargetDomain;

export interface ResolvedBoardTargetDomain {
  type: "boardTarget";
  projection: "resolved";
  targetKind: string;
  boardId?: string;
  eligibleTargets: readonly string[];
  selection?: InputSelection;
  dependencies?: InputDomainResolver;
}

export interface LazyBoardTargetDomain {
  type: "boardTarget";
  projection: "lazy";
  targetKind: string;
  boardId?: string;
  selection?: InputSelection;
  dependencies: LazyInputDomainDependencies;
}

export type BoardTargetDomain =
  | ResolvedBoardTargetDomain
  | LazyBoardTargetDomain;

export interface ResourceMapDomain {
  type: "resourceMap";
  resources?: ReadonlyArray<{
    resourceId: string;
    label?: string;
    icon?: string;
    min: number;
    max: number;
  }>;
  dependencies?: InputDomainResolver;
}

export interface BoundedNumberDomain {
  type: "boundedNumber";
  min?: number;
  max?: number;
  step?: number;
  dependencies?: InputDomainResolver;
}

export interface ChoiceDomain {
  type: "choice";
  choices?: readonly InteractionChoiceOption[];
  selection?: InputSelection;
  dependencies?: InputDomainResolver;
}

export interface ChoiceListDomain {
  type: "choiceList";
  choices?: readonly InteractionChoiceOption[];
  min?: number;
  max?: number;
  selection?: InputSelection;
  dependencies?: InputDomainResolver;
}

export interface InputDomainDependencyCase {
  when: Readonly<Record<string, string>>;
  domain: InputDomain;
}

export interface InteractionChoiceOption {
  value: string | null;
  label: string;
  icon?: string;
  badge?: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface InteractionInputDescriptor {
  key: string;
  kind: string;
  domain: InputDomain;
  defaultValue?: unknown;
}

export type InteractionAvailability =
  | { status: "available" }
  | { status: "notYourTurn"; reason: string }
  | {
      status: "insufficientResources";
      reason: string;
      missingResources: Readonly<Record<string, number>>;
    }
  | { status: "blocked"; reason: string; code?: string };

interface InteractionDescriptorBase<Key extends string = string> {
  phaseName: string;
  interactionKey: Key;
  interactionId: string;
  /** Draft commit policy. Always materialized by the trusted reducer bundle. */
  commit: InteractionCommitPolicy;
  /** Source zone id for zone-scoped interactions (e.g., cardInput). */
  zoneId?: string;
  /** Source zone ids for zone-scoped interactions that span multiple zones. */
  zoneIds?: readonly string[];
  /** Ordered input descriptors. This is the canonical source for input keys, collector kind, and valid-value domains. */
  inputs: readonly InteractionInputDescriptor[];
  /** Resolved cost map keyed by resource id (if interaction declares one). */
  cost?: Record<string, unknown>;
  /** Snapshot of seat's currently available resources keyed by resource id. */
  currentResources?: Record<string, unknown>;
  /** Authoritative availability state for this descriptor. */
  availability: InteractionAvailability;
}

export type ActionInteractionDescriptor<Key extends string = string> =
  InteractionDescriptorBase<Key> & {
    kind: "action";
  };

export type PromptInteractionDescriptor<Key extends string = string> =
  InteractionDescriptorBase<Key> & {
    kind: "prompt";
    /** Structured prompt context for prompt-kind interactions. */
    context: InteractionContext;
  };

export type InteractionDescriptor<Key extends string = string> =
  | ActionInteractionDescriptor<Key>
  | PromptInteractionDescriptor<Key>;

/**
 * Per-player view of a single zone. Mirrors the ZoneHandles wire shape from
 * the trusted bundle's resolveZoneHandles; `cardViewsById` is JSON-serialized
 * `ViewCard` and `playableByCardId` lists the interactions that are playable
 * on each card (eligibility already filtered by each interaction's validate).
 */
export interface ZoneHandlesSnapshot<InteractionType extends string = string> {
  cardIds: readonly string[];
  cardViewsById: Readonly<Record<string, string>>;
  playableByCardId: Readonly<
    Record<string, ReadonlyArray<InteractionDescriptor<InteractionType>>>
  >;
}

export interface SimultaneousPhaseSnapshot {
  phaseName: string;
  interactionId: string;
  actorIds: PlayerId[];
  sealedPlayerIds: PlayerId[];
  pendingPlayerIds: PlayerId[];
}

export interface GameplaySnapshot<
  PhaseType extends string = string,
  StageType extends string = string,
  InteractionType extends string = string,
> {
  currentPhase: PhaseType | null;
  currentStage: StageType | null;
  activePlayers: PlayerId[];
  simultaneousPhase?: SimultaneousPhaseSnapshot | null;
  availableInteractions: ReadonlyArray<InteractionDescriptor<InteractionType>>;
  /**
   * Zone handles scoped to the controlling player. Keyed by zoneId.
   * Authored via phase `zones`; projected from `resolveZoneHandles`.
   */
  zones: Readonly<Record<string, ZoneHandlesSnapshot<InteractionType>>>;
}

/**
 * The complete state snapshot sent to the plugin via state-sync.
 * This is the single source of truth for all reducer-native plugin state.
 */
export interface PluginStateSnapshot<
  View = unknown,
  PhaseType extends string = string,
  StageType extends string = string,
  InteractionType extends string = string,
> {
  /** Projected seat-specific reducer-native view for the controlling player */
  view: View | null;
  /** Gameplay transport state that sits alongside the projected reducer view */
  gameplay: GameplaySnapshot<PhaseType, StageType, InteractionType>;
  /** Lobby state (from LOBBY_UPDATE) - null if game has started */
  lobby: LobbyState | null;
  /** Notification queue (from YOUR_TURN, ACTION_REJECTED, PROMPT_OPENED, etc.) */
  notifications: Notification[];
  /** Session state (includes controllingPlayerId for player switching) */
  session: PluginSessionState;
  /** History state for host navigation (null if not host or history disabled) */
  history: HistoryState | null;
  /** Monotonic sync ID for acknowledgment tracking */
  syncId: number;
}

// ============================================================================
// State Sync Messages
// ============================================================================

/**
 * Message sent from host to plugin to sync state
 */
export interface StateSyncMessage {
  type: "state-sync";
  /** Sync ID for acknowledgment tracking */
  syncId: number;
  /** Complete state snapshot */
  state: PluginStateSnapshot;
}

/**
 * Message sent from plugin to host to acknowledge state receipt
 */
export interface StateAckMessage {
  type: "state-ack";
  /** Echoes back the syncId that was received */
  syncId: number;
}
