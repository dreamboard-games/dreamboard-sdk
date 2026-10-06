import * as z from "zod";
import type {
  FieldSchemaJson,
  JsonValue,
} from "../../shared/domain/contracts.js";
import type { ManifestIdsOf } from "./types.js";
import type {
  HexSpaceId,
  HexEdgeId,
  HexVertexId,
} from "../../shared/domain/board-identities.js";

export const FIELD_REF_KEY = "x-dreamboard-ref";
const OBJECT_MODE_KEY = "x-dreamboard-object-mode";
export const FIELD_REF_FAMILIES = [
  "cardId",
  "zoneId",
  "playerId",
  "boardId",
  "spaceId",
  "edgeId",
  "vertexId",
  "pieceId",
  "dieId",
  "tileId",
  "resourceId",
] as const;
export type FieldRefFamily = (typeof FIELD_REF_FAMILIES)[number];
const marker = <F extends FieldRefFamily>(family: F) =>
  z
    .string()
    .meta({ [FIELD_REF_KEY]: family })
    .brand<`dreamboard:${F}`, "inout">();
export const ref = {
  cardId: () => marker("cardId"),
  zoneId: () => marker("zoneId"),
  playerId: () => marker("playerId"),
  boardId: () => marker("boardId"),
  spaceId: () => marker("spaceId"),
  edgeId: () => marker("edgeId"),
  vertexId: () => marker("vertexId"),
  pieceId: () => marker("pieceId"),
  dieId: () => marker("dieId"),
  tileId: () => marker("tileId"),
  resourceId: () => marker("resourceId"),
};
export type FieldSchema = z.ZodObject<
  z.core.$ZodShape,
  z.core.$ZodObjectConfig
>;
export type CardSchema =
  FieldSchema | { readonly byCardType: Readonly<Record<string, FieldSchema>> };

type RefFamily<T> = {
  [F in FieldRefFamily]: T extends z.core.$brand<`dreamboard:${F}`> ? F : never;
}[FieldRefFamily];
type BoardSpaceId<B> = B extends { layout: "hex" }
  ? HexSpaceId<B>
  : B extends { spaces: readonly (infer S)[] }
    ? S extends { id: infer I extends string }
      ? I
      : never
    : never;
type BoardEdgeId<B> = B extends { layout: "hex"; id: infer I extends string }
  ? HexEdgeId<I>
  : B extends { layout: "square" }
    ? `square-edge:${string}`
    : never;
type BoardVertexId<B> = B extends { layout: "hex"; id: infer I extends string }
  ? HexVertexId<I>
  : B extends { layout: "square" }
    ? `square-vertex:${string}`
    : never;
type FamilyIds<M, B> = Omit<
  ManifestIdsOf<M>,
  "spaceId" | "edgeId" | "vertexId"
> & {
  spaceId: [B] extends [never] ? ManifestIdsOf<M>["spaceId"] : BoardSpaceId<B>;
  edgeId: [B] extends [never] ? ManifestIdsOf<M>["edgeId"] : BoardEdgeId<B>;
  vertexId: [B] extends [never]
    ? ManifestIdsOf<M>["vertexId"]
    : BoardVertexId<B>;
};
export type ResolveFields<T, M, B = never> = T extends unknown
  ? [RefFamily<T>] extends [never]
    ? T extends readonly unknown[]
      ? { [K in keyof T]: ResolveFields<T[K], M, B> }
      : T extends object
        ? { [K in keyof T]: ResolveFields<T[K], M, B> }
        : T
    : FamilyIds<M, B>[RefFamily<T>]
  : never;
export type FieldsInput<S, M, B = never> = [S] extends [never]
  ? Record<string, JsonValue>
  : S extends z.ZodType
    ? ResolveFields<z.input<S>, M, B>
    : Record<string, JsonValue>;
export type FieldsOutput<S, M, B = never> = [S] extends [never]
  ? Record<string, JsonValue>
  : S extends z.ZodType
    ? ResolveFields<z.output<S>, M, B>
    : Record<string, JsonValue>;

