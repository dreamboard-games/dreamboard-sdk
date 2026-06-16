import type {
  AnyContinuationCallable,
  BaseGameStateOfContract,
  PhaseMapOf,
  PhaseNamesOfDefinition,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ViewMapOf,
} from "../../model";
import {
  collectReducerDefinitionIndex,
  type ReducerDefinitionPhaseIndex,
  type ReducerIndexedCardActionEntry,
  type ReducerIndexedInteractionEntry,
  type ReducerIndexedPhase,
  type ReducerIndexedStageEntry,
  type ReducerIndexedZoneEntry,
} from "../../definition-index";

export type TrustedErasedPhase<Contract extends ReducerGameContractLike> =
  ReducerIndexedPhase<Contract>;

export type TrustedInteractionEntry<Contract extends ReducerGameContractLike> =
  ReducerIndexedInteractionEntry<Contract>;

export type TrustedCardActionEntry<Contract extends ReducerGameContractLike> =
  ReducerIndexedCardActionEntry<Contract>;

export type TrustedStageEntry<Contract extends ReducerGameContractLike> =
  ReducerIndexedStageEntry<Contract>;

export type TrustedZoneEntry<Contract extends ReducerGameContractLike> =
  ReducerIndexedZoneEntry<Contract>;

export type TrustedContinuationRegistry<
  Contract extends ReducerGameContractLike,
> = ReadonlyMap<
  string,
  AnyContinuationCallable<BaseGameStateOfContract<Contract>>
>;

export type TrustedPhaseRegistry<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = Omit<ReducerDefinitionPhaseIndex<Contract, Definitions, Views>, "effects">;

export interface TrustedRuntimeRegistry<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> {
  readonly phaseEntries: ReadonlyArray<
    readonly [
      PhaseNamesOfDefinition<
        ReducerGameDefinition<Contract, Definitions, Views>
      >,
      TrustedErasedPhase<Contract>,
    ]
  >;
  readonly phasesByName: ReadonlyMap<
    PhaseNamesOfDefinition<ReducerGameDefinition<Contract, Definitions, Views>>,
    TrustedPhaseRegistry<Contract, Definitions, Views>
  >;
  readonly continuationsById: TrustedContinuationRegistry<Contract>;
  readonly effectsById: ReadonlyMap<
    string,
    { readonly id: string; readonly type: string }
  >;
}

export function collectTrustedRuntimeRegistry<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): TrustedRuntimeRegistry<Contract, Definitions, Views> {
  type State = BaseGameStateOfContract<Contract>;
  type PhaseName = PhaseNamesOfDefinition<
    ReducerGameDefinition<Contract, Definitions, Views>
  >;

  const index = collectReducerDefinitionIndex(definition);
  const phasesByName = new Map<
    PhaseName,
    TrustedPhaseRegistry<Contract, Definitions, Views>
  >();
  const continuationsById = new Map<string, AnyContinuationCallable<State>>();
  const effectsById = new Map<
    string,
    { readonly id: string; readonly type: string }
  >();

  for (const phaseIndex of index.phasesByName.values()) {
    const trustedPhase: TrustedPhaseRegistry<Contract, Definitions, Views> = {
      phaseName: phaseIndex.phaseName,
      phase: phaseIndex.phase,
      interactions: phaseIndex.interactions,
      stages: phaseIndex.stages,
      zones: phaseIndex.zones,
      cardActions: phaseIndex.cardActions,
    };
    phasesByName.set(phaseIndex.phaseName, trustedPhase);
    for (const [, effect] of phaseIndex.effects) {
      effectsById.set(effect.id, { id: effect.id, type: effect.type });
      if (effect.continuation) {
        const continuationId = effect.continuation.id ?? effect.id;
        continuationsById.set(
          continuationId,
          effect.continuation as AnyContinuationCallable<State>,
        );
      }
    }
  }

  return {
    phaseEntries: index.phaseEntries,
    phasesByName,
    continuationsById,
    effectsById,
  };
}
