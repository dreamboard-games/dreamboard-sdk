import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import { asPlayerId } from "../per-player";
import type { FieldSchemaJson } from "../../shared/domain/contracts";
import * as z from "zod";
import { expect, test } from "vitest";
import { compileManifest } from "./compiler";
import { defineTopologyManifest } from "./authoring";
import {
  FIELD_REF_KEY,
  FIELD_REF_FAMILIES,
  fieldValidator,
  ref,
  toFieldSchemaJson,
} from "./field-schemas";

const ids = Object.fromEntries(
  FIELD_REF_FAMILIES.map((family) => [family, ["known"]]),
);
const context = { stage: "session" as const, ids };
const base = {
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [],
};

test("portable fields preserve acceptance, nested defaults and omission", () => {
  const schema = z.object({
    text: z.string().min(2).max(5),
    count: z.int().min(0),
    ratio: z.number().max(2),
    enabled: z.boolean(),
    category: z.enum(["a", "b"]),
    fixed: z.literal("yes"),
    nested: z.object({ level: z.int().default(1) }),
    list: z.array(z.string()).min(1),
    values: z.record(z.string(), z.boolean()),
    nullable: z.string().nullable(),
    optional: z.string().optional(),
    defaulted: z.int().default(3),
  });
  const validator = fieldValidator(toFieldSchemaJson(schema), context);
  const valid = {
    text: "hello",
    count: 1,
    ratio: 1.5,
    enabled: true,
    category: "a",
    fixed: "yes",
    nested: {},
    list: ["x"],
    values: { x: true },
    nullable: null,
  };
  expect(validator.parse(valid)).toEqual(schema.parse(valid));
  for (const invalid of [
    { ...valid, text: "x" },
    { ...valid, count: 1.5 },
    { ...valid, enabled: "true" },
    { ...valid, category: "c" },
    { ...valid, fixed: "no" },
    { ...valid, list: [] },
    { ...valid, values: { x: 1 } },
    { ...valid, nullable: 1 },
  ])
    expect(validator.safeParse(invalid).success).toBe(false);
});

test.each(FIELD_REF_FAMILIES)(
  "%s references resolve at the selected stage",
  (family) => {
    const validator = fieldValidator(
      toFieldSchemaJson(z.object({ value: ref[family]() })),
      context,
    );
    expect(validator.parse({ value: "known" })).toEqual({ value: "known" });
    expect(validator.safeParse({ value: "unknown" }).success).toBe(false);
  },
);

test("rejects checks and schemas whose meaning is not portable", () => {
  for (const field of [
    z.string().refine((value) => value.length > 2),
    z.string().transform((value) => value.length),
    z.string().trim(),
    z.string().toLowerCase(),
    z.string().normalize(),
    z.string().overwrite((value) => value),
    z.coerce.number(),
    z.date(),
    z.bigint(),
    z.custom(),
    z.string().regex(/x/i),
  ])
    expect(() => toFieldSchemaJson(z.object({ field }))).toThrow();
});

test("default callbacks are sampled once and exported as concrete JSON", () => {
  let calls = 0;
  const source = {
    ...base,
    pieceTypes: [
      {
        id: "token",
        name: "Token",
        fieldsSchema: z.object({ n: z.int().default(() => ++calls) }),
      },
    ],
    pieceSeeds: [{ typeId: "token" }],
  };
  const defined = defineTopologyManifest(source);
  expect(calls).toBe(1);
  expect(JSON.parse(JSON.stringify(defined))).toEqual(defined);
  const compiled = compileManifest(defined);
  expect(
    compiled.createInitialTable({ playerIds: ["player-1", "player-2"] }).pieces
      .token.properties.n,
  ).toBe(1);
  expect(
    compiled.createInitialTable({ playerIds: ["player-1", "player-2"] }).pieces
      .token.properties.n,
  ).toBe(1);
  expect(calls).toBe(1);
});

test("marker-looking default data is data, and invalid reference defaults fail", () => {
  const schema = z.object({
    value: z
      .object({ [FIELD_REF_KEY]: z.string(), constructor: z.string() })
      .default({ [FIELD_REF_KEY]: "not-a-family", constructor: "data" }),
  });
  const json = toFieldSchemaJson(schema);
  expect(fieldValidator(json, context).parse({})).toEqual({
    value: { [FIELD_REF_KEY]: "not-a-family", constructor: "data" },
  });
  expect(() =>
    fieldValidator(
      toFieldSchemaJson(
        z.object({
          // @ts-expect-error Intentionally invalid unbranded reference default tests JSON admission.
          value: ref.zoneId().default("unknown"),
        }),
      ),
      context,
    ),
  ).toThrow();
});