/** Reject checks whose meaning cannot survive a JSON round trip. */
function assertPortable(
  schema: z.core.$ZodType,
  path: string,
  seen: Set<z.core.$ZodType>,
  active = new Set<z.core.$ZodType>(),
  objectSentinel = false,
): void {
  if (
    !objectSentinel &&
    (schema instanceof z.ZodUnknown || schema instanceof z.ZodNever)
  )
    throw new Error(
      `${path}: unsupported field schema '${schema._zod.def.type}'`,
    );
  if (active.has(schema))
    throw new Error(`${path}: recursive field schemas are not portable`);
  if (seen.has(schema)) return;
  seen.add(schema);
  active.add(schema);
  const metadata = z.globalRegistry.get(schema);
  if (metadata)
    for (const key of Object.keys(metadata))
      if (!["title", "description", "examples", FIELD_REF_KEY].includes(key))
        throw new Error(`${path}: unsupported behavioral metadata '${key}'`);
  if (
    metadata?.[FIELD_REF_KEY] !== undefined &&
    (!(schema instanceof z.ZodString) ||
      !FIELD_REF_FAMILIES.some((family) => family === metadata[FIELD_REF_KEY]))
  )
    throw new Error(`${path}: invalid field reference metadata`);
  for (const check of schema._zod.def.checks ?? []) {
    if (
      ![
        "greater_than",
        "less_than",
        "multiple_of",
        "number_format",
        "min_length",
        "max_length",
        "length_equals",
        "string_format",
      ].includes(check._zod.def.check)
    )
      throw new Error(
        `${path}: unsupported portable check '${check._zod.def.check}'`,
      );
    if (
      check._zod.def.check === "string_format" &&
      (!("format" in check._zod.def) || check._zod.def.format !== "regex")
    )
      throw new Error(`${path}: string formats are not portable`);
    if (
      "pattern" in check._zod.def &&
      check._zod.def.pattern instanceof RegExp &&
      check._zod.def.pattern.flags
    )
      throw new Error(`${path}: regex flags are not portable`);
  }
  if (schema instanceof z.ZodObject) {
    for (const [key, child] of Object.entries<unknown>(schema.shape)) {
      if (!(child instanceof z.ZodType))
        throw new Error(`${path}.${key}: invalid field schema`);
      assertPortable(child, `${path}.${key}`, seen, active);
    }
    if (schema._zod.def.catchall)
      assertPortable(schema._zod.def.catchall, `${path}.*`, seen, active, true);
  } else if (schema instanceof z.ZodArray)
    assertPortable(schema.element, `${path}[]`, seen, active);
  else if (schema instanceof z.ZodRecord) {
    if (
      !(schema.keyType instanceof z.ZodString) ||
      schema.keyType._zod.def.checks?.length
    )
      throw new Error(
        `${path}: records require an unconstrained string key schema`,
      );
    assertPortable(schema.keyType, `${path}.key`, seen, active);
    assertPortable(schema.valueType, `${path}.*`, seen, active);
  } else if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  )
    assertPortable(schema.unwrap(), path, seen, active);
  else if (!(
    schema instanceof z.ZodString ||
    schema instanceof z.ZodNumber ||
    schema instanceof z.ZodBoolean ||
    schema instanceof z.ZodEnum ||
    schema instanceof z.ZodLiteral ||
    schema instanceof z.ZodNull ||
    (objectSentinel &&
      (schema instanceof z.ZodUnknown || schema instanceof z.ZodNever))
  ))
    throw new Error(
      `${path}: unsupported field schema '${schema._zod.def.type}'`,
    );
  if ("coerce" in schema._zod.def && schema._zod.def.coerce)
    throw new Error(`${path}: coercion is not portable`);
  active.delete(schema);
}
function sampleDefaults(
  schema: z.core.$ZodType,
  copies = new Map<z.core.$ZodType, z.core.$ZodType>(),
): z.core.$ZodType {
  const existing = copies.get(schema);
  if (existing) return existing;
  let copy = schema;
  if (schema instanceof z.ZodDefault) {
    const definition = { ...schema._zod.def };
    assertPlainData(definition.defaultValue);
    const value = z.json().parse(definition.defaultValue);
    copy = z.core.clone(
      schema,
      {
        ...definition,
        innerType: sampleDefaults(definition.innerType, copies),
        defaultValue: value,
      },
      { parent: false },
    );
  } else if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable)
    copy = z.core.clone(
      schema,
      {
        ...schema._zod.def,
        innerType: sampleDefaults(schema._zod.def.innerType, copies),
      },
      { parent: false },
    );
  else if (schema instanceof z.ZodObject) {
    const shape = Object.fromEntries(
      Object.entries<unknown>(schema.shape).map(([key, child]) => {
        if (!(child instanceof z.ZodType))
          throw new Error("Invalid field schema");
        return [key, sampleDefaults(child, copies)];
      }),
    );
    copy = z.core.clone(
      schema,
      {
        ...schema._zod.def,
        shape,
        catchall: schema._zod.def.catchall
          ? sampleDefaults(schema._zod.def.catchall, copies)
          : undefined,
      },
      { parent: false },
    );
  } else if (schema instanceof z.ZodArray)
    copy = z.core.clone(
      schema,
      {
        ...schema._zod.def,
        element: sampleDefaults(schema.element, copies),
      },
      { parent: false },
    );
  else if (schema instanceof z.ZodRecord)
    copy = z.core.clone(
      schema,
      {
        ...schema._zod.def,
        valueType: sampleDefaults(schema.valueType, copies),
      },
      { parent: false },
    );
  const metadata = z.globalRegistry.get(schema);
  if (copy !== schema && metadata) z.globalRegistry.add(copy, metadata);
  copies.set(schema, copy);
  return copy;
}
function assertPlainData(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const child of value) assertPlainData(child);
    return;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error("Manifest data must contain plain JSON objects");
  for (const child of Object.values(value)) assertPlainData(child);
}

