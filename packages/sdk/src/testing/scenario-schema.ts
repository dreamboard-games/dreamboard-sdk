import { z } from "zod";
import { manifestSchemaFamily } from "../reducer/model/manifest.js";

export class ScenarioSchemaValueError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(message);
    this.name = "ScenarioSchemaValueError";
    this.path = path;
  }
}

export function appendScenarioPath(path: string, key: PropertyKey): string {
  if (typeof key === "number") {
    return `${path}[${key}]`;
  }
  if (typeof key === "symbol") {
    return `${path}[${String(key)}]`;
  }
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function resolvePlayerSeatReference(options: {
  readonly value: unknown;
  readonly playerIds: readonly string[];
  readonly path: string;
}): string {
  if (!isPlainObject(options.value)) {
    throw new ScenarioSchemaValueError(
      options.path,
      "expected a seat reference shaped as { seat: number }",
    );
  }
  const keys = Object.keys(options.value);
  if (keys.length !== 1 || keys[0] !== "seat") {
    throw new ScenarioSchemaValueError(
      options.path,
      "expected a seat reference with only the 'seat' field",
    );
  }
  const seat = options.value.seat;
  const seatPath = appendScenarioPath(options.path, "seat");
  if (typeof seat !== "number" || !Number.isSafeInteger(seat)) {
    throw new ScenarioSchemaValueError(
      seatPath,
      "expected a finite safe integer",
    );
  }
  if (seat < 0 || seat >= options.playerIds.length) {
    throw new ScenarioSchemaValueError(
      seatPath,
      `expected a seat from 0 through ${Math.max(0, options.playerIds.length - 1)}`,
    );
  }
  const playerId = options.playerIds[seat];
  if (playerId === undefined) {
    throw new ScenarioSchemaValueError(
      seatPath,
      `could not resolve seat ${seat}`,
    );
  }
  return playerId;
}

type TupleDefinition = {
  readonly items?: readonly z.core.SomeType[];
  readonly rest?: z.core.SomeType | null;
};

type IntersectionDefinition = {
  readonly left: z.core.SomeType;
  readonly right: z.core.SomeType;
};

function tupleDefinition(schema: z.ZodTuple): TupleDefinition {
  return schema._zod.def as unknown as TupleDefinition;
}

function intersectionDefinition(
  schema: z.ZodIntersection,
): IntersectionDefinition {
  return schema._zod.def as unknown as IntersectionDefinition;
}

function asClassicSchema(schema: z.core.SomeType): z.ZodTypeAny {
  return schema as unknown as z.ZodTypeAny;
}

/**
 * Resolve only schemas carrying the semantic `playerId` manifest family.
 * Ordinary strings and objects with a coincidental `seat` key are untouched.
 */
export function resolveScenarioSeatReferences(options: {
  readonly schema: z.core.SomeType;
  readonly value: unknown;
  readonly playerIds: readonly string[];
  readonly path: string;
}): unknown {
  const { schema, value, playerIds, path } = options;

  if (manifestSchemaFamily(schema) === "playerId") {
    return resolvePlayerSeatReference({ value, playerIds, path });
  }

  if (schema instanceof z.ZodOptional || schema instanceof z.ZodExactOptional) {
    return value === undefined
      ? value
      : resolveScenarioSeatReferences({
          schema: asClassicSchema(schema.unwrap()),
          value,
          playerIds,
          path,
        });
  }
  if (schema instanceof z.ZodNullable) {
    return value === null
      ? value
      : resolveScenarioSeatReferences({
          schema: asClassicSchema(schema.unwrap()),
          value,
          playerIds,
          path,
        });
  }
  if (
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodPrefault ||
    schema instanceof z.ZodCatch ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodNonOptional
  ) {
    return resolveScenarioSeatReferences({
      schema: asClassicSchema(schema.unwrap()),
      value,
      playerIds,
      path,
    });
  }
  if (schema instanceof z.ZodArray) {
    if (!Array.isArray(value)) return value;
    return value.map((item, index) =>
      resolveScenarioSeatReferences({
        schema: asClassicSchema(schema.element),
        value: item,
        playerIds,
        path: appendScenarioPath(path, index),
      }),
    );
  }
  if (schema instanceof z.ZodTuple) {
    if (!Array.isArray(value)) return value;
    const definition = tupleDefinition(schema);
    const items = definition.items ?? [];
    return value.map((item, index) => {
      const itemSchema = items[index] ?? definition.rest;
      return itemSchema
        ? resolveScenarioSeatReferences({
            schema: asClassicSchema(itemSchema),
            value: item,
            playerIds,
            path: appendScenarioPath(path, index),
          })
        : item;
    });
  }
  if (schema instanceof z.ZodObject) {
    if (!isPlainObject(value)) return value;
    const output: Record<string, unknown> = { ...value };
    for (const [key, childSchema] of Object.entries(schema.shape)) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      output[key] = resolveScenarioSeatReferences({
        schema: asClassicSchema(childSchema),
        value: value[key],
        playerIds,
        path: appendScenarioPath(path, key),
      });
    }
    return output;
  }
  if (schema instanceof z.ZodRecord) {
    if (!isPlainObject(value)) return value;
    if (manifestSchemaFamily(schema.keyType) === "playerId") {
      throw new ScenarioSchemaValueError(
        path,
        "player-valued record keys cannot be represented by scenario seat references",
      );
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveScenarioSeatReferences({
          schema: asClassicSchema(schema.valueType),
          value: item,
          playerIds,
          path: appendScenarioPath(path, key),
        }),
      ]),
    );
  }
  if (schema instanceof z.ZodUnion) {
    let firstSeatError: ScenarioSchemaValueError | undefined;
    for (const option of schema.options) {
      try {
        const resolved = resolveScenarioSeatReferences({
          schema: asClassicSchema(option),
          value,
          playerIds,
          path,
        });
        if (asClassicSchema(option).safeParse(resolved).success) {
          return resolved;
        }
      } catch (error) {
        if (
          firstSeatError === undefined &&
          error instanceof ScenarioSchemaValueError
        ) {
          firstSeatError = error;
        }
      }
    }
    if (firstSeatError) throw firstSeatError;
    return value;
  }
  if (schema instanceof z.ZodIntersection) {
    const definition = intersectionDefinition(schema);
    const leftResolved = resolveScenarioSeatReferences({
      schema: asClassicSchema(definition.left),
      value,
      playerIds,
      path,
    });
    return resolveScenarioSeatReferences({
      schema: asClassicSchema(definition.right),
      value: leftResolved,
      playerIds,
      path,
    });
  }
  if (schema instanceof z.ZodPipe) {
    return resolveScenarioSeatReferences({
      schema: asClassicSchema(schema.in),
      value,
      playerIds,
      path,
    });
  }
  if (schema instanceof z.ZodLazy) {
    return resolveScenarioSeatReferences({
      schema: asClassicSchema(schema.unwrap()),
      value,
      playerIds,
      path,
    });
  }

  return value;
}
