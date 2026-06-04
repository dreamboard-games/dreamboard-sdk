import type { z } from "zod";
import type {
  AnySchema,
  RuntimePayload,
  RuntimeTableRecord,
  StringKeyOf,
} from "./table";
import type {
  DeckIdOfState,
  PhaseNameOfState,
  PlayerIdOfState,
  PlayerIdOfTable,
  PlayerZoneIdOfState,
  RuntimeSetupSelection,
  TableOfState,
} from "./extract";
import type {
  EngineRollDieInstruction,
  EngineShufflePlayerZoneInstruction,
  EngineShuffleSharedZoneInstruction,
  FlowInstruction,
  RuntimeInstructionForState,
} from "../core/runtime-instruction";

// --- Continuation Tokens ---

export type ContinuationToken<
  Data = RuntimePayload,
  ContinuationId extends string = string,
  Response = RuntimePayload,
> = {
  id: ContinuationId;
  data: Data;
  readonly __responseType?: Response;
};

export type ContinuationResponseOf<Token> =
  Token extends ContinuationToken<any, string, infer Response>
    ? Response
    : never;

export type AnyContinuationToken = ContinuationToken<
  RuntimePayload,
  string,
  RuntimePayload
>;

// --- Shared authoring primitives ---

/**
 * Declarative choice option. Retained as the shape used by prompt-kind
 * interactions' `options` field (see `InteractionSpec.options` in
 * `model/spec.ts`). Independent of any specific prompt authoring API.
 */
export type ChoiceOption<OptionId extends string = string> = {
  id: OptionId;
  label: string;
};

// --- Runtime Flow & State ---

export type RuntimePhaseState = object;

export type PhaseAccessor<
  PhaseStates extends Record<string, object>,
  CurrentPhase extends keyof PhaseStates & string = keyof PhaseStates & string,
> = {
  get<PhaseName extends keyof PhaseStates & string>(
    phaseName: PhaseName,
  ): CurrentPhase extends PhaseName
    ? PhaseStates[PhaseName]
    : PhaseStates[PhaseName] | null;
};

export type PhasePayload<
  PhaseStates extends Record<string, object>,
  CurrentPhase extends keyof PhaseStates & string,
> = PhaseStates[CurrentPhase] & PhaseAccessor<PhaseStates, CurrentPhase>;

export type FlowState<PhaseName extends string, PlayerId extends string> = {
  currentPhase: PhaseName;
  turn: number;
  round: number;
  activePlayers: PlayerId[];
};

export type RuntimeRngState = {
  seed?: number | null;
  cursor: number;
  trace: string[];
};

export type RuntimeSimultaneousSubmission = {
  interactionId: string;
  params: RuntimePayload;
};

export type RuntimeSimultaneousState<
  PhaseName extends string,
  PlayerId extends string,
> = {
  current: {
    phaseName: PhaseName;
    actors: PlayerId[];
    submissions: Partial<Record<PlayerId, RuntimeSimultaneousSubmission>>;
  } | null;
};

/**
 * Marker tag attached by `defineEffect` to every effect spec. `fx.effect`
 * uses `type` to dispatch to the right wire-effect builder.
 */
export type EffectTypeTag =
  | "rollDie"
  | "shuffleSharedZone"
  | "shufflePlayerZone";

/**
 * Structural shape of the objects produced by `defineEffect`, as seen by
 * the `fx.effect` dispatcher. The public, per-type effect definitions live
 * in `model/spec.ts`.
 */
export type EffectSpecLike<ContextSchema extends AnySchema = AnySchema> = {
  type: EffectTypeTag;
  id: string;
  contextSchema?: ContextSchema;
  /**
   * Opaque authoring-time continuation callable. The runtime only needs its
   * `id`; the heterogeneously-typed `(data) => ...` signature is erased
   * here. The `data` parameter is typed as `never` so that this structural
   * upper bound is assignable-from every concrete per-effect continuation
   * (function parameters are contravariant — a specific `(data: T) => R`
   * is assignable to `(data: X) => R` only when `X <: T`, and `never <: T`
   * holds for every `T`).
   */
  __continuation?: ((data: never) => unknown) & { id: string };
};