export function toFieldSchemaJson(schema: FieldSchema): FieldSchemaJson {
  assertPortable(schema, "fields", new Set());
  return z.record(z.string(), z.json()).parse(
    z.toJSONSchema(sampleDefaults(schema), {
      io: "input",
      unrepresentable: "throw",
      reused: "inline",
      override: ({ zodSchema, jsonSchema }) => {
        if (
          zodSchema._zod.def.type === "object" &&
          zodSchema._zod.def.catchall === undefined
        )
          jsonSchema[OBJECT_MODE_KEY] = "strip";
      },
    }),
  );
}

export type FieldReferenceContext = {
  /** Manifest checks validate static references and defer session-dependent families. */
  stage: "manifest" | "session";
  ids: Readonly<Partial<Record<FieldRefFamily, readonly string[]>>>;
  deferred?: readonly FieldRefFamily[];
  /** Static declaration membership for families whose seats are not known yet. */
  accepts?: Readonly<
    Partial<Record<FieldRefFamily, (value: string) => boolean>>
  >;
};
export function fieldValidator(
  schema: FieldSchemaJson,
  context: FieldReferenceContext,
): z.ZodType {
  if (schema.type !== "object")
    throw new Error("Field schemas must describe an object");
  function resolve(value: JsonValue): JsonValue {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return value;
    const resolved: FieldSchemaJson = { ...value };
    for (const key of ["properties", "patternProperties", "$defs"]) {
      const children = value[key];
      if (
        children !== null &&
        typeof children === "object" &&
        !Array.isArray(children)
      )
        resolved[key] = Object.fromEntries(
          Object.entries(children).map(([name, child]) => [
            name,
            resolve(child),
          ]),
        );
    }
    for (const key of ["items", "additionalProperties", "propertyNames", "not"])
      if (value[key] !== undefined) resolved[key] = resolve(value[key]);
    for (const key of ["anyOf", "allOf", "oneOf", "prefixItems"])
      if (Array.isArray(value[key])) resolved[key] = value[key].map(resolve);
    const family = value[FIELD_REF_KEY];
    if (family !== undefined) {
      const known = FIELD_REF_FAMILIES.find(
        (candidate) => candidate === family,
      );
      if (!known)
        throw new Error(`Unknown field reference family '${String(family)}'`);
      delete resolved[FIELD_REF_KEY];
      if (context.deferred?.includes(known)) return resolved;
      const ids = context.ids[known];
      if (!ids)
        throw new Error(
          `Missing ${context.stage} reference resolver for ${known}`,
        );
      if (ids.length === 0) return { ...resolved, not: {} };
      const declared = value.enum;
      const allowed = Array.isArray(declared)
        ? ids.filter((id) => declared.includes(id))
        : [...ids];
      return allowed.length
        ? { ...resolved, enum: allowed }
        : { ...resolved, not: {} };
    }
    return resolved;
  }
  assertFieldSchemaJson(schema);
  const json = z.record(z.string(), z.json()).parse(resolve(schema));
  validateDefaults(json);
  const normalize = createOutputNormalizer(json);
  const referenceChecks = createDeferredReferenceChecks(schema, context);
  function checkDefaults(node: FieldSchemaJson): void {
    if (Object.hasOwn(node, "default")) {
      const issues = createDeferredReferenceChecks(node, context)(node.default);
      if (issues.length)
        throw new Error(
          `Invalid field reference default: ${issues.map((issue) => issue.message).join("; ")}`,
        );
    }
    for (const child of schemaChildren(node)) checkDefaults(child);
  }
  checkDefaults(schema);
  return validatorFromJson(json)
    .superRefine((value, ctx) => {
      for (const issue of referenceChecks(value))
        ctx.addIssue({ code: "custom", ...issue });
    })
    .transform(normalize);
}

