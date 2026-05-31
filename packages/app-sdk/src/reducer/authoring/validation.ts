import {
  isManifestScopedSchema,
  type ManifestContract,
  type RuntimeTableRecord,
  type SchemaLike,
} from "../model";
import type { InputCollector } from "../model";
import {
  getObjectShape,
  getZodDef,
  isEnumKeyedRecordSchema,
  isPlainZodString,
  isSparseMapSchema,
  isZodArray,
  unwrapWrappers,
} from "../schema-helpers";
import type { AnyReducerGameContract } from "./types";

/**
 * Canonical set of manifest-scoped id field names. `defineGameContract`
 * uses this list to reject state schemas that describe one of these fields
 * with a raw `z.string()` instead of the corresponding branded enum from
 * `manifest.ids.*` (or `gameContract.schemas.*`).
 *
 * The rule of thumb is "one way to do things": if a field *is* a player id,
 * card id, zone id, etc. in the manifest, the authored state schema must
 * reuse the same literal/branded schema so generated types line up with the
 * runtime checks, instead of silently widening to `string`.
 */
const MANIFEST_SCOPED_ID_NAMES = [
  "playerId",
  "cardId",
  "deckId",
  "handId",
  "zoneId",
  "sharedZoneId",
  "playerZoneId",
  "boardId",
  "boardContainerId",
  "boardTypeId",
  "boardBaseId",
  "edgeId",
  "edgeTypeId",
  "vertexId",
  "vertexTypeId",
  "spaceId",
  "spaceTypeId",
  "relationTypeId",
  "resourceId",
  "pieceId",
  "pieceTypeId",
  "dieId",
  "dieTypeId",
  "setupOptionId",
  "setupProfileId",
  "cardSetId",
  "cardType",
] as const;

type ManifestScopedIdName = (typeof MANIFEST_SCOPED_ID_NAMES)[number];

