import { z } from "zod";
import type {
  BaseGameStateOfContract,
  ManifestContractOf,
  PhaseDefinition,
  PhaseMapOf,
  PhaseNameOfContract,
  ReducerGameContractLike,
  ReducerGameDefinition,
  SchemaLike,
  ViewMapOf,
} from "../model";

function createPhaseNameSchema<PhaseName extends string>(
  phaseNames: readonly PhaseName[],
): z.ZodType<PhaseName> {
  const allowed = new Set(phaseNames);
  return z.custom<PhaseName>(
    (value: unknown) =>
      typeof value === "string" && allowed.has(value as PhaseName),
    { message: "Invalid phase name" },
  );
}

export function collectIngressPhaseSchemas<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): {
  phaseEntries: Array<
    [
      PhaseNameOfContract<Contract>,
      PhaseDefinition<
        SchemaLike<object>,
        BaseGameStateOfContract<Contract>,
        ManifestContractOf<Contract>
      >,
    ]
  >;
  phaseNames: PhaseNameOfContract<Contract>[];
  phaseNameSchema: z.ZodType<PhaseNameOfContract<Contract>>;
} {
  type PhaseName = PhaseNameOfContract<Contract>;
  const phaseEntries = Object.entries(definition.phases) as Array<
    [
      PhaseName,
      PhaseDefinition<
        SchemaLike<object>,
        BaseGameStateOfContract<Contract>,
        ManifestContractOf<Contract>
      >,
    ]
  >;
  const phaseNames = phaseEntries.map(([phaseName]) => phaseName);
  return {
    phaseEntries,
    phaseNames,
    phaseNameSchema: createPhaseNameSchema(phaseNames),
  };
}