/** Compile only deferred reference membership, alongside the JSON constraint owner. */
function createDeferredReferenceChecks(
  schema: FieldSchemaJson,
  context: FieldReferenceContext,
) {
  type Issue = { path: PropertyKey[]; message: string };
  type Check = (value: unknown, path: PropertyKey[], issues: Issue[]) => void;
  function build(node: FieldSchemaJson): Check {
    const family = FIELD_REF_FAMILIES.find(
      (family) => node[FIELD_REF_KEY] === family,
    );
    const admit =
      family && context.deferred?.includes(family)
        ? context.accepts?.[family]
        : undefined;
    const properties =
      node.properties === undefined
        ? new Map<string, Check>()
        : new Map(
            Object.entries(jsonObject(node.properties)).map(([key, child]) => [
              key,
              build(jsonObject(child)),
            ]),
          );
    const items =
      node.items === undefined ? undefined : build(jsonObject(node.items));
    const additional =
      node.additionalProperties && typeof node.additionalProperties === "object"
        ? build(jsonObject(node.additionalProperties))
        : undefined;
    const nullable = Array.isArray(node.anyOf)
      ? node.anyOf
          .filter((child) => jsonObject(child).type !== "null")
          .map((child) => build(jsonObject(child)))
      : [];
    return (value, path, issues) => {
      if (typeof value === "string" && admit && !admit(value))
        issues.push({
          path,
          message: `Unknown declared ${family} reference '${value}'`,
        });
      if (Array.isArray(value) && items)
        value.forEach((child, i) => items(child, [...path, i], issues));
      else if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      )
        for (const [key, child] of Object.entries(value))
          (properties.get(key) ?? additional)?.(child, [...path, key], issues);
      if (value !== null)
        for (const check of nullable) check(value, path, issues);
    };
  }
  const check = build(schema);
  return (value: unknown): Issue[] => {
    const issues: Issue[] = [];
    check(value, [], issues);
    return issues;
  };
}

