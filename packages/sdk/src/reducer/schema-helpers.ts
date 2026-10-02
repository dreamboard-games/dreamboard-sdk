import * as z from "zod";
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
  sparseSchemas.set(schema, {
    keySchema,
    valueSchema,
  });
  return schema;
}

export function sparseCounts<KeySchema extends z.ZodType<string>>(
  keySchema: KeySchema,
): z.ZodType<SparseCounts<z.infer<KeySchema>>> {
  return sparseMap(keySchema, z.number().int().min(0));
}

/** Zod 4 core definitions are the sole introspection vocabulary. */
export function getZodDef(schema: z.core.$ZodType) {
  // Zod's base class erases the definition discriminant. All authored schemas
  // use the installed Zod 4 vocabulary; validation tests cover nested wrappers.
  return (schema as z.core.$ZodTypes)._zod.def;
}

export function unwrapWrappers(schema: z.core.$ZodType): z.core.$ZodType {
  let current = schema;
  while (true) {
    const def = getZodDef(current);
    switch (def.type) {
      case "nullable":
      case "optional":
      case "default":
      case "prefault":
      case "readonly":
      case "catch":
      case "nonoptional":
        current = def.innerType;
        break;
      default:
        return current;
    }
  }
}
export function isPlainZodString(schema: z.core.$ZodType): boolean {
  return getZodDef(schema).type === "string";
}
export function isEnumKeyedRecordSchema(schema: z.core.$ZodType): boolean {
  const def = getZodDef(schema);
  return def.type === "record" && getZodDef(def.keyType).type === "enum";
}
export function isSparseMapSchema(schema: z.core.$ZodType): boolean {
  return sparseSchemas.has(unwrapWrappers(schema));
}
function getSparseSchemaMetadata(
  schema: z.core.$ZodType,
): SparseSchemaMetadata | undefined {
  return sparseSchemas.get(unwrapWrappers(schema));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getObjectShape(schema: z.core.$ZodType) {
  const def = getZodDef(schema);
  return def.type === "object" ? def.shape : null;
}

function normalizeSchemaInput(
  schema: z.core.$ZodType,
  input: unknown,
): unknown {
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