test("plain JSON rejects unsupported constraints and schemas outside declared slots", () => {
  expect(() =>
    fieldValidator({ type: "object", unevaluatedProperties: false }, context),
  ).toThrow("Unsupported");
  expect(() =>
    compileManifest({
      ...base,
      pieceTypes: [
        {
          id: "token",
          name: "Token",
          fieldsSchema: { type: "object", dependentRequired: { a: ["b"] } },
        },
      ],
    }),
  ).toThrow("Unsupported");
  expect(
    () =>
      void Reflect.apply(defineTopologyManifest, undefined, [
        { ...base, metadata: z.object({}) },
      ]),
  ).toThrow("schema fields");
});

test("static board fields reject references to another board and carry field paths", () => {
  const source = {
    ...base,
    boards: [
      {
        layout: "generic" as const,
        scope: "shared" as const,
        id: "first",
        name: "First",
        spaceFieldsSchema: z.object({ next: ref.spaceId() }),
        spaces: [{ id: "a", fields: { next: "b" } }],
      },
      {
        layout: "generic" as const,
        scope: "shared" as const,
        id: "second",
        name: "Second",
        spaces: [{ id: "b" }],
      },
    ],
  };
  expect(
    () =>
      void Reflect.apply(defineTopologyManifest<unknown>, undefined, [source]),
  ).toThrow("manifest.boards[0].spaces[0].fields.next");
});

test("session references use the active roster, not compiler placeholder players", () => {
  const source = {
    ...base,
    pieceTypes: [
      {
        id: "token",
        name: "Token",
        fieldsSchema: z.object({
          actor: ref.playerId().nullable().default(null),
        }),
      },
    ],
    pieceSeeds: [{ typeId: "token" }],
  };
  const compiled = compileManifest(source);
  const table = compiled.createInitialTable({ playerIds: ["alice"] });
  table.pieces.token.properties.actor = asPlayerId("alice");
  expect(compiled.tableSchema.safeParse(table).success).toBe(true);
  table.pieces.token.properties.actor = asPlayerId("player-1");
  expect(compiled.tableSchema.safeParse(table).success).toBe(false);
});

test("ordinary, strict and loose object modes preserve their output policies", () => {
  const input = { a: "ok", extra: 1 };
  const ordinary = z.object({ a: z.string() });
  expect(
    fieldValidator(toFieldSchemaJson(ordinary), context).parse(input),
  ).toEqual(ordinary.parse(input));
  const strict = z.strictObject({ a: z.string() });
  expect(
    fieldValidator(toFieldSchemaJson(strict), context).safeParse(input).success,
  ).toBe(false);
  const loose = z.looseObject({ a: z.string() });
  expect(
    fieldValidator(toFieldSchemaJson(loose), context).parse(input),
  ).toEqual(loose.parse(input));
  expect(input).toEqual({ a: "ok", extra: 1 });
});

test("nested nullable objects, arrays, records and concrete defaults normalize output without mutation", () => {
  const child = z.object({ a: z.string() });
  const schema = z.object({
    nullable: child.nullable(),
    array: z.array(child),
    record: z.record(z.string(), child),
    defaulted: child.default({ a: "default" }),
  });
  const input = {
    nullable: { a: "x", extra: true },
    array: [{ a: "y", extra: true }],
    record: { key: { a: "z", extra: true } },
  };
  const before = structuredClone(input);
  const json = toFieldSchemaJson(schema);
  const document = structuredClone(json);
  expect(fieldValidator(json, context).parse(input)).toEqual(
    schema.parse(input),
  );
  expect(input).toEqual(before);
  expect(json).toEqual(document);
  expect(() =>
    toFieldSchemaJson(
      z.object({ record: z.record(z.enum(["a", "b"]), z.number()) }),
    ),
  ).toThrow("string key");
});

test("schema-shaped data does not become an authoring schema slot", () => {
  const source = {
    ...base,
    pieceTypes: [{ id: "token", name: "Token" }],
    pieceSeeds: [{ typeId: "token", fields: { fieldsSchema: z.object({}) } }],
  };
  expect(
    () =>
      void Reflect.apply(defineTopologyManifest<unknown>, undefined, [source]),
  ).toThrow("declared manifest schema");
});

test("explicit reference enum constraints are intersected with current membership", () => {
  const schema = {
    type: "object",
    properties: {
      id: {
        type: "string",
        enum: ["known", "other"],
        [FIELD_REF_KEY]: "cardId",
      },
    },
    required: ["id"],
  };
  const validator = fieldValidator(schema, context);
  expect(validator.safeParse({ id: "known" }).success).toBe(true);
  expect(validator.safeParse({ id: "other" }).success).toBe(false);
});

test.each([new Date(), new Map(), new Set()])(
  "non-JSON object instances fail admission instead of becoming empty objects",
  (value) => {
    expect(
      () =>
        void Reflect.apply(defineTopologyManifest, undefined, [
          { ...base, metadata: value },
        ]),
    ).toThrow("plain JSON");
  },
);