/** Zod's JSON reader prioritizes enum/const over sibling constraints. */
function validatorFromJson(schema: FieldSchemaJson): z.ZodType {
  function lower(node: FieldSchemaJson): FieldSchemaJson {
    const lowered = { ...node };
    if (node.properties !== undefined)
      lowered.properties = Object.fromEntries(
        Object.entries(jsonObject(node.properties)).map(([key, child]) => [
          key,
          lower(jsonObject(child)),
        ]),
      );
    for (const key of ["items", "additionalProperties", "propertyNames", "not"])
      if (node[key] !== undefined && typeof node[key] !== "boolean")
        lowered[key] = lower(jsonObject(node[key]));
    if (Array.isArray(node.anyOf))
      lowered.anyOf = node.anyOf.map((child) => lower(jsonObject(child)));
    if (node.enum === undefined && node.const === undefined) return lowered;
    const {
      enum: values,
      const: constant,
      default: fallback,
      ...constraints
    } = lowered;
    const predicates: FieldSchemaJson[] = [constraints];
    if (values !== undefined) predicates.push({ enum: values });
    if (constant !== undefined) predicates.push({ const: constant });
    return {
      allOf: predicates,
      ...(Object.hasOwn(lowered, "default") ? { default: fallback } : {}),
    };
  }
  return z.fromJSONSchema(lower(schema));
}

