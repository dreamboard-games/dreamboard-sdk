import { expect, test } from "bun:test";
import { z } from "zod";
import {
  assumeManifestSchema,
  createManifestStringLiteralSchema,
  isManifestScopedSchema,
  manifestSchemaFamily,
  markManifestScopedSchema,
  type ManifestIdSchema,
} from "./manifest";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Value extends true> = Value;
type FamilyOf<Schema> =
  Schema extends ManifestIdSchema<unknown, infer Family> ? Family : never;

test("manifest schemas retain optional semantic ID families", () => {
  const playerIdSchema = createManifestStringLiteralSchema(
    ["player-1", "player-2"] as const,
    "playerId",
  );
  const familylessSchema = createManifestStringLiteralSchema([] as const);
  const markedPlayerIdSchema = markManifestScopedSchema(
    z.string().transform((value) => value),
    "playerId",
  );
  const assumedPlayerIdSchema = assumeManifestSchema<string, "playerId">(
    markedPlayerIdSchema,
  );

  type _GeneratedFamily = Assert<
    Equal<FamilyOf<typeof playerIdSchema>, "playerId">
  >;
  type _MarkedFamily = Assert<
    Equal<FamilyOf<typeof markedPlayerIdSchema>, "playerId">
  >;
  type _AssumedFamily = Assert<
    Equal<FamilyOf<typeof assumedPlayerIdSchema>, "playerId">
  >;
  type _Familyless = Assert<
    Equal<FamilyOf<typeof familylessSchema>, undefined>
  >;
  const typeAssertions: [
    _GeneratedFamily,
    _MarkedFamily,
    _AssumedFamily,
    _Familyless,
  ] = [true, true, true, true];

  expect(typeAssertions).toEqual([true, true, true, true]);
  expect(isManifestScopedSchema(playerIdSchema)).toBe(true);
  expect(manifestSchemaFamily(playerIdSchema)).toBe("playerId");
  expect(manifestSchemaFamily(assumedPlayerIdSchema)).toBe("playerId");
  expect(isManifestScopedSchema(familylessSchema)).toBe(true);
  expect(manifestSchemaFamily(familylessSchema)).toBeUndefined();
  expect(manifestSchemaFamily(z.string())).toBeUndefined();
  expect(manifestSchemaFamily(null)).toBeUndefined();
});