/**
 * Options accepted by `fx.effect(effect, options)`, specialized by
 * `effect.type`.
 */
type EffectContextValue<Effect extends EffectSpecLike> =
  NonNullable<Effect["contextSchema"]> extends AnySchema
    ? z.infer<NonNullable<Effect["contextSchema"]>>
    : undefined;

export type EffectInvokeOptions<
  Effect extends EffectSpecLike,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = Effect["type"] extends "rollDie"
  ? {
      dieId: StringKeyOf<TableOfState<State>["dice"]>;
      context?: EffectContextValue<Effect>;
    }
  : Effect["type"] extends "shuffleSharedZone"
    ? {
        zoneId: DeckIdOfState<State>;
        context?: EffectContextValue<Effect>;
      }
    : Effect["type"] extends "shufflePlayerZone"
      ? {
          zoneId: PlayerZoneIdOfState<State>;
          playerId: PlayerIdOfState<State>;
          context?: EffectContextValue<Effect>;
        }
      : never;

type EffectInstructionForState<
  Effect extends EffectSpecLike,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = Effect["type"] extends "rollDie"
  ? EngineRollDieInstruction
  : Effect["type"] extends "shuffleSharedZone"
    ? EngineShuffleSharedZoneInstruction<DeckIdOfState<State>>
    : Effect["type"] extends "shufflePlayerZone"
      ? EngineShufflePlayerZoneInstruction<
          PlayerZoneIdOfState<State>,
          PlayerIdOfState<State>
        >
      : never;

export type ReducerFx<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = {
  transition: <To extends PhaseNameOfState<State>>(
    to: To,
  ) => FlowInstruction<To>;
  /**
   * Invoke an engine-side resumable effect authored via `defineEffect`.
   * The returned runtime instruction is consumed by the engine; if the effect
   * has a `reduce`, its continuation is delivered back as a typed input.
   */
  effect: <Effect extends EffectSpecLike>(
    effect: Effect,
    options: EffectInvokeOptions<Effect, State>,
  ) => EffectInstructionForState<Effect, State>;
};

// --- Composite State ---

export type RuntimeState<
  PhaseName extends string,
  PlayerId extends string,
  Setup extends RuntimeSetupSelection = RuntimeSetupSelection,
> = {
  rng: RuntimeRngState;
  setup: Setup | null;
  simultaneous: RuntimeSimultaneousState<PhaseName, PlayerId>;
  lastTransition: {
    from: PhaseName;
    to: PhaseName;
  } | null;
};

export type ReducerRuntimeStateForState<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Setup extends RuntimeSetupSelection = RuntimeSetupSelection,
> = RuntimeState<PhaseNameOfState<State>, PlayerIdOfState<State>, Setup>;

export type ReducerGameState<
  Table extends RuntimeTableRecord,
  PublicState extends object,
  PrivateState extends object,
  HiddenState extends object,
  PhaseState extends RuntimePhaseState,
  PhaseName extends string,
  PhaseStates extends Record<PhaseName, object> = Record<PhaseName, PhaseState>,
> = {
  table: Table;
  publicState: PublicState;
  privateState: Record<PlayerIdOfTable<Table>, PrivateState>;
  hiddenState: HiddenState;
  flow: FlowState<PhaseName, PlayerIdOfTable<Table>>;
  phase: PhaseState & PhaseAccessor<PhaseStates>;
};

export type ReducerSessionState<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Setup extends RuntimeSetupSelection = RuntimeSetupSelection,
> = {
  domain: State;
  runtime: ReducerRuntimeStateForState<State, Setup>;
};

// --- Results ---

export type ReducerValidationResult =
  | { valid: true }
  | { valid: false; errorCode: string; message?: string };

export type ReducerReject = {
  type: "reject";
  errorCode: string;
  message?: string;
};

export type ReducerAccept<State> = {
  type: "accept";
  state: State;
  instructions?: RuntimeInstructionForState<State>[];
};

export type ReducerResult<State> = ReducerAccept<State> | ReducerReject;
