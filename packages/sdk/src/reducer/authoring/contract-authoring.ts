import type { z } from "zod";
import type {
  CardActionMap,
  CardActionSpec,
  CardIdOfManifest,
  CardIdOfState,
  EffectMap,
  InputCollector,
  InteractionMap,
  InteractionRule,
  InteractionSpec,
  PhaseDefinition,
  PhaseMapOf,
  PhaseNameOfContract,
  PhaseSchemasOfContract,
  PhaseZoneList,
  PlayerIdOfState,
  PlayerZoneIdOfManifest,
  SchemaLike,
  ScopedPhaseState,
  SetupSelectionOfManifest,
  StageMap,
  StaticViewDefinition,
  TableOfManifest,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledSpaceIdOfTable,
  TiledVertexIdOfTable,
  ViewDefinition,
  ViewMapOf,
} from "../model";
import type {
  BoardTargetBuilder,
  BoardTargetRule,
  CardTargetBuilder,
  CardTargetRule,
  ChoiceOptionsFactory,
  ChoiceTargetBuilder,
  ChoiceTargetOption,
  ChoiceTargetRule,
  InputFieldRef,
  PlayerBoardSpaceTarget,
} from "../inputs";
import {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  choiceTarget,
  formInput,
  promptInput,
  rngInput,
} from "../inputs";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
  InferPhaseState,
} from "./types";
import { defineGame } from "./game";
import {
  defineCardAction,
  defineInteraction,
  defineInteractionRule,
} from "./interaction";
import {
  definePhase,
  defineStepPhase,
  type StepPhaseCardActionMap,
  type StepPhaseInteractionMap,
  type StepPhaseState,
  type UnwrappedStepCardActions,
  type UnwrappedStepInteractions,
} from "./phase";
import { defineStaticView, defineView } from "./view-stage";

export type ContractWithPhases = AnyReducerGameContract & {
  readonly phases: Record<string, SchemaLike<object>>;
};

type BoundState<Contract extends ContractWithPhases> = ContractState<Contract>;

type BoundManifest<Contract extends ContractWithPhases> =
  ContractManifest<Contract>;

type BoundTable<Contract extends ContractWithPhases> = TableOfManifest<
  BoundManifest<Contract>
>;

type BoundPhaseState<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
> = ScopedPhaseState<BoundState<Contract>, z.infer<PhaseStateSchema>>;

type BoundFormInputs<Contract extends ContractWithPhases> = ReturnType<
  typeof formInput.forState<BoundState<Contract>>
>;

type BoundBoardInputs<Contract extends ContractWithPhases> = {
  vertex<
    Id extends string = TiledVertexIdOfTable<
      BoundTable<Contract>,
      TiledBoardIdOfTable<BoundTable<Contract>>
    >,
  >(options: {
    target: BoardTargetRule<BoundState<Contract>, Id>;
    dependsOn?: readonly InputFieldRef<string, unknown>[];
  }): InputCollector<z.ZodType<Id>, BoundState<Contract>, "board-vertex">;
  edge<
    Id extends string = TiledEdgeIdOfTable<
      BoundTable<Contract>,
      TiledBoardIdOfTable<BoundTable<Contract>>
    >,
  >(options: {
    target: BoardTargetRule<BoundState<Contract>, Id>;
    dependsOn?: readonly InputFieldRef<string, unknown>[];
  }): InputCollector<z.ZodType<Id>, BoundState<Contract>, "board-edge">;
  tile<Id extends string = string>(options: {
    target: BoardTargetRule<BoundState<Contract>, Id>;
    dependsOn?: readonly InputFieldRef<string, unknown>[];
  }): InputCollector<z.ZodType<Id>, BoundState<Contract>, "board-tile">;
  space<
    Id extends string = TiledSpaceIdOfTable<
      BoundTable<Contract>,
      TiledBoardIdOfTable<BoundTable<Contract>>
    >,
  >(options: {
    target: BoardTargetRule<BoundState<Contract>, Id>;
    dependsOn?: readonly InputFieldRef<string, unknown>[];
  }): InputCollector<z.ZodType<Id>, BoundState<Contract>, "board-space">;
  playerSpace<
    BoardId extends string = string,
    SpaceId extends string = string,
    PlayerId extends string = PlayerIdOfState<BoundState<Contract>>,
  >(options: {
    target: BoardTargetRule<
      BoundState<Contract>,
      PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerId>
    >;
    dependsOn?: readonly InputFieldRef<string, unknown>[];
  }): InputCollector<
    z.ZodType<PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerId>>,
    BoundState<Contract>,
    "board-space"
  >;
};

