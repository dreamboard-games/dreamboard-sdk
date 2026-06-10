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
import type {
  ClientParamsOf,
  InputCollector,
  ParamsOf,
} from "./inputs";

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
  RuntimeHelpers<State> & {
    state: State;
    input: InteractionReduceInput<Collectors, State>;
  };

export type InteractionReduceArgs<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = InteractionValidateArgs<Collectors, State, Manifest> &
  MutationRuntimeHelpers;

export type InteractionAvailabilityArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State> & {
    state: State;
    input: { playerId: PlayerIdOfState<State> };
  };

export type InteractionRuleValidationResult =
  | boolean
  | ValidationIssue
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
  errorCode: string;
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
    InteractionRuleValidationResult
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
> = {
  inputs: Collectors;
  paramsSchema?: SchemaLike<ClientParamsOf<Collectors>>;
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
  errorCodes?: readonly string[];
  cost?: BivariantCallback<
    InteractionValidateArgs<Collectors, State, Manifest>,
    Readonly<Record<string, number>>
  >;
  rules?: readonly InteractionRule<NoInfer<Collectors>, State, Manifest>[];
  reduce: BivariantCallback<
    InteractionReduceArgs<Collectors, State, Manifest>,
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
> = {
  cardType: CardTypeOfState<State>;
  playFrom: PlayFrom;
  inputs?: Collectors;
  paramsSchema?: SchemaLike<Record<string, unknown>>;
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
  errorCodes?: readonly string[];
  cost?: BivariantCallback<
    InteractionValidateArgs<
      Collectors & { cardId: InputCollector<SchemaLike<CardIdOfState<State>>> },
      State,
      Manifest
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
    Manifest
  >[];
  reduce: BivariantCallback<
    InteractionReduceArgs<
      Collectors & { cardId: InputCollector<SchemaLike<CardIdOfState<State>>> },
      State,
      Manifest
    >,
    ReducerResult<State>
  >;
};

export type AnyCardActionSpec<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = CardActionSpec<Record<string, InputCollector>, State, Manifest>;

export type CardActionMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, AnyCardActionSpec<State, Manifest>>;

/**
 * Type-safe erasure of {@link InteractionSpec} used by the runtime when it
 * stores heterogeneous interactions in a single map. The collectors generic
 * is erased to the structural upper bound (`Record<string, InputCollector>`)
 * so that lookups and metadata helpers can iterate collectors without
 * committing to a specific authoring-time shape.
 */
export type AnyInteractionSpec<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = InteractionSpec<Record<string, InputCollector>, State, Manifest>;

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
