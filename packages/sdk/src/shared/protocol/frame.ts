import type { GameEvent } from "../domain/results.js";
import type * as Wire from "../runtime-types.js";
import type { RuntimeJson } from "../runtime-json.js";

export type PlayerId = string;

export interface GameplayBasis {
  readonly version: number;
  readonly actionSetVersion: string;
  readonly perspectivePlayerId: PlayerId;
}

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

export interface InputDomain {
  readonly type: string;
  readonly selection?: InputSelection;
  readonly [key: string]: RuntimeJson | InputSelection | undefined;
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
      readonly status: "blocked";
      readonly reason: string;
      readonly code?: string;
    };

export interface InteractionDiagnosticReason {
  readonly ruleId: string;
  readonly errorCode: string;
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
  readonly step?: {
    readonly index: number;
    readonly total: number;
    readonly selected: Readonly<Record<string, RuntimeJson>>;
    readonly canCancel: boolean;
  };
  readonly availability: InteractionAvailability;
  readonly reasons?: readonly InteractionDiagnosticReason[];
}

export type ActionInteractionDescriptor<Interaction extends string = string> =
  InteractionDescriptorBase<Interaction> & {
    readonly kind: "action";
  };

export type InteractionDescriptor<Interaction extends string = string> =
  ActionInteractionDescriptor<Interaction>;

export interface ZoneHandlesSnapshot<Interaction extends string = string> {
  readonly cardIds: readonly string[];
  readonly cardViewsById: Readonly<Record<string, string>>;
  readonly playableByCardId: Readonly<
    Record<string, readonly InteractionDescriptor<Interaction>[]>
  >;
}

type ReadonlyProjection<Value> = Value extends readonly (infer Item)[]
  ? readonly ReadonlyProjection<Item>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: ReadonlyProjection<Value[Key]> }
    : Value;

export type SimultaneousPhaseSnapshot =
  ReadonlyProjection<Wire.SimultaneousPhaseProjection>;

export type {
  GameEventDetail,
  SystemActionEvent,
  GameEvent,
  OutcomeResult,
  OutcomeScoreComponent,
  OutcomeTieBreak,
  OutcomeStanding,
  GameOutcome,
} from "../domain/results.js";

export interface PluginGameplayFrame<
  View = unknown,
  Phase extends string = string,
  Stage extends string = string,
  Interaction extends string = string,
> {
  /** Latest committed public display-event batch. Reading a snapshot does not replay notifications. */
  readonly events: readonly GameEvent[];
  readonly basis: GameplayBasis;
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
  readonly zones: Readonly<Record<string, ZoneHandlesSnapshot<Interaction>>>;
}

export type ReducerSeatProjectionBundle =
  ReadonlyProjection<Wire.SeatProjectionBundle>;
export type ReducerBoardStaticProjection = Readonly<Wire.BoardStaticProjection>;
