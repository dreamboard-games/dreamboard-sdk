import type { StepDefinition } from "../../authoring/steps";
import type { RuntimeTableRecord, SchemaLike } from "../table";
import type { ManifestContract } from "../manifest";
import type { PlayerIdOfState, TableOfState } from "../extract";
import type { ReducerResult } from "../runtime";
import type {
  ActionContext,
  ActorSelector,
  BivariantCallback,
  MutationHelpers,
  ReadHelpers,
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
> = ActionContext<State, Manifest> &
  ReadHelpers<State> & {
    state: State;
    input: {
      playerId: PlayerIdOfState<State>;
      params: ClientParamsOf<Collectors>;
    };
  };

export type InteractionReduceArgs<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  ErrorCode extends string = string,
> = Omit<InteractionValidateArgs<Collectors, State, Manifest>, "input"> & {
  input: InteractionReduceInput<Collectors, State>;
} & MutationHelpers<State, ErrorCode>;

export type InteractionAvailabilityArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  ReadHelpers<State> & {
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
    InteractionValidateArgs<Collectors, State, Manifest>,
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

export type InteractionKind = "action";

export type InteractionPresentation = {
  label: string;
  help?: string;
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
> = (
  | { inputs: Collectors; steps?: never }
  | { inputs?: never; steps: StepDefinition<Collectors> }
) & {
  paramsSchema?: SchemaLike<ClientParamsOf<Collectors>>;
  presentation?: InteractionPresentation;
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
  /** Overrides the phase actor and limits input domains to the selected seats. */
  actor?: ActorSelector<State, Manifest>;
  errorCodes?: readonly ErrorCode[];
  rules?: readonly InteractionRule<
    NoInfer<Collectors>,
    State,
    Manifest,
    ErrorCode
  >[];
  reduce: BivariantCallback<
    InteractionReduceArgs<Collectors, State, Manifest, ErrorCode>,
    ReducerResult<State> | void
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
  "actor" | "rules" | "reduce"
> & {
  actor?: BivariantCallback<any, any>;
  rules?: readonly AnyInteractionRule[];
  reduce: BivariantCallback<any, ReducerResult<any> | void>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export type InteractionMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, AnyInteractionSpec<State, Manifest>>;
