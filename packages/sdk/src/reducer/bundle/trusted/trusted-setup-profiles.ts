import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ViewMapOf,
} from "../../model";

export function resolveTrustedSetupProfiles<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(definition: ReducerGameDefinition<Contract, Definitions, Views>) {
  const manifestSetupProfilesById =
    definition.contract.manifest.setupProfilesById;
  const manifestSetupProfileIds = Object.keys(manifestSetupProfilesById).sort();
  const reducerSetupProfiles = definition.setupProfiles ?? {};
  const reducerSetupProfileIds = Object.keys(reducerSetupProfiles).sort();
  if (
    manifestSetupProfileIds.length !== reducerSetupProfileIds.length ||
    manifestSetupProfileIds.some(
      (profileId, index) => reducerSetupProfileIds[index] !== profileId,
    )
  ) {
    throw new Error(
      `Reducer setupProfiles must exactly match manifest setupProfiles. Manifest=[${manifestSetupProfileIds.join(", ")}], reducer=[${reducerSetupProfileIds.join(", ")}].`,
    );
  }
  return {
    manifestSetupProfilesById,
    reducerSetupProfiles,
  };
}

export function resolveDefaultInitialPhase<PhaseName extends string>(
  explicitInitialPhase: PhaseName | undefined,
  phaseEntries: ReadonlyArray<readonly [PhaseName, unknown]>,
): PhaseName {
  const defaultInitialPhase = explicitInitialPhase ?? phaseEntries[0]?.[0];
  if (!defaultInitialPhase) {
    throw new Error("Reducer-native games must define at least one phase.");
  }
  return defaultInitialPhase;
}
