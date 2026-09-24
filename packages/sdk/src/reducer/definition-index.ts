import type {
  AnyInteractionSpec,
  BaseGameStateOfContract,
  InputCollector,
  InteractionMap,
  ManifestContractOf,
  PhaseDefinition,
  PhaseMapOf,
  PhaseNamesOfDefinition,
  ReducerGameContractLike,
  ReducerGameDefinition,
  SchemaLike,
  ViewOfContract,
  OptionsOfContract,
} from "./model";

export type ReducerIndexedPhase<Contract extends ReducerGameContractLike> =
  PhaseDefinition<
    SchemaLike<object>,
    BaseGameStateOfContract<Contract>,
    ManifestContractOf<Contract>,
    Record<string, InputCollector>,
    InteractionMap<
      BaseGameStateOfContract<Contract>,
      ManifestContractOf<Contract>
    >,
    OptionsOfContract<Contract>
  >;

export type ReducerIndexedInteractionEntry<
  Contract extends ReducerGameContractLike,
> = readonly [
  string,
  AnyInteractionSpec<
    BaseGameStateOfContract<Contract>,
    ManifestContractOf<Contract>
  >,
];

export interface ReducerDefinitionPhaseIndex<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
> {
  readonly phaseName: PhaseNamesOfDefinition<
    ReducerGameDefinition<Contract, Definitions, View>
  >;
  readonly phase: ReducerIndexedPhase<Contract>;
  readonly interactions: ReadonlyArray<
    ReducerIndexedInteractionEntry<Contract>
  >;
}

export interface ReducerDefinitionIndex<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
> {
  readonly phaseEntries: ReadonlyArray<
    readonly [
      PhaseNamesOfDefinition<
        ReducerGameDefinition<Contract, Definitions, View>
      >,
      ReducerIndexedPhase<Contract>,
    ]
  >;
  readonly phasesByName: ReadonlyMap<
    PhaseNamesOfDefinition<ReducerGameDefinition<Contract, Definitions, View>>,
    ReducerDefinitionPhaseIndex<Contract, Definitions, View>
  >;
}

function phaseEntriesOf<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
): Array<
  readonly [
    PhaseNamesOfDefinition<ReducerGameDefinition<Contract, Definitions, View>>,
    ReducerIndexedPhase<Contract>,
  ]
> {
  type PhaseName = PhaseNamesOfDefinition<
    ReducerGameDefinition<Contract, Definitions, View>
  >;
  return Object.entries(definition.phases) as unknown as Array<
    readonly [PhaseName, ReducerIndexedPhase<Contract>]
  >;
}

function interactionEntriesOf<Contract extends ReducerGameContractLike>(
  phase: ReducerIndexedPhase<Contract>,
): Array<ReducerIndexedInteractionEntry<Contract>> {
  return Object.entries(
    (phase as { interactions?: Record<string, unknown> }).interactions ?? {},
  ) as Array<ReducerIndexedInteractionEntry<Contract>>;
}

function simultaneousSubmitEntriesOf<Contract extends ReducerGameContractLike>(
  phase: ReducerIndexedPhase<Contract>,
): Array<ReducerIndexedInteractionEntry<Contract>> {
  const submit = (phase as { submit?: unknown }).submit;
  if (!submit) return [];
  return [
    ["submit", submit] as unknown as ReducerIndexedInteractionEntry<Contract>,
  ];
}

export function collectReducerDefinitionIndex<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
): ReducerDefinitionIndex<Contract, Definitions, View> {
  type PhaseName = PhaseNamesOfDefinition<
    ReducerGameDefinition<Contract, Definitions, View>
  >;

  const phaseEntries = phaseEntriesOf(definition);
  const phasesByName = new Map<
    PhaseName,
    ReducerDefinitionPhaseIndex<Contract, Definitions, View>
  >();

  for (const [phaseName, phase] of phaseEntries) {
    const interactionEntries = [
      ...interactionEntriesOf(phase),
      ...simultaneousSubmitEntriesOf(phase),
    ];
    phasesByName.set(phaseName, {
      phaseName,
      phase,
      interactions: interactionEntries,
    });
  }

  return {
    phaseEntries,
    phasesByName,
  };
}
