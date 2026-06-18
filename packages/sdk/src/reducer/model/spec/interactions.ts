import type { RuntimeTableRecord, SchemaLike } from "../table";
import type { ManifestContract } from "../manifest";
import type {
  CardIdOfState,
  CardTypeOfState,
  PlayerIdOfState,
  PlayerZoneIdOfManifest,
  TableOfState,
} from "../extract";
import type { ReducerResult } from "../runtime";
import type {
  ActionContext,
  ActorSelector,
  BivariantCallback,
  MutationRuntimeHelpers,
  PhaseEnterArgs,
  RuntimeHelpers,
  ValidationIssue,
} from "./runtime-args";
import type { ClientParamsOf, InputCollector, ParamsOf } from "./inputs";

export type InteractionReduceInput<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = {
  playerId: PlayerIdOfState<State>;
  params: ParamsOf<Collectors>;
};

export type InteractionValidateArgs<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  ErrorCode extends string = string,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State, ErrorCode> & {
    state: State;
    input: InteractionReduceInput<Collectors, State>;
  };

export type InteractionReduceArgs<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  ErrorCode extends string = string,
> = InteractionValidateArgs<Collectors, State, Manifest, ErrorCode> &
  MutationRuntimeHelpers;

export type InteractionAvailabilityArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State> & {
    state: State;
    input: { playerId: PlayerIdOfState<State> };
  };

export type InteractionRuleValidationResult<ErrorCode extends string = string> =
  | boolean
  | string
  | ValidationIssue<ErrorCode>
  | null
  | undefined;

export type InteractionRule<
  Collectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  } = {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  },
  Manifest extends ManifestContract<TableOfState<State>> = ManifestContract<
    TableOfState<State>
  >,
  ErrorCode extends string = string,
> = {
  /**
   * Stable rule id for diagnostics and tests. Rule ids are author-owned and
   * should be unique within one interaction.
   */
  id: string;
  /**
   * Error code used when the rule fails. The same code is used for descriptor
   * availability and submit-time validation unless `validate` returns a
   * specific ValidationIssue.
   */
  errorCode: ErrorCode;
  message?: string;
  /**
   * Projection-time rule. Runs without submitted params, so UI descriptors can
   * reflect action availability before the user clicks.
   */
  available?: BivariantCallback<
    InteractionAvailabilityArgs<State, Manifest>,
    boolean
  >;
  /**
   * Submit-time rule. Runs with parsed params and may return false, a concrete
   * ValidationIssue, null, or undefined.
   */
  validate?: BivariantCallback<
    InteractionValidateArgs<Collectors, State, Manifest, ErrorCode>,
    InteractionRuleValidationResult<ErrorCode>
  >;
};

export type InteractionCommitPolicy =
  | { mode: "manual" }
  | { mode: "autoWhenReady" };

type HasManyInputCollector<Collectors extends Record<string, InputCollector>> =
  Extract<
    Collectors[keyof Collectors],
    { readonly selection: { readonly mode: "many" } }
  > extends never
    ? false
    : true;

type InteractionCommitPolicyFor<
  Collectors extends Record<string, InputCollector>,
> =
  HasManyInputCollector<Collectors> extends true
    ? { mode: "manual" }
    : InteractionCommitPolicy;

/**
 * Projection-level interaction kind, derived by the trusted bundle from
 * collector shape:
 *
 * - `"action"`: any interaction whose inputs are ordinary collectors
 *   (`formInput`, `cardInput`).
 * - `"prompt"`: any interaction whose inputs include a `promptInput`
 *   collector. Prompt descriptors carry addressed-player context and options
 *   so UI primitives can render response controls without reducer-owned
 *   placement metadata.
 *
 * Authors never set this directly — the `promptInput(...)` collector is
 * the single source of truth for prompt semantics. See {@link promptInput}
 * and {@link InteractionDescriptor.kind}.
 */
export type InteractionKind = "action" | "prompt";

export type InteractionPresentation = {
  label: string;
  help?: string;
};

export type InteractionToArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> & {
  state: State;
};

export type InteractionSpec<
  Collectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  } = {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  },
  Manifest extends ManifestContract<TableOfState<State>> = ManifestContract<
    TableOfState<State>
  >,
  ErrorCode extends string = string,