const SCHEMA_KEYS = new Set([
  "$schema",
  "type",
  "properties",
  "additionalProperties",
  "propertyNames",
  "items",
  "anyOf",
  "not",
  "required",
  "enum",
  "const",
  "default",
  "description",
  "title",
  "examples",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  FIELD_REF_KEY,
  OBJECT_MODE_KEY,
]);
function jsonObject(value: JsonValue): FieldSchemaJson {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a field schema object");
  return value;
}
function schemaChildren(schema: FieldSchemaJson): FieldSchemaJson[] {
  const children: FieldSchemaJson[] = [];
  if (schema.properties !== undefined)
    for (const child of Object.values(jsonObject(schema.properties)))
      children.push(jsonObject(child));
  for (const key of ["items", "additionalProperties", "propertyNames", "not"])
    if (schema[key] !== undefined && typeof schema[key] !== "boolean")
      children.push(jsonObject(schema[key]));
  for (const key of ["anyOf"])
    if (schema[key] !== undefined) {
      const nodes = schema[key];
      if (!Array.isArray(nodes))
        throw new Error(`Expected ${key} schema array`);
      for (const child of nodes) children.push(jsonObject(child));
    }
  return children;
}
export function assertFieldSchemaJson(schema: FieldSchemaJson): void {
  z.record(z.string(), z.json()).parse(schema);
  if (
    schema.type !== undefined &&
    !(Array.isArray(schema.type) ? schema.type : [schema.type]).every((type) =>
      [
        "object",
        "array",
        "string",
        "number",
        "integer",
        "boolean",
        "null",
      ].includes(String(type)),
    )
  )
    throw new Error("Unsupported field JSON Schema type");
  for (const key of Object.keys(schema))
    if (!SCHEMA_KEYS.has(key))
      throw new Error(`Unsupported field JSON Schema keyword '${key}'`);
  for (const value of [
    ...(Array.isArray(schema.enum) ? schema.enum : []),
    ...(Object.hasOwn(schema, "const") ? [schema.const] : []),
  ])
    if (
      value !== null &&
      !["string", "number", "boolean"].includes(typeof value)
    )
      throw new Error("Field enum/const values must be primitive JSON values");
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (
    Array.isArray(schema.type) &&
    (schema.type.length !== 2 ||
      !schema.type.includes("null") ||
      !schema.type.some((type) =>
        ["string", "number", "integer", "boolean"].includes(String(type)),
      ))
  )
    throw new Error("Portable type arrays require a primitive and null");
  for (const key of ["minLength", "maxLength", "minItems", "maxItems"])
    if (
      schema[key] !== undefined &&
      (typeof schema[key] !== "number" ||
        !Number.isSafeInteger(schema[key]) ||
        schema[key] < 0)
    )
      throw new Error(`${key} requires a nonnegative safe integer`);
  for (const key of [
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
  ])
    if (
      schema[key] !== undefined &&
      (typeof schema[key] !== "number" ||
        !Number.isFinite(schema[key]) ||
        (key === "multipleOf" && schema[key] <= 0))
    )
      throw new Error(
        `${key} requires a finite${key === "multipleOf" ? " positive" : ""} number`,
      );
  for (const key of ["pattern", "title", "description"])
    if (schema[key] !== undefined && typeof schema[key] !== "string")
      throw new Error(`${key} requires a string`);
  if (typeof schema.pattern === "string") new RegExp(schema.pattern);
  if (
    schema.enum !== undefined &&
    (!Array.isArray(schema.enum) || schema.enum.length === 0)
  )
    throw new Error("enum requires a nonempty array");
  if (schema.examples !== undefined && !Array.isArray(schema.examples))
    throw new Error("examples requires an array");
  if (schema.required !== undefined) {
    if (
      !Array.isArray(schema.required) ||
      schema.required.some((key) => typeof key !== "string") ||
      new Set(schema.required).size !== schema.required.length
    )
      throw new Error("required requires unique declared property names");
    const properties =
      schema.properties === undefined ? {} : jsonObject(schema.properties);
    if (schema.required.some((key) => !Object.hasOwn(properties, String(key))))
      throw new Error("required requires unique declared property names");
  }
  if (
    schema.not !== undefined &&
    Object.keys(jsonObject(schema.not)).length !== 0
  )
    throw new Error("Portable not supports the empty schema only");
  if (
    schema.propertyNames !== undefined &&
    !sameJson(schema.propertyNames, { type: "string" })
  )
    throw new Error("Portable records require unconstrained string keys");
  if (
    schema.anyOf !== undefined &&
    (!Array.isArray(schema.anyOf) || schema.anyOf.length !== 2)
  )
    throw new Error("Portable anyOf supports nullable schemas only");
  if (schema[FIELD_REF_KEY] !== undefined && schema.type !== "string")
    throw new Error("Field reference metadata requires a string schema");
  for (const [keywords, compatible] of [
    [["minLength", "maxLength", "pattern"], ["string"]],
    [
      [
        "minimum",
        "maximum",
        "exclusiveMinimum",
        "exclusiveMaximum",
        "multipleOf",
      ],
      ["number", "integer"],
    ],
    [["minItems", "maxItems", "items"], ["array"]],
    [["properties", "required", "additionalProperties"], ["object"]],
  ])
    if (
      keywords.some((key) => schema[key] !== undefined) &&
      !types.some((type) => compatible.some((candidate) => candidate === type))
    )
      throw new Error(
        "Field schema constraints require a compatible explicit type",
      );
  if (
    schema.$schema !== undefined &&
    schema.$schema !== "https://json-schema.org/draft/2020-12/schema"
  )
    throw new Error("Field schemas require JSON Schema draft 2020-12");
  if (
    schema[OBJECT_MODE_KEY] !== undefined &&
    (schema[OBJECT_MODE_KEY] !== "strip" || schema.type !== "object")
  )
    throw new Error(
      "Object-mode metadata requires an object schema and strip mode",
    );
  if (Array.isArray(schema.anyOf)) {
    const branches = schema.anyOf;
    const meaningful = branches.filter(
      (branch) =>
        !(
          branch !== null &&
          typeof branch === "object" &&
          !Array.isArray(branch) &&
          branch.type === "null"
        ),
    );
    if (meaningful.length !== 1)
      throw new Error("Portable anyOf supports nullable schemas only");
  }
  for (const child of schemaChildren(schema)) assertFieldSchemaJson(child);
}
function sameJson(left: JsonValue, right: JsonValue): boolean {
  if (left === right) return true;
  if (Array.isArray(left))
    return (
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((child, index) => sameJson(child, right[index]))
    );
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object" ||
    Array.isArray(right)
  )
    return false;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && sameJson(left[key], right[key]),
    )
  );
}
function validateDefaults(schema: FieldSchemaJson): void {
  for (const child of schemaChildren(schema)) validateDefaults(child);
  if (Object.hasOwn(schema, "default")) {
    const { default: value, ...validation } = schema;
    const concrete = z
      .json()
      .parse(
        createOutputNormalizer(validation)(
          validatorFromJson(validation).parse(value),
        ),
      );
    if (!sameJson(value, concrete))
      throw new Error(
        "Concrete field defaults must already conform to their output shape",
      );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** Compile object output policy once alongside the validator. */
function createOutputNormalizer(
  schema: FieldSchemaJson,
): (value: unknown) => unknown {
  if (Array.isArray(schema.anyOf)) {
    const branch = schema.anyOf.find(
      (child) =>
        child !== null &&
        typeof child === "object" &&
        !Array.isArray(child) &&
        child.type !== "null",
    );
    if (branch !== undefined) {
      const normalize = createOutputNormalizer(jsonObject(branch));
      return (value) => (value === null ? null : normalize(value));
    }
  }
  if (schema.type === "array" && schema.items !== undefined) {
    const normalize = createOutputNormalizer(jsonObject(schema.items));
    return (value) => (Array.isArray(value) ? value.map(normalize) : value);
  }
  if (schema.type !== "object") return (value) => value;
  const properties =
    schema.properties === undefined ? {} : jsonObject(schema.properties);
  const fields = new Map(
    Object.entries(properties).map(([key, child]) => [
      key,
      createOutputNormalizer(jsonObject(child)),
    ]),
  );
  const additional =
    schema.additionalProperties !== undefined &&
    typeof schema.additionalProperties !== "boolean"
      ? createOutputNormalizer(jsonObject(schema.additionalProperties))
      : undefined;
  const strip = schema[OBJECT_MODE_KEY] === "strip";
  return (value) => {
    if (!isRecord(value)) return value;
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, child]) => {
        const normalize = fields.get(key);
        if (normalize) return [[key, normalize(child)]];
        if (strip) return [];
        return [[key, additional ? additional(child) : child]];
      }),
    );
  };
}