type BoundCardInput<Contract extends ContractWithPhases> = <
  Id extends string = CardIdOfManifest<BoundManifest<Contract>>,
  const ZoneIds extends readonly string[] = readonly string[],
>(options: {
  target: CardTargetRule<BoundState<Contract>, Id, ZoneIds>;
  dependsOn?: readonly InputFieldRef<string, unknown>[];
}) => InputCollector<z.ZodType<Id>, BoundState<Contract>, "card"> & {
  readonly meta: {
    readonly zoneId: ZoneIds[number];
    readonly zoneIds: ZoneIds;
    readonly targetKind: "card";
  };
};

type BoundPromptInput<Contract extends ContractWithPhases> = <
  Schema extends SchemaLike<unknown>,
>(options: {
  schema: Schema;
  target?: ChoiceTargetRule<
    BoundState<Contract>,
    Extract<Schema extends z.ZodType<infer Value> ? Value : never, string>
  >;
}) => InputCollector<Schema, BoundState<Contract>, "prompt">;

type BoundRngInputs<Contract extends ContractWithPhases> = {
  d6(count?: number): ReturnType<typeof rngInput.d6<BoundState<Contract>>>;
  coin(): ReturnType<typeof rngInput.coin<BoundState<Contract>>>;
};

type BoundChoiceTarget<Contract extends ContractWithPhases> = {
  options<Id extends string>(
    options:
      | ReadonlyArray<ChoiceTargetOption<Id>>
      | ChoiceOptionsFactory<BoundState<Contract>, Id>,
  ): ChoiceTargetBuilder<BoundState<Contract>, Id>;
};

type BoundBoardTarget<Contract extends ContractWithPhases> = {
  edge<Id extends string = string>(
    boardId: string,
  ): BoardTargetBuilder<BoundState<Contract>, Id>;
  vertex<Id extends string = string>(
    boardId: string,
  ): BoardTargetBuilder<BoundState<Contract>, Id>;
  space<Id extends string = string>(
    boardId: string,
  ): BoardTargetBuilder<BoundState<Contract>, Id>;
  tile<Id extends string = string>(
    boardId: string,
  ): BoardTargetBuilder<BoundState<Contract>, Id>;
  playerSpace<
    BoardId extends string,
    SpaceId extends string,
    PlayerId extends string = PlayerIdOfState<BoundState<Contract>>,
  >(
    boardId: BoardId,
  ): BoardTargetBuilder<
    BoundState<Contract>,
    PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerId>
  >;
};

type BoundCardTarget<Contract extends ContractWithPhases> = {
  zones<
    Id extends string = CardIdOfState<BoundState<Contract>>,
    const ZoneIds extends readonly string[] = readonly string[],
  >(
    zoneIds: ZoneIds,
  ): CardTargetBuilder<BoundState<Contract>, Id, ZoneIds>;
};

export type BoundInputBuilders<Contract extends ContractWithPhases> = {
  readonly board: BoundBoardInputs<Contract>;
  readonly boardTarget: BoundBoardTarget<Contract>;
  readonly card: BoundCardInput<Contract>;
  readonly cardTarget: BoundCardTarget<Contract>;
  readonly choiceTarget: BoundChoiceTarget<Contract>;
  readonly form: BoundFormInputs<Contract>;
  readonly prompt: BoundPromptInput<Contract>;
  readonly rng: BoundRngInputs<Contract>;
};

type StepPhaseInput<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
  Steps extends readonly [string, ...string[]],
  SubmitCollectors extends Record<string, InputCollector>,
  Effects extends EffectMap<BoundState<Contract>, BoundManifest<Contract>>,
  Interactions extends StepPhaseInteractionMap<
    Steps[number],
    ScopedPhaseState<
      BoundState<Contract>,
      StepPhaseState<PhaseStateSchema, Steps>
    >,
    BoundManifest<Contract>
  >,
  Stages extends StageMap<
    ScopedPhaseState<
      BoundState<Contract>,
      StepPhaseState<PhaseStateSchema, Steps>
    >,
    BoundManifest<Contract>
  >,
  Zones extends PhaseZoneList<BoundManifest<Contract>>,
  CardActions extends StepPhaseCardActionMap<
    Steps[number],
    ScopedPhaseState<
      BoundState<Contract>,
      StepPhaseState<PhaseStateSchema, Steps>
    >,
    BoundManifest<Contract>
  >,