test("custom roster board fields resolve within the instantiated board's definition", () => {
  const source = {
    ...base,
    boards: [
      {
        layout: "generic" as const,
        scope: "perPlayer" as const,
        id: "personal",
        name: "Personal",
        boardFieldsSchema: z.object({ selected: ref.spaceId().optional() }),
        fields: { selected: "own" },
        spaces: [{ id: "own" }],
      },
      {
        layout: "generic" as const,
        scope: "shared" as const,
        id: "common",
        name: "Common",
        spaces: [{ id: "other" }],
      },
    ],
  };
  const compiled = compileManifest(source);
  const table = compiled.createInitialTable({ playerIds: ["alice"] });
  expect(compiled.tableSchema.safeParse(table).success).toBe(true);
  expect(compiled.boardDefinitions.personal.fields.selected).toBe("own");
  expect(() =>
    compileManifest({
      ...source,
      boards: source.boards.map((board) =>
        board.id === "personal"
          ? { ...board, fields: { selected: "other" } }
          : board,
      ),
    }),
  ).toThrow();
  const boardId = perPlayerInstanceId("board", "personal", "alice");
  expect(
    compiled.tableSchema.safeParse({
      ...table,
      boards: {
        ...table.boards,
        [boardId]: { ...table.boards[boardId], fields: { selected: "other" } },
      },
    }).success,
  ).toBe(false);
});

test("concrete defaults must already conform to output instead of being transformed", () => {
  const extra = { a: "x", extra: 1 };
  const child = z.object({ a: z.string() });
  expect(() =>
    fieldValidator(
      toFieldSchemaJson(z.object({ child: child.default(extra) })),
      context,
    ),
  ).toThrow("output shape");
  const parent = z.object({ a: z.string().default("x") });
  expect(() =>
    fieldValidator(
      toFieldSchemaJson(
        z.object({
          // @ts-expect-error A concrete default must contain its complete output fields.
          child: parent.default({}),
        }),
      ),
      context,
    ),
  ).toThrow();
  expect(extra).toEqual({ a: "x", extra: 1 });
  expect(() =>
    toFieldSchemaJson(
      z.object({
        // @ts-expect-error Non-JSON defaults are deliberately rejected at runtime.
        child: z.object({}).default(new Map()),
      }),
    ),
  ).toThrow("plain JSON");
});

test("catchall defaults are sampled once and recursive objects are rejected clearly", () => {
  let samples = 0;
  const schema = z.object({}).catchall(
    z.string().default(() => {
      samples++;
      return "value";
    }),
  );
  const json = toFieldSchemaJson(schema);
  expect(samples).toBe(1);
  expect(fieldValidator(json, context).parse({ extra: "provided" })).toEqual({
    extra: "provided",
  });
  expect(samples).toBe(1);
  const recursive: z.ZodObject = z.object({
    get child() {
      return recursive;
    },
  });
  expect(() => toFieldSchemaJson(recursive)).toThrow("recursive field");
});

test("string formats whose options cannot round trip are rejected", () => {
  for (const field of [
    z.string().url({ protocol: /^https$/, hostname: /^example\.com$/ }),
    z.string().url({ normalize: true }),
    z.email({ pattern: /^custom$/ }),
  ]) {
    expect(() => toFieldSchemaJson(z.object({ field }))).toThrow(
      /string formats are not portable|unsupported field schema/,
    );
  }
  expect(() =>
    fieldValidator(
      {
        type: "object",
        properties: { value: { type: "string", format: "uri" } },
      },
      context,
    ),
  ).toThrow("Unsupported");
});

test("unused declared JSON fields still require object roots", () => {
  expect(() =>
    compileManifest({
      ...base,
      cardSets: [
        {
          id: "unused",
          name: "Unused",
          defaultHome: { type: "detached" },
          cardSchema: { type: "number" },
          cards: [],
        },
      ],
    }),
  ).toThrow("Field schemas must describe an object");
  expect(() =>
    fieldValidator(
      { type: "object", properties: { value: { type: "unsupported" } } },
      context,
    ),
  ).toThrow("Unsupported field JSON Schema type");
});

test("metadata cannot override portable validation", () => {
  for (const metadata of [{ type: "number" }, { minLength: 9 }])
    expect(() =>
      toFieldSchemaJson(z.object({ value: z.string().meta(metadata) })),
    ).toThrow("behavioral metadata");
  const schema = toFieldSchemaJson(
    z.object({
      value: ref.cardId().describe("Card").meta({ title: "Selected card" }),
    }),
  );
  expect(fieldValidator(schema, context).parse({ value: "known" })).toEqual({
    value: "known",
  });
});

