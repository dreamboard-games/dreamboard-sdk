import type {
  PhaseMapOf,
  PhaseNamesOfDefinition,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ViewMapOf,
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
  Views extends ViewMapOf<Contract>,
> = ReducerDefinitionPhaseIndex<Contract, Definitions, Views>;

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
}

export function collectTrustedRuntimeRegistry<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): TrustedRuntimeRegistry<Contract, Definitions, Views> {
  type PhaseName = PhaseNamesOfDefinition<
    ReducerGameDefinition<Contract, Definitions, Views>
  >;

  const index = collectReducerDefinitionIndex(definition);
  const phasesByName = new Map<
    PhaseName,
    TrustedPhaseRegistry<Contract, Definitions, Views>
  >();
  for (const phaseIndex of index.phasesByName.values()) {
    const trustedPhase: TrustedPhaseRegistry<Contract, Definitions, Views> = {
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
