import type { z } from "zod";
import type { RuntimeTableRecord, SchemaLike, RuntimeRecord } from "../table";
import type { ManifestContract } from "../manifest";
import type { PlayerIdOfState, TableOfState } from "../extract";
import type { ReducerResult } from "../runtime";
import type {
  ActorSelector,
  BivariantCallback,
  PhaseEnterArgs,
  ScopedPhaseState,
} from "./runtime-args";
import type { InputCollector } from "./inputs";
import type {
  SimultaneousResolveArgs,
  SimultaneousSubmitSpec,
} from "./simultaneous";
import type { InteractionMap } from "./interactions";

type PhaseDefinitionCommon<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
  ErrorCode extends string = string,
  Options extends RuntimeRecord = RuntimeRecord,
> = {
  name?: string;
  state: PhaseStateSchema;
  initialState?: (ctx: {
    manifest: Manifest;
    state: State;
    playerIds: PlayerIdOfState<State>[];
    options: Options;
  }) => z.infer<PhaseStateSchema>;
  enter?: BivariantCallback<
    PhaseEnterArgs<
      ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
      Manifest,
      ErrorCode
    >,
    ReducerResult<ScopedPhaseState<State, z.infer<PhaseStateSchema>>> | void
  >;
};

export type AutoPhaseDefinition<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
  ErrorCode extends string = string,
  Options extends RuntimeRecord = RuntimeRecord,
> = PhaseDefinitionCommon<
  PhaseStateSchema,
  State,
  Manifest,
  ErrorCode,
  Options
> & {
  kind: "auto";
  actor?: never;
  actors?: never;
  submit?: never;
  canResubmit?: never;
  resolve?: never;
  interactions?: never;
};

export type PlayerPhaseDefinition<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
  Interactions extends InteractionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Options extends RuntimeRecord = RuntimeRecord,
  ErrorCode extends string = string,
> = PhaseDefinitionCommon<
  PhaseStateSchema,
  State,
  Manifest,
  ErrorCode,
  Options
> & {
  kind: "player";
  /**
   * Default actor selector for interactions in this phase. When omitted the
   * runtime falls back to `flow.activePlayers`, preserving the existing turn
   * ownership model. Returning multiple players models simultaneous actors.
   */
  actor?: ActorSelector<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  >;
  actors?: never;
  submit?: never;
  canResubmit?: never;
  resolve?: never;
  interactions?: Interactions;
};

export type SimultaneousPlayerPhaseDefinition<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
  SubmitCollectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  Interactions extends InteractionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Options extends RuntimeRecord = RuntimeRecord,
  ErrorCode extends string = string,
> = PhaseDefinitionCommon<
  PhaseStateSchema,
  State,
  Manifest,
  ErrorCode,
  Options
> & {
  kind: "simultaneousPlayer";
  actor?: never;
  /**
   * Actor selector for `kind: "simultaneousPlayer"` phases. This is an alias
   * of `actor` with wording that matches simultaneous submission semantics.
   */
  actors: ActorSelector<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  >;
  /**
   * Canonical sealed submission interaction for simultaneous phases. It is
   * projected like a normal interaction, but the trusted runtime stores the
   * parsed params until every actor has submitted, then calls `resolve`.
   */
  submit: SimultaneousSubmitSpec<
    SubmitCollectors,
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  >;
  /**
   * When false or omitted, each actor can submit once per simultaneous
   * barrier. Set true to allow replacing the sealed submission before every
   * required actor has submitted.
   */
  canResubmit?: boolean;
  /**
   * Batch resolver invoked once all simultaneous actors have submitted. The
   * submitted params are passed together so game state mutates from one
   * deterministic base state instead of one player at a time.
   */
  resolve: BivariantCallback<
    SimultaneousResolveArgs<
      SubmitCollectors,
      ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
      Manifest,
      ErrorCode
    >,
    ReducerResult<ScopedPhaseState<State, z.infer<PhaseStateSchema>>> | void
  >;
  interactions?: Interactions;
};

export type PhaseDefinition<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
  SubmitCollectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  Interactions extends InteractionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Options extends RuntimeRecord = RuntimeRecord,
  ErrorCode extends string = string,
> =
  | AutoPhaseDefinition<PhaseStateSchema, State, Manifest, ErrorCode, Options>
  | PlayerPhaseDefinition<
      PhaseStateSchema,
      State,
      Manifest,
      Interactions,
      Options,
      ErrorCode
    >
  | SimultaneousPlayerPhaseDefinition<
      PhaseStateSchema,
      State,
      Manifest,
      SubmitCollectors,
      Interactions,
      Options,
      ErrorCode
    >;
