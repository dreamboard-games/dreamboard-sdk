import type { PlayerId } from "./player-id";

/**
 * Authoritative interaction descriptor resolved by the trusted bundle.
 * Eligibility and availability are authoritative — clients MUST NOT recompute.
 */
export type InteractionKind = "action";

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

export interface InteractionDiagnosticReason {
  ruleId: string;
  errorCode: string;
}

export type InteractionAvailability =
  | { status: "available" }
  | { status: "notYourTurn"; reason: string }
  | { status: "blocked"; reason: string; code?: string };

interface InteractionDescriptorBase<Key extends string = string> {
  phaseName: string;
  interactionKey: Key;
  interactionId: string;
  label: string;
  help?: string;
  /** Draft commit policy. Always materialized by the trusted reducer bundle. */
  commit: InteractionCommitPolicy;
  /** Canonical descriptor digest used by browser replay/protocol tooling when projected by the host. */
  descriptorDigest?: string;
  /** Explicit authoring/runtime actor seat used by browser replay draft digests. */
  actorSeat?: number;
  /** Canonical draft digest used by browser replay/protocol tooling when projected by the host. */
  draftDigest?: string;
  /** Source zone id for zone-scoped interactions (e.g., cardInput). */
  zoneId?: string;
  /** Source zone ids for zone-scoped interactions that span multiple zones. */
  zoneIds?: readonly string[];
  /** Ordered input descriptors. This is the canonical source for input keys, collector kind, and valid-value domains. */
  inputs: readonly InteractionInputDescriptor[];
  /** Authoritative availability state for this descriptor. */
  availability: InteractionAvailability;
  /** Optional verbose diagnostics for dev tooling; omitted from production projections. */
  reasons?: readonly InteractionDiagnosticReason[];
}

export type ActionInteractionDescriptor<Key extends string = string> =
  InteractionDescriptorBase<Key> & {
    kind: "action";
  };

export type InteractionDescriptor<Key extends string = string> =
  ActionInteractionDescriptor<Key>;

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

export interface GameEventDetail {
  label: string;
  value: string | number | boolean;
}

export interface SystemActionEvent {
  kind: "systemAction";
  procedureId: string;
  title: string;
  summary?: string;
  details?: readonly GameEventDetail[];
}

export type GameEvent = SystemActionEvent;

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
