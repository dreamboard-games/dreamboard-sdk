import type { RuntimeJson } from "./json.js";

export type PlayerId = string;

export interface PluginPlayerSummary {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly color?: string;
}

export interface PluginSessionDescriptor {
  readonly sessionId: string;
  /** Turn order is the order of this array. */
  readonly players: readonly PluginPlayerSummary[];
}

export interface InteractionCommitPolicy {
  readonly mode: "manual" | "autoWhenReady";
}

export type InputSelection =
  | { readonly mode: "single" }
  | {
      readonly mode: "many";
      readonly min: number;
      readonly max?: number;
      readonly distinct?: boolean;
    };

export interface InputDomainDependencyCase {
  readonly when: Readonly<Record<string, string>>;
  readonly domain: InputDomain;
}

export type InputDomainDependencies =
  | {
      readonly mode: "eager";
      readonly dependentCases: readonly InputDomainDependencyCase[];
    }
  | {
      readonly mode: "lazy";
      readonly dependsOn: readonly string[];
      readonly resolver: {
        readonly interactionKey?: string;
        readonly inputKey: string;
      };
    };

export interface InputDomain {
  readonly type: string;
  readonly selection?: InputSelection;
  readonly dependencies?: InputDomainDependencies;
  readonly [key: string]:
    | RuntimeJson
    | InputSelection
    | InputDomainDependencies
    | undefined;
}

export interface InteractionChoiceOption {
  readonly value: string | null;
  readonly label: string;
  readonly icon?: string;
  readonly badge?: string;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
}

export interface InteractionInputDescriptor {
  readonly key: string;
  readonly kind: string;
  readonly domain: InputDomain;
  readonly defaultValue?: RuntimeJson;
}

export type InteractionAvailability =
  | { readonly status: "available" }
  | { readonly status: "notYourTurn"; readonly reason: string }
  | {
      readonly status: "insufficientResources";
      readonly reason: string;
      readonly missingResources: Readonly<Record<string, number>>;
    }
  | {
      readonly status: "blocked";
      readonly reason: string;
      readonly code?: string;
    };

export interface InteractionDiagnosticReason {
  readonly ruleId: string;
  readonly errorCode: string;
}

export interface SetupGuidanceStep {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface GameGuidanceProjection {
  readonly phase: {
    readonly id: string;
    readonly label: string;
    readonly summary?: string;
    readonly objective?: string;
  };
  readonly setup?: {
    readonly profileId: string;
    readonly name: string;
    readonly summary?: string;
    readonly steps: readonly SetupGuidanceStep[];
  };
}

interface InteractionDescriptorBase<Interaction extends string = string> {
  readonly phaseName: string;
  readonly interactionKey: Interaction;
  readonly interactionId: string;
  readonly label: string;
  readonly help?: string;
  readonly zoneId?: string;
  readonly zoneIds?: readonly string[];
  readonly commit: InteractionCommitPolicy;
  readonly descriptorDigest?: string;
  readonly actorSeat?: number;
  readonly draftDigest?: string;
  readonly inputs: readonly InteractionInputDescriptor[];
  readonly cost?: Readonly<Record<string, RuntimeJson>>;
  readonly currentResources?: Readonly<Record<string, RuntimeJson>>;
  readonly availability: InteractionAvailability;
  readonly reasons?: readonly InteractionDiagnosticReason[];
}

export type ActionInteractionDescriptor<Interaction extends string = string> =
  InteractionDescriptorBase<Interaction> & {
    readonly kind: "action";
  };

export interface InteractionContextOption {
  readonly id: string;
  readonly label?: string;
}

export interface InteractionContext {
  readonly to: string;
  readonly title?: string;
  readonly payload?: Readonly<Record<string, RuntimeJson>>;
  readonly options?: readonly InteractionContextOption[];
}

export type PromptInteractionDescriptor<Interaction extends string = string> =
  InteractionDescriptorBase<Interaction> & {
    readonly kind: "prompt";
    readonly context: InteractionContext;
  };

export type InteractionDescriptor<Interaction extends string = string> =
  | ActionInteractionDescriptor<Interaction>
  | PromptInteractionDescriptor<Interaction>;

export interface ZoneHandlesSnapshot<Interaction extends string = string> {
  readonly cardIds: readonly string[];
  readonly cardViewsById: Readonly<Record<string, string>>;
  readonly playableByCardId: Readonly<
    Record<string, readonly InteractionDescriptor<Interaction>[]>
  >;
}

export interface SimultaneousPhaseSnapshot {
  readonly phaseName: string;
  readonly interactionId: string;
  readonly actorIds: readonly PlayerId[];
  readonly sealedPlayerIds: readonly PlayerId[];
  readonly pendingPlayerIds: readonly PlayerId[];
}

export interface GameEventDetail {
  readonly label: string;
  readonly value: string | number | boolean;
}

export interface SystemActionEvent {
  readonly kind: "systemAction";
  readonly procedureId: string;
  readonly title: string;
  readonly summary?: string;
  readonly details?: readonly GameEventDetail[];
}

export type GameEvent = SystemActionEvent;

export type ProjectedGameEvent = GameEvent & {
  readonly version: number;
  readonly index: number;
};

export interface PluginGameplayFrame<
  View = unknown,
  Phase extends string = string,
  Stage extends string = string,
  Interaction extends string = string,
> {
  readonly gameVersion: number;
  readonly actionSetVersion: string;
  readonly perspectivePlayerId: PlayerId | null;
  readonly view: View | null;
  readonly flow: {
    readonly currentPhase: Phase | null;
    readonly currentStage: Stage | null;
    readonly activePlayers: readonly PlayerId[];
    readonly simultaneousPhase: SimultaneousPhaseSnapshot | null;
  };
  readonly availableInteractions: ReadonlyArray<
    InteractionDescriptor<Interaction>
  >;
  readonly guidance?: GameGuidanceProjection | null;
  readonly recentEvents: readonly ProjectedGameEvent[];
  readonly zones: Readonly<Record<string, ZoneHandlesSnapshot<Interaction>>>;
}

export interface ReducerSeatProjectionBundle {
  readonly currentStage?: string | null;
  readonly stageSeats?: readonly string[];
  readonly simultaneousPhase?: SimultaneousPhaseSnapshot | null;
  readonly guidance?: GameGuidanceProjection | null;
  readonly recentEvents?: readonly ProjectedGameEvent[];
  readonly interactionsByRef?: unknown;
  readonly seats: Readonly<
    Record<
      string,
      {
        readonly view?: unknown;
        readonly availableInteractionRefs?: unknown;
        readonly zones?: unknown;
      }
    >
  >;
}

export interface ReducerBoardStaticProjection {
  readonly view: RuntimeJson;
  readonly hash?: string;
  readonly manifestVersion?: string;
}
