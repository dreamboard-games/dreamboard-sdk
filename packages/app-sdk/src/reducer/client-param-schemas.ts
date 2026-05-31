import { z } from "zod";
import { collectReducerDefinitionIndex } from "./definition-index";
import type {
  InputCollector,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ViewMapOf,
} from "./model";

export type ClientParamSchema = {
  safeParse: (value: unknown) =>
    | { success: true; data: Record<string, unknown> }
    | {
        success: false;
        error: { issues: Array<{ path: PropertyKey[]; message: string }> };
      };
};

export type ClientParamSchemasByPhase = Readonly<
  Record<string, Readonly<Record<string, ClientParamSchema>>>
>;

function schemaForCollectors(
  collectors: Record<string, InputCollector>,
): ClientParamSchema {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, collector] of Object.entries(collectors)) {
    if (collector.kind === "rng") continue;
    const schema = collector.schema as z.ZodTypeAny;
    shape[key] =
      "defaultValue" in collector
        ? schema.default(collector.defaultValue)
        : schema;
  }
  return z.object(shape) as unknown as ClientParamSchema;
}

export function createClientParamSchemasByPhase<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): ClientParamSchemasByPhase {
  const index = collectReducerDefinitionIndex(definition);
  const out: Record<string, Record<string, ClientParamSchema>> = {};
  for (const phaseIndex of index.phasesByName.values()) {
    const phaseSchemas: Record<string, ClientParamSchema> = {};
    for (const [id, interaction] of phaseIndex.interactions) {
      phaseSchemas[id] =
        interaction.paramsSchema ?? schemaForCollectors(interaction.inputs);
    }
    out[String(phaseIndex.phaseName)] = phaseSchemas;
  }
  return out;
}
