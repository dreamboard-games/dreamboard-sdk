import type { z } from "zod";
import type { RuntimeTableRecord, SchemaLike } from "../table";
import type { ManifestContract } from "../manifest";
import type {
  PlayerIdOfState,
  TableOfState,
  SetupSelectionOfManifest,
} from "../extract";
import type { ReducerResult } from "../runtime";
import type {
  ActorSelector,
  BivariantCallback,
  PhaseEnterArgs,
  ScopedPhaseState,
} from "./runtime-args";
import type { EffectMap } from "./effects";
import type { InputCollector } from "./inputs";
import type {
  SimultaneousResolveArgs,
  SimultaneousSubmitSpec,
} from "./simultaneous";
import type {
  CardActionMap,
  InteractionMap,
  PhaseZoneList,
  StageMap,
} from "./interactions";

export type PhaseGuidance = {
  summary: string;
  objective?: string;
};

type PhaseDefinitionCommon<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  name?: string;
  guidance?: PhaseGuidance;
  state: PhaseStateSchema;
  initialState?: (ctx: {
    manifest: Manifest;
    state: State;
    playerIds: PlayerIdOfState<State>[];
    setup: SetupSelectionOfManifest<Manifest> | null;
  }) => z.infer<PhaseStateSchema>;
  enter?: BivariantCallback<
    PhaseEnterArgs<
      ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
      Manifest
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
> = PhaseDefinitionCommon<PhaseStateSchema, State, Manifest> & {
  kind: "auto";
  actor?: never;
  actors?: never;
  submit?: never;
  canResubmit?: never;
  resolve?: never;
  effects?: never;
  interactions?: never;
  stages?: never;
  zones?: never;
  cardActions?: never;
};

export type PlayerPhaseDefinition<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
  Effects extends EffectMap<State, Manifest> = Record<string, never>,
  Interactions extends InteractionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Stages extends StageMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Zones extends PhaseZoneList<Manifest> = readonly [],
  CardActions extends CardActionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
> = PhaseDefinitionCommon<PhaseStateSchema, State, Manifest> & {
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
  effects?: Effects;
  interactions?: Interactions;
  stages?: Stages;
  zones?: Zones;
  cardActions?: CardActions;
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
  Effects extends EffectMap<State, Manifest> = Record<string, never>,
  Interactions extends InteractionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Stages extends StageMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Zones extends PhaseZoneList<Manifest> = readonly [],
  CardActions extends CardActionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
> = PhaseDefinitionCommon<PhaseStateSchema, State, Manifest> & {
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
      Manifest
    >,
    ReducerResult<ScopedPhaseState<State, z.infer<PhaseStateSchema>>>
  >;
  effects?: Effects;
  interactions?: Interactions;
  stages?: Stages;
  zones?: Zones;
  cardActions?: CardActions;
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
  Effects extends EffectMap<State, Manifest> = Record<string, never>,
  Interactions extends InteractionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Stages extends StageMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Zones extends PhaseZoneList<Manifest> = readonly [],
  CardActions extends CardActionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
> =
  | AutoPhaseDefinition<PhaseStateSchema, State, Manifest>
  | PlayerPhaseDefinition<
      PhaseStateSchema,
      State,
      Manifest,
      Effects,
      Interactions,
      Stages,
      Zones,
      CardActions
    >
  | SimultaneousPlayerPhaseDefinition<
      PhaseStateSchema,
      State,
      Manifest,
      SubmitCollectors,
      Effects,
      Interactions,
      Stages,
      Zones,
      CardActions
    >;
