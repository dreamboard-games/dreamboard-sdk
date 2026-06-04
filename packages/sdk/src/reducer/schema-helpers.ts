import { z } from "zod";
import type { SchemaLike } from "./model";

export type SparseMap<Key extends string, Value> = Partial<Record<Key, Value>>;
export type SparseCounts<Key extends string> = SparseMap<Key, number>;

type SparseSchemaMetadata = {
  keySchema: z.ZodType<string>;
  valueSchema: z.ZodTypeAny;
};

const sparseSchemas = new WeakMap<object, SparseSchemaMetadata>();

export function sparseMap<
  KeySchema extends z.ZodType<string>,
  ValueSchema extends z.ZodTypeAny,
>(
  keySchema: KeySchema,
  valueSchema: ValueSchema,
): z.ZodType<SparseMap<z.infer<KeySchema>, z.infer<ValueSchema>>> {
  const schema = z.partialRecord(keySchema, valueSchema) as z.ZodType<
    SparseMap<z.infer<KeySchema>, z.infer<ValueSchema>>
  >;
  sparseSchemas.set(schema as unknown as object, {
    keySchema,
    valueSchema,
  });
  return schema;
}

export function sparseCounts<KeySchema extends z.ZodType<string>>(
  keySchema: KeySchema,
): z.ZodType<SparseCounts<z.infer<KeySchema>>> {
  return sparseMap(keySchema, z.number().int().min(0)) as z.ZodType<
    SparseCounts<z.infer<KeySchema>>
  >;
}

export function getZodDef(schema: unknown): {
  type?: string;
} & Record<string, unknown> {
  const anySchema = schema as {
    _zod?: { def?: Record<string, unknown> };
    def?: Record<string, unknown>;
  };
  const fromInternal = anySchema?._zod?.def;
  if (fromInternal && typeof fromInternal === "object") {
    return fromInternal;
  }
  const fromLegacy = anySchema?.def;
  if (fromLegacy && typeof fromLegacy === "object") {
    return fromLegacy;
  }
  return {};
}

export function unwrapWrappers(schema: unknown): unknown {
  let current = schema;
  while (true) {
    const def = getZodDef(current);
    const innerType = def.innerType;
    if (
      (def.type === "nullable" ||
        def.type === "optional" ||
        def.type === "default" ||
        def.type === "readonly" ||
        def.type === "catch") &&
      innerType
    ) {
      current = innerType;
      continue;
    }
    return current;
  }
}

export function isPlainZodString(schema: unknown): boolean {
  return getZodDef(schema).type === "string";
}

export function isZodArray(schema: unknown): boolean {
  return getZodDef(schema).type === "array";
}

export function isEnumKeyedRecordSchema(schema: unknown): boolean {
  const def = getZodDef(schema);
  const keyType = def.keyType;
  return (
    def.type === "record" &&
    typeof keyType === "object" &&
    keyType !== null &&
    getZodDef(keyType).type === "enum"
  );
}

export function isSparseMapSchema(schema: unknown): boolean {
  const inner = unwrapWrappers(schema);
  return (
    typeof inner === "object" &&
    inner !== null &&
    sparseSchemas.has(inner as object)
  );
}

function getSparseSchemaMetadata(
  schema: unknown,
): SparseSchemaMetadata | undefined {
  const inner = unwrapWrappers(schema);
  if (typeof inner !== "object" || inner === null) {
    return undefined;
  }
  return sparseSchemas.get(inner as object);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getObjectShape(
  schema: unknown,
): Record<string, unknown> | null {
  const def = getZodDef(schema);
  if (def.type !== "object") {
    return null;
  }
  const shape = def.shape;
  if (typeof shape === "function") {
    const resolved = shape();
    return resolved && typeof resolved === "object"
      ? (resolved as Record<string, unknown>)
      : null;
  }
  return shape && typeof shape === "object"
    ? (shape as Record<string, unknown>)
    : null;
}

function normalizeSchemaInput(schema: unknown, input: unknown): unknown {
  const inner = unwrapWrappers(schema);
  const sparse = getSparseSchemaMetadata(inner);
  if (sparse && isPlainObject(input)) {
    const filtered = Object.fromEntries(
      Object.entries(input)
        .filter(
          ([key, value]) =>
            typeof value !== "undefined" &&
            sparse.keySchema.safeParse(key).success,
        )
        .map(([key, value]) => [
          key,
          normalizeSchemaInput(sparse.valueSchema, value),
        ]),
    );
    return filtered;
  }

  const shape = getObjectShape(inner);
  if (shape && isPlainObject(input)) {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => {
        const fieldSchema = shape[key];
        return [
          key,
          typeof fieldSchema === "undefined"
            ? value
            : normalizeSchemaInput(fieldSchema, value),
        ];
      }),
    );
  }

  const def = getZodDef(inner);
  if (def.type === "array" && Array.isArray(input) && def.element) {
    return input.map((value) => normalizeSchemaInput(def.element, value));
  }

  return input;
}

export function normalizeCommandParams<Output>(
  schema: SchemaLike<Output>,
  input: unknown,
): Output {
  return schema.parse(normalizeSchemaInput(schema, input));
}
