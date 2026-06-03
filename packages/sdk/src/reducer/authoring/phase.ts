import { z } from "zod";
import type {
  AnyCardActionSpec,
  AnyInteractionSpec,
  CardActionMap,
  EffectMap,
  InputCollector,
  ManifestContract,
  PhaseDefinition,
  PhaseZoneList,
  PlayerIdOfState,
  RuntimeTableRecord,
  SchemaLike,
  ScopedPhaseState,
  SetupSelectionOfManifest,
  StageMap,
  TableOfState,
} from "../model";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
} from "./types";

type StepPhaseState<
  PhaseStateSchema extends SchemaLike<object>,
  Steps extends readonly string[],
> = z.infer<PhaseStateSchema> & { step: Steps[number] };

type StepPhaseInteractionEntry<Step extends string, Interaction> = {
  steps: readonly Step[];
  interaction: Interaction;
};

type StepPhaseCardActionEntry<Step extends string, Action> = {
  steps: readonly Step[];
  action: Action;
};

type StepPhaseInteractionMap<
  Step extends string,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<
  string,
  StepPhaseInteractionEntry<Step, AnyInteractionSpec<State, Manifest>>
>;

type StepPhaseCardActionMap<
  Step extends string,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<
  string,
  StepPhaseCardActionEntry<Step, AnyCardActionSpec<State, Manifest>>
>;

type UnwrappedStepInteractions<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  Interactions extends Record<
    string,
    StepPhaseInteractionEntry<string, AnyInteractionSpec<State, Manifest>>
  >,
> = {
  [Key in keyof Interactions]: Interactions[Key]["interaction"];
};

type UnwrappedStepCardActions<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  CardActions extends Record<
    string,
    StepPhaseCardActionEntry<string, AnyCardActionSpec<State, Manifest>>
  >,
> = {
  [Key in keyof CardActions]: CardActions[Key]["action"];
};

function stepStateSchema<Steps extends readonly [string, ...string[]]>(
  schema: SchemaLike<object>,
  steps: Steps,
): SchemaLike<object> {
  const stepSchema = z.enum(steps);
  const maybeObject = schema as {
    extend?: (shape: { step: typeof stepSchema }) => SchemaLike<object>;
  };
  if (typeof maybeObject.extend === "function") {
    return maybeObject.extend({ step: stepSchema });
  }
  return z.intersection(schema, z.object({ step: stepSchema }));
}

function unwrapStepInteractions<
  Step extends string,
  Interactions extends Record<string, StepPhaseInteractionEntry<Step, unknown>>,
>(interactions: Interactions | undefined) {
  if (!interactions) return undefined;
  return Object.fromEntries(
    Object.entries(interactions).map(([key, entry]) => [
      key,
      {
        ...(entry.interaction as object),
        __steps: entry.steps,
      },
    ]),
  );
}

function unwrapStepCardActions<
  Step extends string,
  CardActions extends Record<string, StepPhaseCardActionEntry<Step, unknown>>,
>(cardActions: CardActions | undefined) {
  if (!cardActions) return undefined;
  return Object.fromEntries(
    Object.entries(cardActions).map(([key, entry]) => [
      key,
      {
        ...(entry.action as object),
        __steps: entry.steps,
      },
    ]),
  );
}

export function definePhase<Contract extends AnyReducerGameContract>() {
  return <
    PhaseStateSchema extends SchemaLike<object>,
    SubmitCollectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
    Effects extends EffectMap<
      ContractState<Contract>,
      ContractManifest<Contract>
    > = Record<string, never>,
    Interactions extends Record<
      string,
      AnyInteractionSpec<
        ScopedPhaseState<ContractState<Contract>, z.infer<PhaseStateSchema>>,
        ContractManifest<Contract>
      >
    > = Record<string, never>,
    Stages extends StageMap<
      ScopedPhaseState<ContractState<Contract>, z.infer<PhaseStateSchema>>,
      ContractManifest<Contract>
    > = Record<string, never>,
    const Zones extends PhaseZoneList<ContractManifest<Contract>> = readonly [],
    CardActions extends CardActionMap<
      ScopedPhaseState<ContractState<Contract>, z.infer<PhaseStateSchema>>,
      ContractManifest<Contract>
    > = Record<string, never>,
  >(
    definition: PhaseDefinition<
      PhaseStateSchema,
      ContractState<Contract>,
      ContractManifest<Contract>,
      SubmitCollectors,
      Effects,
      Interactions,
      Stages,
      Zones,
      CardActions
    >,
  ): PhaseDefinition<
    PhaseStateSchema,
    ContractState<Contract>,
    ContractManifest<Contract>,
    SubmitCollectors,
    Effects,
    Interactions,
    Stages,
    Zones,
    CardActions
  > => {
    return definition;
  };
}