function matchManifestScopedIdName(
  key: string,
): { name: ManifestScopedIdName; kind: "singular" | "plural" } | null {
  for (const name of MANIFEST_SCOPED_ID_NAMES) {
    const capitalized = `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    if (key === name || key.endsWith(capitalized)) {
      return { name, kind: "singular" };
    }
    const plural = `${name}s`;
    const capitalizedPlural = `${capitalized}s`;
    if (key === plural || key.endsWith(capitalizedPlural)) {
      return { name, kind: "plural" };
    }
  }
  return null;
}

export function validateInteractionParamsSchema(
  schema: unknown,
  context: "defineInteraction" | "defineCardAction",
  path: string,
): void {
  const inner = unwrapWrappers(schema);
  if (isEnumKeyedRecordSchema(inner) && !isSparseMapSchema(inner)) {
    throw new Error(
      `${context}: ${path} uses an enum-keyed z.record(...), which parses as a total map at runtime. ` +
        `Use sparseMap(...) or sparseCounts(...) from @dreamboard-games/app-sdk/reducer instead so interaction params stay sparse and match runtime validation.`,
    );
  }

  const shape = getObjectShape(inner);
  if (shape) {
    for (const [key, fieldSchema] of Object.entries(shape)) {
      validateInteractionParamsSchema(fieldSchema, context, `${path}.${key}`);
    }
    return;
  }

  const def = getZodDef(inner);
  if (def.type === "array" && def.element) {
    validateInteractionParamsSchema(def.element, context, `${path}[]`);
    return;
  }

  if (def.type === "record" && def.valueType) {
    validateInteractionParamsSchema(def.valueType, context, `${path}.*`);
  }
}

export function validateInteractionInputsSchema(
  inputs: Record<string, InputCollector> | undefined,
  context: "defineInteraction" | "defineCardAction",
): void {
  if (!inputs) return;
  for (const [key, collector] of Object.entries(inputs)) {
    validateInteractionParamsSchema(collector.schema, context, `inputs.${key}`);
  }
}

export function validateManyCommitPolicy(input: {
  inputs: Record<string, InputCollector> | undefined;
  commit?: { mode: string };
  context: string;
}): void {
  if (input.commit?.mode !== "autoWhenReady") return;
  if (
    Object.values(input.inputs ?? {}).some(
      (collector) => collector.selection?.mode === "many",
    )
  ) {
    throw new Error(
      `${input.context}: interactions with many(...) inputs must use commit: { mode: "manual" }.`,
    );
  }
}

export function validateInteractionLikeDefinition(
  input: {
    inputs?: Record<string, InputCollector>;
    commit?: { mode: string };
    paramsSchema?: unknown;
  },
  context: "defineInteraction" | "defineCardAction",
): void {
  validateInteractionInputsSchema(input.inputs, context);
  validateManyCommitPolicy({
    inputs: input.inputs,
    commit: input.commit,
    context,
  });
  if (input.paramsSchema) {
    validateInteractionParamsSchema(
      input.paramsSchema,
      context,
      "paramsSchema",
    );
  }
}

export function validateStateSchemaIdBranding(
  schema: unknown,
  scope: "public" | "private" | "hidden",
): void {
  const def = getZodDef(schema);
  if (def.type !== "object") {
    return;
  }
  const shape = def.shape as Record<string, unknown> | undefined;
  if (!shape) {
    return;
  }
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const match = matchManifestScopedIdName(key);
    if (!match) {
      continue;
    }
    const inner = unwrapWrappers(fieldSchema);
    if (match.kind === "singular") {
      if (isPlainZodString(inner) && !isManifestScopedSchema(inner)) {
        throw new Error(
          `defineGameContract: state.${scope}.${key} uses a raw z.string() ` +
            `but its name identifies it as a manifest-scoped '${match.name}'. ` +
            `Use gameContract.schemas.${match.name} (or manifest.ids.${match.name}) ` +
            `so the branded literal union flows through state types.`,
        );
      }
      continue;
    }
    if (match.kind === "plural" && isZodArray(inner)) {
      const element = unwrapWrappers(getZodDef(inner).element);
      if (isPlainZodString(element) && !isManifestScopedSchema(element)) {
        throw new Error(
          `defineGameContract: state.${scope}.${key} uses z.array(z.string()) ` +
            `but its name identifies it as manifest-scoped '${match.name}' values. ` +
            `Use z.array(gameContract.schemas.${match.name}) ` +
            `(or manifest.ids.${match.name}) so the branded literal union flows through state types.`,
        );
      }
    }
  }
}

export function validateDefineGamePhaseNames(definition: {
  contract: AnyReducerGameContract;
  phases: Record<string, unknown>;
  initialPhase?: string;
  setupProfiles?: Record<string, { initialPhase?: string }>;
}): void {
  const contractPhaseNames = (
    definition.contract as AnyReducerGameContract & {
      phaseNames?: readonly string[];
    }
  ).phaseNames;
  if (!Array.isArray(contractPhaseNames)) {
    return;
  }
  const declared = new Set(contractPhaseNames);
  const actual = new Set(Object.keys(definition.phases));
  const missing = [...declared].filter((name) => !actual.has(name));
  const extra = [...actual].filter((name) => !declared.has(name));
  if (missing.length > 0 || extra.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(`missing: [${missing.join(", ")}]`);
    }
    if (extra.length > 0) {
      parts.push(`extra: [${extra.join(", ")}]`);
    }
    throw new Error(
      `defineGame: phases record does not match contract.phaseNames (${parts.join(
        "; ",
      )}). Update contract.phaseNames or the phases record so they agree.`,
    );
  }
  if (
    definition.initialPhase !== undefined &&
    !declared.has(definition.initialPhase)
  ) {
    throw new Error(
      `defineGame: initialPhase '${definition.initialPhase}' is not declared in contract.phaseNames.`,
    );
  }
  if (definition.setupProfiles) {
    for (const [profileId, profile] of Object.entries(
      definition.setupProfiles,
    )) {
      const initial = profile?.initialPhase;
      if (initial !== undefined && !declared.has(initial)) {
        throw new Error(
          `defineGame: setupProfiles.${profileId}.initialPhase '${initial}' is not declared in contract.phaseNames.`,
        );
      }
    }
  }
}

export function validateDefineGameZoneWiring(definition: {
  contract: {
    manifest: ManifestContract<RuntimeTableRecord>;
  };
  phases: Record<string, unknown>;
}): void {
  const manifestPlayerZoneIds = new Set(
    definition.contract.manifest.literals.playerZoneIds ?? [],
  );
  for (const [phaseName, phase] of Object.entries(definition.phases)) {
    const phaseRecord =
      typeof phase === "object" && phase !== null
        ? (phase as {
            zones?: Record<string, unknown>;
            cardActions?: Record<string, unknown>;
          })
        : null;
    if (!phaseRecord) continue;

    if (phaseRecord.zones !== undefined && !Array.isArray(phaseRecord.zones)) {
      const zonesRecord =
        typeof phaseRecord.zones === "object" && phaseRecord.zones !== null
          ? (phaseRecord.zones as Record<string, unknown>)
          : null;
      const hasRemovedZoneSpec =
        zonesRecord &&
        Object.values(zonesRecord).some(
          (zone) =>
            typeof zone === "object" &&
            zone !== null &&
            ("cardsFrom" in zone || "playableVia" in zone || "from" in zone),
        );
      if (hasRemovedZoneSpec) {
        throw new Error(
          `defineGame: phases.${phaseName}.zones uses removed zone spec objects. Use zones: ["manifest-player-zone-id"] and cardActions[*].playFrom instead.`,
        );
      }
      throw new Error(
        `defineGame: phases.${phaseName}.zones must be an array of manifest player zone ids.`,
      );
    }

    for (const [index, zoneId] of (phaseRecord.zones ?? []).entries()) {
      if (typeof zoneId !== "string") {
        throw new Error(
          `defineGame: phases.${phaseName}.zones[${index}] must be a manifest player zone id string.`,
        );
      }
      if (!manifestPlayerZoneIds.has(zoneId)) {
        throw new Error(
          `defineGame: phases.${phaseName}.zones[${index}] '${zoneId}' is not declared in manifest.literals.playerZoneIds.`,
        );
      }
    }

    for (const [actionId, action] of Object.entries(
      phaseRecord.cardActions ?? {},
    )) {
      const actionRecord =
        typeof action === "object" && action !== null
          ? (action as Record<string, unknown>)
          : null;
      const playFrom = actionRecord?.playFrom;
      if (
        typeof playFrom === "string" &&
        !manifestPlayerZoneIds.has(playFrom)
      ) {
        throw new Error(
          `defineGame: phases.${phaseName}.cardActions.${actionId}.playFrom '${playFrom}' is not declared in manifest.literals.playerZoneIds.`,
        );
      }
    }
  }
}

export function validateDefineGameSimultaneousPhases(definition: {
  phases: Record<string, unknown>;
}): void {
  for (const [phaseName, phase] of Object.entries(definition.phases)) {
    const phaseRecord =
      typeof phase === "object" && phase !== null
        ? (phase as {
            kind?: unknown;
            submit?: { inputs?: Record<string, InputCollector> };
            resolve?: unknown;
            interactions?: Record<string, unknown>;
          })
        : null;
    if (!phaseRecord || phaseRecord.kind !== "simultaneousPlayer") {
      continue;
    }
    if (!phaseRecord.submit) {
      throw new Error(
        `defineGame: phases.${phaseName} is kind 'simultaneousPlayer' but does not declare submit.`,
      );
    }
    if (typeof phaseRecord.resolve !== "function") {
      throw new Error(
        `defineGame: phases.${phaseName} is kind 'simultaneousPlayer' but does not declare resolve.`,
      );
    }
    if (phaseRecord.interactions?.submit) {
      throw new Error(
        `defineGame: phases.${phaseName}.interactions.submit conflicts with the reserved simultaneous submit interaction id.`,
      );
    }
    validateInteractionInputsSchema(
      phaseRecord.submit.inputs,
      "defineInteraction",
    );
    validateManyCommitPolicy({
      inputs: phaseRecord.submit.inputs,
      commit: (phaseRecord.submit as { commit?: { mode: string } }).commit,
      context: `defineGame: phases.${phaseName}.submit`,
    });
  }
}

export type ManifestIdSchemasOf<
  Ids extends Record<string, SchemaLike<unknown>>,
> = {
  readonly [Key in keyof Ids]: Ids[Key] extends SchemaLike<infer Output>
    ? Ids[Key] & import("../model").ManifestIdSchema<Output>
    : Ids[Key];
};