test("object catchall sentinels still enforce portability guards", () => {
  expect(() =>
    toFieldSchemaJson(
      z.object({}).catchall(z.unknown().meta({ type: "string" })),
    ),
  ).toThrow("behavioral metadata");
  expect(() =>
    toFieldSchemaJson(z.object({}).catchall(z.unknown().refine(() => true))),
  ).toThrow("unsupported portable check");
  expect(() => toFieldSchemaJson(z.strictObject({}))).not.toThrow();
  expect(() => toFieldSchemaJson(z.looseObject({}))).not.toThrow();
});

test("empty reference membership cannot erase invalid defaults", () => {
  const empty = { stage: "session" as const, ids: { ...ids, cardId: [] } };
  const invalid = toFieldSchemaJson(
    // @ts-expect-error Invalid branded default exercises runtime admission.
    z.object({ selected: ref.cardId().default("known") }),
  );
  expect(() => fieldValidator(invalid, empty)).toThrow("never");
  const optional = fieldValidator(
    toFieldSchemaJson(z.object({ selected: ref.cardId().optional() })),
    empty,
  );
  expect(optional.parse({})).toEqual({});
  expect(optional.safeParse({ selected: "known" }).success).toBe(false);
});

test("reference membership intersects authored string constraints", () => {
  const source = z.object({ id: ref.cardId().min(8).max(12).regex(/^long/) });
  const validator = fieldValidator(toFieldSchemaJson(source), {
    ...context,
    ids: {
      ...ids,
      cardId: ["short", "long-enough", "wrong-value", "long-too-long-value"],
    },
  });
  for (const id of [
    "short",
    "long-enough",
    "wrong-value",
    "long-too-long-value",
    "long-absent",
  ])
    expect(validator.safeParse({ id }).success).toBe(
      source.safeParse({ id }).success && id !== "long-absent",
    );
});

test("external discrete values retain typed constraints and defaults", () => {
  const schema = {
    type: "object",
    properties: {
      value: {
        type: "string",
        enum: ["short", "long-enough"],
        const: "long-enough",
        minLength: 8,
        pattern: "^long",
        default: "long-enough",
      },
    },
  };
  const validator = fieldValidator(schema, context);
  expect(validator.parse({})).toEqual({ value: "long-enough" });
  expect(validator.safeParse({ value: "short" }).success).toBe(false);
  expect(validator.safeParse({ value: "long-other" }).success).toBe(false);
  const referenced = fieldValidator(
    {
      ...schema,
      properties: {
        value: { ...schema.properties.value, [FIELD_REF_KEY]: "cardId" },
      },
    },
    {
      ...context,
      ids: { ...ids, cardId: ["short", "long-enough", "long-other"] },
    },
  );
  expect(referenced.parse({})).toEqual({ value: "long-enough" });
  expect(referenced.safeParse({ value: "short" }).success).toBe(false);
  expect(referenced.safeParse({ value: "long-other" }).success).toBe(false);
  const numeric = fieldValidator(
    {
      type: "object",
      properties: { value: { type: "integer", enum: [1, 2.5, 4], minimum: 2 } },
    },
    context,
  );
  expect(numeric.safeParse({ value: 1 }).success).toBe(false);
  expect(numeric.safeParse({ value: 2.5 }).success).toBe(false);
  expect(numeric.parse({ value: 4 })).toEqual({ value: 4 });
  expect(() =>
    fieldValidator(
      {
        ...schema,
        properties: { value: { ...schema.properties.value, default: "short" } },
      },
      context,
    ),
  ).toThrow();
  const nullable = fieldValidator(
    {
      type: "object",
      properties: {
        value: {
          type: ["string", "null"],
          enum: [null, "long-enough", "short"],
          minLength: 8,
        },
      },
    },
    context,
  );
  expect(nullable.parse({ value: null })).toEqual({ value: null });
  expect(nullable.safeParse({ value: "short" }).success).toBe(false);
  expect(() =>
    fieldValidator(
      {
        type: "object",
        properties: { value: { type: "number", [FIELD_REF_KEY]: "cardId" } },
      },
      context,
    ),
  ).toThrow("string schema");
  expect(() =>
    fieldValidator(
      { type: "object", properties: { value: { enum: ["a"], minLength: 8 } } },
      context,
    ),
  ).toThrow("explicit type");
});

test("external keyword values cannot silently skip validation", () => {
  const invalidSchemas: FieldSchemaJson[] = [
    { type: "object", required: ["missing"] },
    { type: "object", required: "x" },
    { type: "string", minLength: "x" },
    { type: "number", minimum: "x" },
    { type: "string", enum: "x" },
    { type: "string", pattern: 1 },
    {
      type: ["array", "null"],
      items: {
        type: "object",
        ["x-dreamboard-object-mode"]: "strip",
        properties: {},
      },
    },
  ];
  for (const value of invalidSchemas)
    expect(() =>
      fieldValidator({ type: "object", properties: { value } }, context),
    ).toThrow();
});
