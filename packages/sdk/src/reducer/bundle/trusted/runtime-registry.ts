import type {
  PhaseMapOf,
  PhaseNamesOfDefinition,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ViewOfContract,
} from "../../model";
import {
  collectReducerDefinitionIndex,
  type ReducerDefinitionPhaseIndex,
  type ReducerIndexedInteractionEntry,
  type ReducerIndexedPhase,
} from "../../definition-index";

export type TrustedErasedPhase<Contract extends ReducerGameContractLike> =
  ReducerIndexedPhase<Contract>;

export type TrustedInteractionEntry<Contract extends ReducerGameContractLike> =
  ReducerIndexedInteractionEntry<Contract>;

export type TrustedPhaseRegistry<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
> = ReducerDefinitionPhaseIndex<Contract, Definitions, View>;

export interface TrustedRuntimeRegistry<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
> {
  readonly phaseEntries: ReadonlyArray<
    readonly [
      PhaseNamesOfDefinition<
        ReducerGameDefinition<Contract, Definitions, View>
      >,
      TrustedErasedPhase<Contract>,
    ]
  >;
  readonly phasesByName: ReadonlyMap<
    PhaseNamesOfDefinition<ReducerGameDefinition<Contract, Definitions, View>>,
    TrustedPhaseRegistry<Contract, Definitions, View>
  >;
}

export function collectTrustedRuntimeRegistry<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
): TrustedRuntimeRegistry<Contract, Definitions, View> {
  type PhaseName = PhaseNamesOfDefinition<
    ReducerGameDefinition<Contract, Definitions, View>
  >;

  const index = collectReducerDefinitionIndex(definition);
  const phasesByName = new Map<
    PhaseName,
    TrustedPhaseRegistry<Contract, Definitions, View>
  >();
  for (const phaseIndex of index.phasesByName.values()) {
    const trustedPhase: TrustedPhaseRegistry<Contract, Definitions, View> = {
      phaseName: phaseIndex.phaseName,
      phase: phaseIndex.phase,
      interactions: phaseIndex.interactions,
    };
    phasesByName.set(phaseIndex.phaseName, trustedPhase);
  }

  return {
    phaseEntries: index.phaseEntries,
    phasesByName,
  };
}
