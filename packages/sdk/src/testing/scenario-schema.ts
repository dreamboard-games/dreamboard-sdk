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

function projectPlayerSeatReference(options: {
  readonly value: unknown;
  readonly playerIds: readonly string[];
  readonly path: string;
}): { readonly seat: number } {
  if (typeof options.value !== "string") {
    throw new ScenarioSchemaValueError(
      options.path,
      "expected a runtime player id string",
    );
  }
  const seat = options.playerIds.indexOf(options.value);
  if (seat < 0) {
    throw new ScenarioSchemaValueError(
      options.path,
      `runtime player id '${options.value}' is not assigned to a scenario seat`,
    );
  }
  return { seat };
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

type ScenarioSchemaTransformOptions = {
  readonly schema: z.core.SomeType;
  readonly value: unknown;
  readonly playerIds: readonly string[];
  readonly path: string;
};

/**
 * Resolve only schemas carrying the semantic `playerId` manifest family.
 * Ordinary strings and objects with a coincidental `seat` key are untouched.
 */
export function resolveScenarioSeatReferences(
  options: ScenarioSchemaTransformOptions,
): unknown {
  return transformScenarioSchemaValue({ ...options, direction: "resolve" });
}

/**
 * Convert runtime player ids back to pasteable scenario seat references using
 * the same semantic schema walker as command replay.
 */
export function projectScenarioSeatReferences(
  options: ScenarioSchemaTransformOptions,
): unknown {
  return transformScenarioSchemaValue({ ...options, direction: "project" });
}

function transformScenarioSchemaValue(
  options: ScenarioSchemaTransformOptions & {
    readonly direction: "resolve" | "project";
  },
): unknown {
  const { schema, value, playerIds, path } = options;

  if (manifestSchemaFamily(schema) === "playerId") {
    return options.direction === "resolve"
      ? resolvePlayerSeatReference({ value, playerIds, path })
      : projectPlayerSeatReference({ value, playerIds, path });
  }

  if (schema instanceof z.ZodOptional || schema instanceof z.ZodExactOptional) {
    return value === undefined
      ? value
      : transformScenarioSchemaValue({
          schema: asClassicSchema(schema.unwrap()),
          value,
          playerIds,
          path,
          direction: options.direction,
        });
  }
  if (schema instanceof z.ZodNullable) {
    return value === null
      ? value
      : transformScenarioSchemaValue({
          schema: asClassicSchema(schema.unwrap()),
          value,
          playerIds,
          path,
          direction: options.direction,
        });
  }
  if (
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodPrefault ||
    schema instanceof z.ZodCatch ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodNonOptional
  ) {
    return transformScenarioSchemaValue({
      schema: asClassicSchema(schema.unwrap()),
      value,
      playerIds,
      path,
      direction: options.direction,
    });
  }
  if (schema instanceof z.ZodArray) {
    if (!Array.isArray(value)) return value;
    return value.map((item, index) =>
      transformScenarioSchemaValue({
        schema: asClassicSchema(schema.element),
        value: item,
        playerIds,
        path: appendScenarioPath(path, index),
        direction: options.direction,
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
        ? transformScenarioSchemaValue({
            schema: asClassicSchema(itemSchema),
            value: item,
            playerIds,
            path: appendScenarioPath(path, index),
            direction: options.direction,
          })
        : item;
    });
  }
  if (schema instanceof z.ZodObject) {
    if (!isPlainObject(value)) return value;
    const output: Record<string, unknown> = { ...value };
    for (const [key, childSchema] of Object.entries(schema.shape)) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      output[key] = transformScenarioSchemaValue({
        schema: asClassicSchema(childSchema),
        value: value[key],
        playerIds,
        path: appendScenarioPath(path, key),
        direction: options.direction,
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
        transformScenarioSchemaValue({
          schema: asClassicSchema(schema.valueType),
          value: item,
          playerIds,
          path: appendScenarioPath(path, key),
          direction: options.direction,
        }),
      ]),
    );
  }
  if (schema instanceof z.ZodUnion) {
    let firstSeatError: ScenarioSchemaValueError | undefined;
    for (const option of schema.options) {
      try {
        if (
          options.direction === "project" &&
          !asClassicSchema(option).safeParse(value).success
        ) {
          continue;
        }
        const resolved = transformScenarioSchemaValue({
          schema: asClassicSchema(option),
          value,
          playerIds,
          path,
          direction: options.direction,
        });
        if (
          options.direction === "project" ||
          asClassicSchema(option).safeParse(resolved).success
        ) {
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
    const leftResolved = transformScenarioSchemaValue({
      schema: asClassicSchema(definition.left),
      value,
      playerIds,
      path,
      direction: options.direction,
    });
    return transformScenarioSchemaValue({
      schema: asClassicSchema(definition.right),
      value: leftResolved,
      playerIds,
      path,
      direction: options.direction,
    });
  }
  if (schema instanceof z.ZodPipe) {
    return transformScenarioSchemaValue({
      schema: asClassicSchema(schema.in),
      value,
      playerIds,
      path,
      direction: options.direction,
    });
  }
  if (schema instanceof z.ZodLazy) {
    return transformScenarioSchemaValue({
      schema: asClassicSchema(schema.unwrap()),
      value,
      playerIds,
      path,
      direction: options.direction,
    });
  }

  return value;
}
