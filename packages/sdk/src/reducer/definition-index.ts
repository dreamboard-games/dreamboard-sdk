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
  ViewMapOf,
  PhaseZoneList,
  PlayerZoneIdOfManifest,
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
    PhaseZoneList<ManifestContractOf<Contract>>
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

export type ReducerIndexedZoneEntry<Contract extends ReducerGameContractLike> =
  PlayerZoneIdOfManifest<ManifestContractOf<Contract>>;

export interface ReducerDefinitionPhaseIndex<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> {
  readonly phaseName: PhaseNamesOfDefinition<
    ReducerGameDefinition<Contract, Definitions, Views>
  >;
  readonly phase: ReducerIndexedPhase<Contract>;
  readonly interactions: ReadonlyArray<
    ReducerIndexedInteractionEntry<Contract>
  >;
  readonly zones: ReadonlyArray<ReducerIndexedZoneEntry<Contract>>;
}

export interface ReducerDefinitionIndex<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> {
  readonly phaseEntries: ReadonlyArray<
    readonly [
      PhaseNamesOfDefinition<
        ReducerGameDefinition<Contract, Definitions, Views>
      >,
      ReducerIndexedPhase<Contract>,
    ]
  >;
  readonly phasesByName: ReadonlyMap<
    PhaseNamesOfDefinition<ReducerGameDefinition<Contract, Definitions, Views>>,
    ReducerDefinitionPhaseIndex<Contract, Definitions, Views>
  >;
}

function phaseEntriesOf<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): Array<
  readonly [
    PhaseNamesOfDefinition<ReducerGameDefinition<Contract, Definitions, Views>>,
    ReducerIndexedPhase<Contract>,
  ]
> {
  type PhaseName = PhaseNamesOfDefinition<
    ReducerGameDefinition<Contract, Definitions, Views>
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

function zoneEntriesOf<Contract extends ReducerGameContractLike>(
  phase: ReducerIndexedPhase<Contract>,
): Array<ReducerIndexedZoneEntry<Contract>> {
  return Array.from(
    (phase as { zones?: readonly unknown[] }).zones ?? [],
  ) as Array<ReducerIndexedZoneEntry<Contract>>;
}

export function collectReducerDefinitionIndex<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): ReducerDefinitionIndex<Contract, Definitions, Views> {
  type PhaseName = PhaseNamesOfDefinition<
    ReducerGameDefinition<Contract, Definitions, Views>
  >;

  const phaseEntries = phaseEntriesOf(definition);
  const phasesByName = new Map<
    PhaseName,
    ReducerDefinitionPhaseIndex<Contract, Definitions, Views>
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
      zones: zoneEntriesOf(phase),
    });
  }

  return {
    phaseEntries,
    phasesByName,
  };
}