> = Omit<
  PhaseDefinition<
    PhaseStateSchema,
    BoundState<Contract>,
    BoundManifest<Contract>,
    SubmitCollectors,
    Effects,
    UnwrappedStepInteractions<
      ScopedPhaseState<
        BoundState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      BoundManifest<Contract>,
      Interactions
    >,
    Stages,
    Zones,
    UnwrappedStepCardActions<
      ScopedPhaseState<
        BoundState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      BoundManifest<Contract>,
      CardActions
    >
  >,
  "state" | "initialState" | "interactions" | "cardActions"
> & {
  steps: Steps;
  state?: never;
  initialState?: (ctx: {
    manifest: BoundManifest<Contract>;
    state: BoundState<Contract>;
    playerIds: PlayerIdOfState<BoundState<Contract>>[];
    setup: SetupSelectionOfManifest<BoundManifest<Contract>> | null;
  }) => InferPhaseState<PhaseStateSchema>;
  interactions?: Interactions;
  cardActions?: CardActions;
};

export type PhaseAuthoring<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
> = {
  interaction<Collectors extends Record<string, InputCollector>>(
    spec: InteractionSpec<
      Collectors,
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>
    >,
  ): InteractionSpec<
    Collectors,
    BoundPhaseState<Contract, PhaseStateSchema>,
    BoundManifest<Contract>
  >;
  cardAction<
    Collectors extends Record<string, InputCollector> = Record<string, never>,
    const PlayFrom extends PlayerZoneIdOfManifest<BoundManifest<Contract>> =
      PlayerZoneIdOfManifest<BoundManifest<Contract>>,
  >(
    spec: CardActionSpec<
      Collectors,
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>,
      PlayFrom
    >,
  ): CardActionSpec<
    Collectors,
    BoundPhaseState<Contract, PhaseStateSchema>,
    BoundManifest<Contract>,
    PlayFrom
  >;
  rule<
    Collectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
  >(
    rule: InteractionRule<
      Collectors,
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>
    >,
  ): InteractionRule<
    Collectors,
    BoundPhaseState<Contract, PhaseStateSchema>,
    BoundManifest<Contract>
  >;
  define<
    SubmitCollectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
    Effects extends EffectMap<BoundState<Contract>, BoundManifest<Contract>> =
      Record<string, never>,
    Interactions extends InteractionMap<
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>
    > = Record<string, never>,
    Stages extends StageMap<
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>
    > = Record<string, never>,
    const Zones extends PhaseZoneList<BoundManifest<Contract>> = readonly [],
    CardActions extends CardActionMap<
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>
    > = Record<string, never>,
  >(
    definition: Omit<
      PhaseDefinition<
        PhaseStateSchema,
        BoundState<Contract>,
        BoundManifest<Contract>,
        SubmitCollectors,
        Effects,
        Interactions,
        Stages,
        Zones,
        CardActions
      >,
      "state"
    >,
  ): PhaseDefinition<
    PhaseStateSchema,
    BoundState<Contract>,
    BoundManifest<Contract>,
    SubmitCollectors,
    Effects,
    Interactions,
    Stages,
    Zones,
    CardActions
  >;
  stepPhase<
    const Steps extends readonly [string, ...string[]],
    SubmitCollectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
    Effects extends EffectMap<BoundState<Contract>, BoundManifest<Contract>> =
      Record<string, never>,
    Interactions extends StepPhaseInteractionMap<
      Steps[number],
      ScopedPhaseState<
        BoundState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      BoundManifest<Contract>
    > = Record<string, never>,
    Stages extends StageMap<
      ScopedPhaseState<
        BoundState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      BoundManifest<Contract>
    > = Record<string, never>,
    const Zones extends PhaseZoneList<BoundManifest<Contract>> = readonly [],
    CardActions extends StepPhaseCardActionMap<
      Steps[number],
      ScopedPhaseState<
        BoundState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      BoundManifest<Contract>
    > = Record<string, never>,
  >(
    definition: StepPhaseInput<
      Contract,
      PhaseStateSchema,
      Steps,
      SubmitCollectors,
      Effects,
      Interactions,
      Stages,
      Zones,
      CardActions
    >,
  ): PhaseDefinition<
    SchemaLike<StepPhaseState<PhaseStateSchema, Steps>>,
    BoundState<Contract>,
    BoundManifest<Contract>,
    SubmitCollectors,
    Effects,
    UnwrappedStepInteractions<
      ScopedPhaseState<
        BoundState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      BoundManifest<Contract>,
      Interactions
    >,
    Stages,
    Zones,
    UnwrappedStepCardActions<
      ScopedPhaseState<
        BoundState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      BoundManifest<Contract>,
      CardActions
    >
  >;
  readonly inputs: BoundInputBuilders<Contract>;
};

