import { cardInput } from "./inputs/cardInput";
import { cardTarget } from "./inputs/cardTarget";
import type {
  AnyCardActionSpec,
  AnyContinuationCallable,
  AnyInteractionSpec,
  BaseGameStateOfContract,
  EffectMap,
  InputCollector,
  InteractionMap,
  ManifestContractOf,
  PhaseDefinition,
  PhaseMapOf,
  PhaseNamesOfDefinition,
  ReducerGameContractLike,
  ReducerGameDefinition,
  SchemaLike,
  StageMap,
  StageSpec,
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
    EffectMap<BaseGameStateOfContract<Contract>, ManifestContractOf<Contract>>,
    InteractionMap<
      BaseGameStateOfContract<Contract>,
      ManifestContractOf<Contract>
    >,
    StageMap<BaseGameStateOfContract<Contract>, ManifestContractOf<Contract>>,
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

export type ReducerIndexedStageEntry<Contract extends ReducerGameContractLike> =
  readonly [
    string,
    StageSpec<BaseGameStateOfContract<Contract>, ManifestContractOf<Contract>>,
  ];

export type ReducerIndexedZoneEntry<Contract extends ReducerGameContractLike> =
  PlayerZoneIdOfManifest<ManifestContractOf<Contract>>;

export type ReducerIndexedCardActionEntry<
  Contract extends ReducerGameContractLike,
> = readonly [
  string,
  AnyCardActionSpec<
    BaseGameStateOfContract<Contract>,
    ManifestContractOf<Contract>
  >,
];

export type ReducerIndexedEffectEntry<
  Contract extends ReducerGameContractLike,
> = readonly [
  string,
  {
    readonly id: string;
    readonly type: string;
    readonly continuation?: AnyContinuationCallable<
      BaseGameStateOfContract<Contract>
    > & {
      readonly id?: string;
    };
  },
];

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
  readonly stages: ReadonlyArray<ReducerIndexedStageEntry<Contract>>;
  readonly zones: ReadonlyArray<ReducerIndexedZoneEntry<Contract>>;
  readonly cardActions: ReadonlyArray<ReducerIndexedCardActionEntry<Contract>>;
  readonly effects: ReadonlyArray<ReducerIndexedEffectEntry<Contract>>;
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

type RawEffectEntry<Contract extends ReducerGameContractLike> = readonly [
  string,
  {
    id?: string;
    type?: string;
    __continuation?: AnyContinuationCallable<
      BaseGameStateOfContract<Contract>
    > & {
      id?: string;
    };
  },
];

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

function cardActionEntriesOf<Contract extends ReducerGameContractLike>(
  phase: ReducerIndexedPhase<Contract>,
): Array<ReducerIndexedCardActionEntry<Contract>> {
  return Object.entries(
    (phase as { cardActions?: Record<string, unknown> }).cardActions ?? {},
  ) as Array<ReducerIndexedCardActionEntry<Contract>>;
}

function stageEntriesOf<Contract extends ReducerGameContractLike>(
  phase: ReducerIndexedPhase<Contract>,
): Array<ReducerIndexedStageEntry<Contract>> {
  return Object.entries(
    (phase as { stages?: Record<string, unknown> }).stages ?? {},
  ) as Array<ReducerIndexedStageEntry<Contract>>;
}

function zoneEntriesOf<Contract extends ReducerGameContractLike>(
  phase: ReducerIndexedPhase<Contract>,
): Array<ReducerIndexedZoneEntry<Contract>> {
  return Array.from(
    (phase as { zones?: readonly unknown[] }).zones ?? [],
  ) as Array<ReducerIndexedZoneEntry<Contract>>;
}

function effectEntriesOf<Contract extends ReducerGameContractLike>(
  phase: ReducerIndexedPhase<Contract>,
): Array<RawEffectEntry<Contract>> {
  return Object.entries(
    (phase as { effects?: Record<string, unknown> }).effects ?? {},
  ) as Array<RawEffectEntry<Contract>>;
}

export function collectReducerDefinitionIndex<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): ReducerDefinitionIndex<Contract, Definitions, Views> {
  type State = BaseGameStateOfContract<Contract>;
  type Manifest = ManifestContractOf<Contract>;
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
    const cardActionEntries: Array<ReducerIndexedInteractionEntry<Contract>> =
      cardActionEntriesOf(phase).map(([cardActionId, cardAction]) => [
        cardActionId,
        {
          ...cardAction,
          __steps: cardAction.__steps,
          inputs: {
            cardId: cardInput<State>({
              target: cardTarget
                .zones<State>([cardAction.playFrom])
                .where({
                  id: "card-type",
                  errorCode: "WRONG_CARD_TYPE",
                  message: `Card must be ${cardAction.cardType}.`,
                  test: ({ q, targetId }) =>
                    q.card.get(targetId).cardType === cardAction.cardType,
                })
                .build(),
            }),
            ...(cardAction.inputs ?? {}),
          },
        } satisfies AnyInteractionSpec<State, Manifest>,
      ]);
    const effects: Array<ReducerIndexedEffectEntry<Contract>> = effectEntriesOf(
      phase,
    ).map(([effectKey, effectValue]) => [
      effectKey,
      {
        id: effectValue.id ?? effectKey,
        type: effectValue.type ?? "rollDie",
        continuation: effectValue.__continuation,
      },
    ]);

    phasesByName.set(phaseName, {
      phaseName,
      phase,
      interactions: [...interactionEntries, ...cardActionEntries],
      stages: stageEntriesOf(phase),
      zones: zoneEntriesOf(phase),
      cardActions: cardActionEntriesOf(phase),
      effects,
    });
  }

  return {
    phaseEntries,
    phasesByName,
  };
}