> = {
  inputs: Collectors;
  paramsSchema?: SchemaLike<ClientParamsOf<Collectors>>;
  presentation?: InteractionPresentation;
  /** @internal Phase-local step gates are attached by `defineStepPhase`. */
  __steps?: readonly string[];
  /**
   * Draft commit policy. The input collectors still own value shape and
   * validation; this only controls whether a ready draft may be submitted
   * automatically by SDK controls.
   *
   * Multi-value collectors created with `many(...)` are always manual draft
   * interactions. They represent a selection set that should be committed by
   * explicit player intent, so `autoWhenReady` is intentionally not accepted.
   */
  commit?: InteractionCommitPolicyFor<Collectors>;
  /**
   * Addressed-player selector, used by prompt-kind interactions. When
   * present, the trusted bundle only emits this descriptor for players in
   * the returned set (or the single player, if a scalar is returned). Use
   * to thread e.g. `state.publicState.knowerPlayerId` through without
   * having to manage `activePlayers`. `undefined` / empty returns fall back
   * to the standard `activePlayers` gating used by action-kind interactions.
   */
  to?: BivariantCallback<
    InteractionToArgs<State, Manifest>,
    | PlayerIdOfState<State>
    | ReadonlyArray<PlayerIdOfState<State>>
    | null
    | undefined
  >;
  /**
   * Explicit actor selector. Overrides the phase-level actor for this
   * interaction. Prefer this over `to` for new non-prompt interactions; `to`
   * remains the prompt/addressee shorthand.
   */
  actor?: ActorSelector<State, Manifest>;
  /**
   * Descriptor visibility policy. `all` keeps non-actors visible but disabled;
   * `actorsOnly` suppresses descriptors for seats that cannot act.
   */
  visibility?: "all" | "actorsOnly";
  errorCodes?: readonly ErrorCode[];
  cost?: BivariantCallback<
    InteractionValidateArgs<Collectors, State, Manifest, ErrorCode>,
    Readonly<Record<string, number>>
  >;
  rules?: readonly InteractionRule<
    NoInfer<Collectors>,
    State,
    Manifest,
    ErrorCode
  >[];
  reduce: BivariantCallback<
    InteractionReduceArgs<Collectors, State, Manifest, ErrorCode>,
    ReducerResult<State>
  >;
};

export type CardActionSpec<
  Collectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  } = {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  },
  Manifest extends ManifestContract<TableOfState<State>> = ManifestContract<
    TableOfState<State>
  >,
  PlayFrom extends PlayerZoneIdOfManifest<Manifest> =
    PlayerZoneIdOfManifest<Manifest>,
  ErrorCode extends string = string,
> = {
  cardType: CardTypeOfState<State>;
  playFrom: PlayFrom;
  inputs?: Collectors;
  paramsSchema?: SchemaLike<Record<string, unknown>>;
  presentation?: InteractionPresentation;
  /** @internal Phase-local step gates are attached by `defineStepPhase`. */
  __steps?: readonly string[];
  /**
   * Draft commit policy. Card clicks still mutate the draft first;
   * `autoWhenReady` submits only once the full interaction draft validates.
   * Multi-value collectors created with `many(...)` are always manual draft
   * interactions and cannot opt into `autoWhenReady`.
   */
  commit?: InteractionCommitPolicyFor<Collectors>;
  actor?: ActorSelector<State, Manifest>;
  visibility?: "all" | "actorsOnly";
  errorCodes?: readonly ErrorCode[];
  cost?: BivariantCallback<
    InteractionValidateArgs<
      Collectors & { cardId: InputCollector<SchemaLike<CardIdOfState<State>>> },
      State,
      Manifest,
      ErrorCode
    >,
    Readonly<Record<string, number>>
  >;
  rules?: readonly InteractionRule<
    NoInfer<
      Collectors & {
        cardId: InputCollector<SchemaLike<CardIdOfState<State>>>;
      }
    >,
    State,
    Manifest,
    ErrorCode
  >[];
  reduce: BivariantCallback<
    InteractionReduceArgs<
      Collectors & { cardId: InputCollector<SchemaLike<CardIdOfState<State>>> },
      State,
      Manifest,
      ErrorCode
    >,
    ReducerResult<State>
  >;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyInteractionRule = Omit<
  InteractionRule<any, any, any, any>,
  "available" | "validate"
> & {
  available?: BivariantCallback<any, boolean>;
  validate?: BivariantCallback<any, InteractionRuleValidationResult<any>>;
};

export type AnyCardActionSpec<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Omit<
  CardActionSpec<any, State, Manifest, any, any>,
  "actor" | "cost" | "rules" | "reduce"
> & {
  actor?: BivariantCallback<any, any>;
  cost?: BivariantCallback<any, Readonly<Record<string, number>>>;
  rules?: readonly AnyInteractionRule[];
  reduce: BivariantCallback<any, ReducerResult<any>>;
};

export type CardActionMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, AnyCardActionSpec<State, Manifest>>;

/**
 * Type-safe erasure of {@link InteractionSpec} used by the runtime when it
 * stores heterogeneous interactions in a single map. The collectors generic is
 * intentionally erased with `any`: each authored interaction keeps a specific
 * params shape, but phase registries need to store all of them together.
 */
export type AnyInteractionSpec<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Omit<
  InteractionSpec<any, State, Manifest, any>,
  "actor" | "cost" | "rules" | "reduce" | "to"
> & {
  actor?: BivariantCallback<any, any>;
  cost?: BivariantCallback<any, Readonly<Record<string, number>>>;
  rules?: readonly AnyInteractionRule[];
  reduce: BivariantCallback<any, ReducerResult<any>>;
  to?: BivariantCallback<any, any>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export type InteractionMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, AnyInteractionSpec<State, Manifest>>;

export type StageSpec<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  when?: BivariantCallback<
    ActionContext<State, Manifest> & { state: State },
    boolean
  >;
  onEnter?: BivariantCallback<
    PhaseEnterArgs<State, Manifest>,
    ReducerResult<State> | void
  >;
  onExit?: BivariantCallback<
    PhaseEnterArgs<State, Manifest>,
    ReducerResult<State> | void
  >;
  allow: readonly string[];
};

export type StageMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, StageSpec<State, Manifest>>;

export type PhaseZoneList<
  Manifest extends ManifestContract<RuntimeTableRecord>,
> = readonly PlayerZoneIdOfManifest<Manifest>[];