export function defineStepPhase<Contract extends AnyReducerGameContract>() {
  return <
    const Steps extends readonly [string, ...string[]],
    PhaseStateSchema extends SchemaLike<object>,
    SubmitCollectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
    Effects extends EffectMap<
      ContractState<Contract>,
      ContractManifest<Contract>
    > = Record<string, never>,
    Interactions extends StepPhaseInteractionMap<
      Steps[number],
      ScopedPhaseState<
        ContractState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      ContractManifest<Contract>
    > = Record<string, never>,
    Stages extends StageMap<
      ScopedPhaseState<
        ContractState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      ContractManifest<Contract>
    > = Record<string, never>,
    const Zones extends PhaseZoneList<ContractManifest<Contract>> = readonly [],
    CardActions extends StepPhaseCardActionMap<
      Steps[number],
      ScopedPhaseState<
        ContractState<Contract>,
        StepPhaseState<PhaseStateSchema, Steps>
      >,
      ContractManifest<Contract>
    > = Record<string, never>,
  >(
    definition: Omit<
      PhaseDefinition<
        PhaseStateSchema,
        ContractState<Contract>,
        ContractManifest<Contract>,
        SubmitCollectors,
        Effects,
        UnwrappedStepInteractions<
          ScopedPhaseState<
            ContractState<Contract>,
            StepPhaseState<PhaseStateSchema, Steps>
          >,
          ContractManifest<Contract>,
          Interactions
        >,
        Stages,
        Zones,
        UnwrappedStepCardActions<
          ScopedPhaseState<
            ContractState<Contract>,
            StepPhaseState<PhaseStateSchema, Steps>
          >,
          ContractManifest<Contract>,
          CardActions
        >
      >,
      "state" | "initialState" | "interactions" | "cardActions"
    > & {
      steps: Steps;
      state: PhaseStateSchema;
      initialState?: (ctx: {
        manifest: ContractManifest<Contract>;
        state: ContractState<Contract>;
        playerIds: PlayerIdOfState<ContractState<Contract>>[];
        setup: SetupSelectionOfManifest<ContractManifest<Contract>> | null;
      }) => z.infer<PhaseStateSchema>;
      interactions?: Interactions;
      cardActions?: CardActions;
    },
  ) => {
    const [initialStep] = definition.steps;
    const state = stepStateSchema(definition.state, definition.steps);
    const initialState = definition.initialState
      ? (ctx: Parameters<NonNullable<typeof definition.initialState>>[0]) => ({
          ...definition.initialState?.(ctx),
          step: initialStep,
        })
      : () => ({ step: initialStep });
    const { steps: _steps, ...rest } = definition;
    void _steps;
    const normalized = {
      ...rest,
      state,
      initialState,
      interactions: unwrapStepInteractions(definition.interactions),
      cardActions: unwrapStepCardActions(definition.cardActions),
    };
    return normalized as unknown as PhaseDefinition<
      SchemaLike<StepPhaseState<PhaseStateSchema, Steps>>,
      ContractState<Contract>,
      ContractManifest<Contract>,
      SubmitCollectors,
      Effects,
      UnwrappedStepInteractions<
        ScopedPhaseState<
          ContractState<Contract>,
          StepPhaseState<PhaseStateSchema, Steps>
        >,
        ContractManifest<Contract>,
        Interactions
      >,
      Stages,
      Zones,
      UnwrappedStepCardActions<
        ScopedPhaseState<
          ContractState<Contract>,
          StepPhaseState<PhaseStateSchema, Steps>
        >,
        ContractManifest<Contract>,
        CardActions
      >
    >;
  };
}
