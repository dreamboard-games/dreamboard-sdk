import type { GameEvent } from "../domain/results.js";
import type * as Wire from "../runtime-types.js";

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
  /**
   * Game image files by manifest path, such as `assets/cards/front.webp`.
   * Sources replace card `frontImage` and `backImage` paths with object URLs.
   */
  readonly assets?: Readonly<Record<string, Blob>>;
}

export type {
  InputDomain,
  InputSelection,
  InteractionCommitPolicy,
  InteractionChoiceOption,
  InteractionInputDescriptor,
  InteractionAvailability,
  InteractionDiagnosticReason,
} from "../interaction-schema.js";
import type { InteractionDescriptor as CanonicalInteractionDescriptor } from "../interaction-schema.js";
export type InteractionDescriptor<Interaction extends string = string> = Omit<
  CanonicalInteractionDescriptor,
  "interactionKey"
> & { readonly interactionKey: Interaction };
export type ActionInteractionDescriptor<Interaction extends string = string> =
  InteractionDescriptor<Interaction>;

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
  Interaction extends string = string,
> {
  /** Latest committed public display-event batch. Reading a snapshot does not replay notifications. */
  readonly events: readonly GameEvent[];
  readonly basis: GameplayBasis;
  readonly view: View | null;
  readonly flow: {
    readonly currentPhase: Phase | null;
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