export type ContractAuthoring<Contract extends ContractWithPhases> = {
  readonly contract: Contract;
  game<
    Definitions extends PhaseMapOf<Contract>,
    Views extends ViewMapOf<Contract> = Record<string, never>,
  >(
    definition: Omit<
      import("../model").ReducerGameDefinition<Contract, Definitions, Views>,
      "contract"
    >,
  ): import("../model").ReducerGameDefinition<Contract, Definitions, Views>;
  view<Projection>(
    definition: ViewDefinition<
      BoundState<Contract>,
      BoundManifest<Contract>,
      Projection
    >,
  ): ViewDefinition<BoundState<Contract>, BoundManifest<Contract>, Projection>;
  staticView<Projection>(
    definition: StaticViewDefinition<
      import("../model").ExactManifestContractOf<Contract>,
      Projection
    >,
  ): StaticViewDefinition<
    import("../model").ExactManifestContractOf<Contract>,
    Projection
  >;
  phase<Name extends PhaseNameOfContract<Contract>>(
    name: Name,
  ): PhaseAuthoring<Contract, PhaseSchemasOfContract<Contract>[Name]>;
};

function createBoundInputBuilders<
  Contract extends ContractWithPhases,
>(): BoundInputBuilders<Contract> {
  return {
    board: boardInput as BoundBoardInputs<Contract>,
    boardTarget: boardTarget as unknown as BoundBoardTarget<Contract>,
    card: cardInput as BoundCardInput<Contract>,
    cardTarget: cardTarget as BoundCardTarget<Contract>,
    choiceTarget: choiceTarget as BoundChoiceTarget<Contract>,
    form: formInput.forState<BoundState<Contract>>(),
    prompt: promptInput as BoundPromptInput<Contract>,
    rng: rngInput as BoundRngInputs<Contract>,
  };
}

function createPhaseAuthoring<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
>(
  _contract: Contract,
  schema: PhaseStateSchema,
): PhaseAuthoring<Contract, PhaseStateSchema> {
  return {
    interaction: (spec) =>
      defineInteraction<Contract, PhaseStateSchema>()(
        spec as Parameters<
          ReturnType<typeof defineInteraction<Contract, PhaseStateSchema>>
        >[0],
      ) as typeof spec,
    cardAction: (spec) =>
      defineCardAction<Contract, PhaseStateSchema>()(
        spec as Parameters<
          ReturnType<typeof defineCardAction<Contract, PhaseStateSchema>>
        >[0],
      ) as typeof spec,
    rule: (rule) =>
      defineInteractionRule<Contract, PhaseStateSchema>()(
        rule as Parameters<
          ReturnType<typeof defineInteractionRule<Contract, PhaseStateSchema>>
        >[0],
      ) as typeof rule,
    define: (definition) =>
      definePhase<Contract>()({
        ...definition,
        state: schema,
      } as Parameters<ReturnType<typeof definePhase<Contract>>>[0]) as never,
    stepPhase: (definition) =>
      defineStepPhase<Contract>()({
        ...definition,
        state: schema,
      } as Parameters<
        ReturnType<typeof defineStepPhase<Contract>>
      >[0]) as never,
    inputs: createBoundInputBuilders<Contract>(),
  };
}

export function createContractAuthoring<
  const Contract extends ContractWithPhases,
>(contract: Contract): ContractAuthoring<Contract> {
  const phaseCache = new Map<string, unknown>();
  return {
    contract,
    game: (definition) => defineGame({ contract, ...definition }),
    view: (definition) => defineView<Contract>()(definition),
    staticView: (definition) => defineStaticView<Contract>()(definition),
    phase: (name) => {
      const cached = phaseCache.get(name);
      if (cached) return cached as never;
      const schema = contract.phases[name];
      const bound = createPhaseAuthoring(contract, schema);
      phaseCache.set(name, bound);
      return bound as never;
    },
  };
}
