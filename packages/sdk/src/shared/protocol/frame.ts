import type { ProjectedTile } from "../seat-topology-schema.js";
import type { ViewCard } from "../domain/cards.js";
import type { ProjectedGameEvent } from "../domain/results.js";
import type * as Wire from "../runtime-types.js";

export type PlayerId = string;

export interface GameplayBasis {
  readonly sessionId: string;
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
  readonly tiles: readonly ProjectedTile[];
  readonly cardIds: readonly string[];
  /** Complete views of the cards the seat can see, by card id. */
  readonly cardViewsById: ReadonlyProjection<Record<string, ViewCard>>;
  /** Back image paths of the cards hidden from the seat, by positional id. */
  readonly cardBacksById: Readonly<Record<string, string>>;
  readonly playableByCardId: Readonly<
    Record<string, readonly InteractionDescriptor<Interaction>[]>
  >;
}

type ReadonlyProjection<Value> = Value extends
  string | number | boolean | null | undefined
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly ReadonlyProjection<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: ReadonlyProjection<Value[Key]> }
      : Value;

export type SimultaneousPhaseSnapshot =
  ReadonlyProjection<Wire.SimultaneousPhaseProjection>;

export type {
  ProjectedGameEventDetail as GameEventDetail,
  ProjectedGameEvent as SystemActionEvent,
  ProjectedGameEvent as GameEvent,
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
  /** Latest committed display-event batch admitted for this seat. Reading a snapshot does not replay notifications. */
  readonly events: readonly ProjectedGameEvent[];
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
  readonly zones: Readonly<
    Record<string, Readonly<Record<string, ZoneHandlesSnapshot<Interaction>>>>
  >;
}

export type ReducerSeatProjectionBundle =
  ReadonlyProjection<Wire.SeatProjectionBundle>;
