import type { z } from "zod";
import { createClientParamSchemasByPhase } from "../reducer/client-param-schemas.js";
import type { ScenarioSeatRef } from "./definitions.js";
import {
  projectScenarioSeatReferences,
  resolveScenarioSeatReferences,
  ScenarioSchemaValueError,
} from "./scenario-schema.js";

type GameLike = {
  readonly phases: Readonly<Record<string, unknown>>;
};

export class ScenarioCommandParamsError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "ScenarioCommandParamsError";
    this.path = path;
  }
}

export function isScenarioSeatRef(value: unknown): value is ScenarioSeatRef {
  if (!isPlainRecord(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === 1 &&
    keys[0] === "seat" &&
    Number.isSafeInteger(value.seat) &&
    (value.seat as number) >= 0
  );
}

export function resolveScenarioSeatRef(options: {
  readonly ref: ScenarioSeatRef;
  readonly playerIds: readonly string[];
  readonly path: string;
}): string {
  if (!isScenarioSeatRef(options.ref)) {
    throw new ScenarioCommandParamsError(
      options.path,
      "expected a scenario seat reference",
    );
  }
  const playerId = options.playerIds[options.ref.seat];
  if (playerId === undefined) {
    throw new ScenarioCommandParamsError(
      `${options.path}.seat`,
      `seat ${options.ref.seat} is out of range for ${options.playerIds.length} player(s)`,
    );
  }
  return playerId;
}

export function resolveScenarioCommandParams(options: {
  readonly game: GameLike;
  readonly phase: string;
  readonly interactionId: string;
  readonly params: unknown;
  readonly playerIds: readonly string[];
  readonly path: string;
}): Record<string, unknown> {
  const candidateSchemas = clientParamSchemaCandidates(options);
  let firstSeatError: ScenarioSchemaValueError | undefined;
  let firstIssue:
    | { readonly path: PropertyKey[]; readonly message: string }
    | undefined;
  for (const schema of candidateSchemas) {
    try {
      const resolved = resolveScenarioSeatReferences({
        schema,
        value: options.params,
        playerIds: options.playerIds,
        path: `${options.path}.params`,
      });
      const parsed = schema.safeParse(resolved);
      if (parsed.success) {
        return parsed.data as Record<string, unknown>;
      }
      firstIssue ??= parsed.error.issues[0];
    } catch (error) {
      if (error instanceof ScenarioSchemaValueError) {
        firstSeatError ??= error;
        continue;
      }
      throw error;
    }
  }

  if (firstSeatError) {
    throw new ScenarioCommandParamsError(
      firstSeatError.path,
      firstSeatError.message,
    );
  }
  const suffix =
    firstIssue?.path
      .map((part) =>
        typeof part === "number" ? `[${part}]` : `.${String(part)}`,
      )
      .join("") ?? "";
  throw new ScenarioCommandParamsError(
    `${options.path}.params${suffix}`,
    firstIssue?.message ?? "invalid interaction parameters",
  );
}

/** Convert runtime command params into the semantic, pasteable scenario form. */
export function projectScenarioCommandParams(options: {
  readonly game: GameLike;
  readonly phase: string;
  readonly interactionId: string;
  readonly params: unknown;
  readonly playerIds: readonly string[];
  readonly path: string;
}): Record<string, unknown> {
  const candidateSchemas = clientParamSchemaCandidates(options);
  let firstSeatError: ScenarioSchemaValueError | undefined;
  for (const schema of candidateSchemas) {
    if (!schema.safeParse(options.params).success) continue;
    try {
      const projected = projectScenarioSeatReferences({
        schema,
        value: options.params,
        playerIds: options.playerIds,
        path: `${options.path}.params`,
      });
      if (isPlainRecord(projected)) return projected;
    } catch (error) {
      if (error instanceof ScenarioSchemaValueError) {
        firstSeatError ??= error;
        continue;
      }
      throw error;
    }
  }
  if (firstSeatError) {
    throw new ScenarioCommandParamsError(
      firstSeatError.path,
      firstSeatError.message,
    );
  }
  throw new ScenarioCommandParamsError(
    `${options.path}.params`,
    "runtime interaction parameters do not match a client parameter schema",
  );
}

function clientParamSchemaCandidates(options: {
  readonly game: GameLike;
  readonly phase: string;
  readonly interactionId: string;
  readonly path: string;
}): z.ZodTypeAny[] {
  const schemas = createClientParamSchemasByPhase(options.game as never);
  const currentPhaseSchema = schemas[options.phase]?.[options.interactionId] as
    | z.ZodTypeAny
    | undefined;
  const candidateSchemas = [
    ...(currentPhaseSchema ? [currentPhaseSchema] : []),
    ...Object.entries(schemas).flatMap(([phase, schemasForPhase]) => {
      if (phase === options.phase) return [];
      const schema = schemasForPhase[options.interactionId] as
        | z.ZodTypeAny
        | undefined;
      return schema ? [schema] : [];
    }),
  ];
  if (candidateSchemas.length === 0) {
    throw new ScenarioCommandParamsError(
      `${options.path}.interactionId`,
      `interaction '${options.interactionId}' has no client parameter schema`,
    );
  }
  return candidateSchemas;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