export function schemaForCardType(
  schema: import("../../shared/domain/contracts.js").CardSchemaJson,
  cardType: string,
): FieldSchemaJson {
  const variants = schema.byCardType;
  if (
    variants !== undefined &&
    variants !== null &&
    typeof variants === "object" &&
    !Array.isArray(variants)
  ) {
    const variant = variants[cardType];
    if (
      variant === null ||
      typeof variant !== "object" ||
      Array.isArray(variant)
    )
      throw new Error(`Missing field schema for card type '${cardType}'`);
    return variant;
  }
  return schema;
}

export function fieldSchemaKeyIssues(
  schema: FieldSchemaJson | null | undefined,
  path: string,
): string[] {
  if (!schema) return [];
  if (schema.byCardType !== undefined) {
    try {
      if (Object.keys(schema).length !== 1)
        throw new Error("Card variant schemas require only byCardType");
      const variants = z
        .record(z.string().min(1), z.record(z.string(), z.json()))
        .parse(schema.byCardType);
      return Object.entries(variants).flatMap(([type, variant]) => [
        ...(["__proto__", "prototype", "constructor"].includes(type)
          ? [
              `${path}.byCardType.${type}: '${type}' is reserved and cannot be used as a generated record key.`,
            ]
          : []),
        ...(variant.type !== "object"
          ? [
              `${path}.byCardType.${type}: Field schemas must describe an object`,
            ]
          : fieldSchemaKeyIssues(variant, `${path}.byCardType.${type}`)),
      ]);
    } catch (error) {
      return [
        `${path}: ${error instanceof Error ? error.message : String(error)}`,
      ];
    }
  }
  try {
    if (schema.type !== "object")
      throw new Error("Field schemas must describe an object");
    assertFieldSchemaJson(schema);
  } catch (error) {
    return [
      `${path}: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
  const issues: string[] = [];
  function walk(value: JsonValue, at: string): void {
    if (Array.isArray(value)) {
      value.forEach((child, i) => walk(child, `${at}[${i}]`));
      return;
    }
    if (value === null || typeof value !== "object") return;
    const properties = value.properties;
    if (
      properties &&
      typeof properties === "object" &&
      !Array.isArray(properties)
    )
      for (const key of Object.keys(properties)) {
        if (["__proto__", "prototype", "constructor"].includes(key))
          issues.push(
            `${at}.properties.${key}: '${key}' is reserved and cannot be used as a generated record key.`,
          );
      }
    for (const key of ["properties", "patternProperties", "$defs"]) {
      const children = value[key];
      if (
        children !== null &&
        typeof children === "object" &&
        !Array.isArray(children)
      )
        for (const [name, child] of Object.entries(children))
          walk(child, `${at}.${key}.${name}`);
    }
    for (const key of ["items", "additionalProperties", "propertyNames", "not"])
      if (value[key] !== undefined) walk(value[key], `${at}.${key}`);
    for (const key of ["anyOf", "allOf", "oneOf", "prefixItems"])
      if (Array.isArray(value[key]))
        value[key].forEach((child, i) => walk(child, `${at}.${key}[${i}]`));
  }
  walk(schema, path);
  return issues;
}

/** Authoring conversion walks data, replacing only declared schema fields. */
export function toManifestJson(value: unknown): unknown {
  function cloneData(input: unknown): unknown {
    if (input instanceof z.ZodType)
      throw new Error(
        "Zod schemas belong only in declared manifest schema fields",
      );
    if (Array.isArray(input)) return input.map(cloneData);
    if (isRecord(input)) {
      const prototype: unknown = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null)
        throw new Error("Manifest data must contain plain JSON objects");
      return Object.fromEntries(
        Object.entries(input).map(([key, child]) => [key, cloneData(child)]),
      );
    }
    return input;
  }
  function convertSchema(input: unknown, card = false): unknown {
    if (input instanceof z.ZodObject) return toFieldSchemaJson(input);
    if (card && isRecord(input) && Object.hasOwn(input, "byCardType")) {
      if (Object.keys(input).length !== 1 || !isRecord(input.byCardType))
        throw new Error("Card variant schemas require only byCardType");
      return {
        byCardType: Object.fromEntries(
          Object.entries(input.byCardType).map(([type, schema]) => [
            type,
            convertSchema(schema),
          ]),
        ),
      };
    }
    return cloneData(input);
  }
  function entries(input: unknown, keys: readonly string[]): unknown {
    if (!Array.isArray(input)) return cloneData(input);
    return input.map((entry) =>
      isRecord(entry)
        ? Object.fromEntries(
            Object.entries(entry).map(([key, child]) => [
              key,
              keys.includes(key)
                ? convertSchema(child, key === "cardSchema")
                : cloneData(child),
            ]),
          )
        : cloneData(entry),
    );
  }
  if (!isRecord(value)) return cloneData(value);
  const json = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === "cardSets"
        ? entries(child, ["cardSchema"])
        : key === "boards"
          ? entries(child, [
              "boardFieldsSchema",
              "spaceFieldsSchema",
              "relationFieldsSchema",
              "edgeFieldsSchema",
              "vertexFieldsSchema",
            ])
          : key === "tileTypes"
            ? entries(child, [
                "fieldsSchema",
                "propertiesSchema",
                "cellFieldsSchema",
                "edgeFieldsSchema",
                "vertexFieldsSchema",
              ])
            : key === "pieceTypes" || key === "dieTypes"
              ? entries(child, ["fieldsSchema"])
              : cloneData(child),
    ]),
  );
  return json;
}

/** One converter per schema and board scope for one immutable reference context. */
export function createFieldValidatorResolver(
  contextForBoard: (boardId?: string) => FieldReferenceContext,
) {
  const validators = new Map<FieldSchemaJson, Map<string, z.ZodType>>();
  return (schema: FieldSchemaJson, boardId?: string): z.ZodType => {
    let scoped = validators.get(schema);
    if (!scoped) {
      scoped = new Map();
      validators.set(schema, scoped);
    }
    const key = boardId ?? "";
    let validator = scoped.get(key);
    if (!validator) {
      validator = fieldValidator(schema, contextForBoard(boardId));
      scoped.set(key, validator);
    }
    return validator;
  };
}
