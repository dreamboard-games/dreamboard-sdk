import * as z from "zod";
import { SeatTileRefSchema } from "../shared/domain/seat-reference.js";
import { getZodDef } from "./schema-helpers";
import { collectReducerDefinitionIndex } from "./definition-index";
import type {
  InputCollector,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ViewOfContract,
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

export function schemaForCollectors(
  collectors: Record<string, InputCollector>,
): ClientParamSchema {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, collector] of Object.entries(collectors)) {
    if (collector.kind === "rng") continue;
    if (collector.kind === "tile") {
      shape[key] = clientTileSchema(collector);
      continue;
    }
    const schema = collector.schema as z.ZodTypeAny;
    shape[key] =
      "defaultValue" in collector
        ? schema.default(collector.defaultValue)
        : schema;
  }
  return z.object(shape);
}

/** Schemas for trusted authored commands before seat-reference adaptation. */
export function schemaForAuthorCollectors(
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
  return z.object(shape);
}

export function createAuthorParamSchemasByPhase<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
): ClientParamSchemasByPhase {
  const index = collectReducerDefinitionIndex(definition);
  const out: Record<string, Record<string, ClientParamSchema>> = {};
  for (const phaseIndex of index.phasesByName.values()) {
    const schemas: Record<string, ClientParamSchema> = {};
    for (const [id, interaction] of phaseIndex.interactions) {
      if (interaction.steps) continue;
      schemas[id] =
        interaction.paramsSchema ??
        schemaForAuthorCollectors(interaction.inputs);
    }
    out[String(phaseIndex.phaseName)] = schemas;
  }
  return out;
}

export function createClientParamSchemasByPhase<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
): ClientParamSchemasByPhase {
  const index = collectReducerDefinitionIndex(definition);
  const out: Record<string, Record<string, ClientParamSchema>> = {};
  for (const phaseIndex of index.phasesByName.values()) {
    const phaseSchemas: Record<string, ClientParamSchema> = {};
    for (const [id, interaction] of phaseIndex.interactions) {
      if (interaction.steps) continue;
      const tileInputs = Object.entries(interaction.inputs).filter(
        ([, collector]) => collector.kind === "tile",
      );
      if (tileInputs.length && interaction.paramsSchema) {
        const schema = interaction.paramsSchema;
        const def = getZodDef(schema);
        if (
          !(schema instanceof z.ZodObject) ||
          (def.checks?.length ?? 0) > 0 ||
          tileInputs.some(([key]) => !Object.hasOwn(schema.shape, key))
        )
          throw new Error(
            "Tile inputs with custom paramsSchema require an unrefined object containing each declared tile input key.",
          );
        // Replace only declared tile positions; game-authored strings remain untouched.
        phaseSchemas[id] = schema.extend(
          Object.fromEntries(
            tileInputs.map(([key, collector]) => [
              key,
              clientTileSchema(collector),
            ]),
          ),
        );
      } else {
        phaseSchemas[id] =
          interaction.paramsSchema ?? schemaForCollectors(interaction.inputs);
      }
    }
    out[String(phaseIndex.phaseName)] = phaseSchemas;
  }
  return out;
}

function clientTileSchema(collector: InputCollector): z.ZodType {
  if (collector.kind !== "tile") throw new Error("Expected tile collector.");
  // Trusted defaults name inventory. Only the projected descriptor can supply a seat default.
  if (collector.selection?.mode !== "many") return SeatTileRefSchema;
  const selection = collector.selection;
  let schema = z.array(SeatTileRefSchema).min(selection.min);
  if (selection.max !== undefined) schema = schema.max(selection.max);
  return selection.distinct
    ? schema.refine(
        (values) => new Set(values).size === values.length,
        "Tile references must be distinct.",
      )
    : schema;
}
