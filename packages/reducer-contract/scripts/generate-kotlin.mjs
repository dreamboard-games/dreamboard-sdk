#!/usr/bin/env node
// Emits Kotlin data classes + sealed interfaces with kotlinx.serialization
// annotations from schema/reducer-runtime.schema.json, plus reducer bundle
// operation metadata from schema/reducer-runtime.operations.json.
//
// Why a bespoke generator instead of json-kotlin-schema-codegen:
//   1. The source is one JSON file; neither language's toolchain is privileged.
//   2. json-kotlin-schema-codegen does NOT emit @Serializable sealed interfaces
//      for oneOf. We need that AND we want variant classes NESTED inside the
//      sealed interface so downstream code can write `is Effect.Transition`,
//      `GameInput.Action(...)`, etc. Easier to write ~250 lines here than
//      post-process.
//
// Output conventions:
//   - Every stand-alone object type is a top-level @Serializable data class.
//   - Every oneOf becomes a sealed interface with @JsonClassDiscriminator;
//     variants are NESTED inside the interface, and their names are the
//     variant schema name with the parent prefix stripped:
//       EffectTransition     -> Effect.Transition
//       GameInputAction      -> GameInput.Action
//       ReduceResultAccept   -> ReduceResult.Accept
//       DispatchTraceRngConsumption -> DispatchTrace.RngConsumption
//   - JSON's free-form values ("JsonValue" def) map to kotlinx.serialization
//     JsonElement so we never lose structure.
//   - ContinuationMap becomes Map<String, ContinuationToken> at every use
//     site (no top-level typealias emitted).
//   - Optional fields follow Kotlin idiom:
//       array  -> non-nullable, default `emptyList()`
//       map    -> non-nullable, default `emptyMap()`
//       other  -> nullable, default `null`
//   - ReducerBundleOperations is generated from reducer-runtime.operations.json
//     so JVM callers do not hand-spell the reducer callable boundary.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(ROOT, "schema", "reducer-runtime.schema.json");
const OPERATIONS_PATH = path.join(
  ROOT,
  "schema",
  "reducer-runtime.operations.json",
);
const PKG_PATH = path.join(ROOT, "package.json");
const GENERATED_OUT_DIR = path.join(
  ROOT,
  "build",
  "generated-src",
  "main",
  "kotlin",
  "com",
  "dreamboard",
  "reducer",
  "contract",
);
const CHECKED_IN_OUT_DIR = path.join(
  ROOT,
  "src",
  "checked-in",
  "kotlin",
  "com",
  "dreamboard",
  "reducer",
  "contract",
);
const OUT_DIRS = [GENERATED_OUT_DIR, CHECKED_IN_OUT_DIR];

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const operationsContract = JSON.parse(fs.readFileSync(OPERATIONS_PATH, "utf8"));
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
const defs = schema.$defs;

for (const outDir of OUT_DIRS) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
}

function refName(ref) {
  const m = /^#\/\$defs\/(.+)$/.exec(ref);
  if (!m) throw new Error(`Unsupported $ref: ${ref}`);
  return m[1];
}

function assertKnownWireType(typeName, fieldName) {
  if (!defs[typeName]) {
    throw new Error(
      `Unknown reducer wire type '${typeName}' in ${fieldName}; expected a $defs entry in schema/reducer-runtime.schema.json.`,
    );
  }
}

function assertOperationsContract() {
  if (!operationsContract.versionProperty) {
    throw new Error("Missing versionProperty in reducer-runtime.operations.json.");
  }
  if (!Array.isArray(operationsContract.operations)) {
    throw new Error("Missing operations[] in reducer-runtime.operations.json.");
  }
  assertKnownWireType(
    operationsContract.versionProperty.type,
    "versionProperty.type",
  );

  const seenOperationNames = new Set();
  for (const operation of operationsContract.operations) {
    if (
      typeof operation.name !== "string" ||
      !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(operation.name)
    ) {
      throw new Error(
        "Every reducer operation must have a valid JavaScript/Kotlin method name.",
      );
    }
    if (seenOperationNames.has(operation.name)) {
      throw new Error(`Duplicate reducer operation '${operation.name}'.`);
    }
    seenOperationNames.add(operation.name);

    if (typeof operation.input === "string") {
      assertKnownWireType(operation.input, `${operation.name}.input`);
    } else if (operation.input !== null) {
      throw new Error(
        `Operation '${operation.name}' must set input to a known wire type or null.`,
      );
    }
    if (operation.input === null && operation.name !== "projectStatic") {
      throw new Error(
        `Operation '${operation.name}' has no input; only projectStatic may be zero-argument.`,
      );
    }
    if (operation.name === "projectStatic" && operation.input !== null) {
      throw new Error("Operation 'projectStatic' must stay zero-argument.");
    }
    if (typeof operation.output !== "string") {
      throw new Error(`Operation '${operation.name}' must have a string output.`);
    }
    assertKnownWireType(operation.output, `${operation.name}.output`);
  }
}

assertOperationsContract();

const JSON_ELEMENT = "JsonElement";

/**
 * Index of sealed-interface variants: variantName -> { parent, nested }.
 * Built in one pass before emission so `kotlinTypeOf` can rewrite refs into
 * Parent.Nested form wherever they appear as a field type (unusual here, but
 * safe).
 */
const variantIndex = new Map();
for (const [parentName, def] of Object.entries(defs)) {
  if (!def.oneOf) continue;
  for (const member of def.oneOf) {
    const variantName = refName(member.$ref);
    const nested = stripParentPrefix(variantName, parentName);
    variantIndex.set(variantName, { parent: parentName, nested });
  }
}

function stripParentPrefix(variantName, parentName) {
  if (variantName.startsWith(parentName) && variantName !== parentName) {
    return variantName.slice(parentName.length);
  }
  return variantName;
}

function kotlinTypeOf(def) {
  const nullable = nullableAnyOf(def);
  if (nullable) return `${kotlinTypeOf(nullable)}?`;
  if (def.$ref) {
    const name = refName(def.$ref);
    // Aliases that short-circuit to kotlinx primitives.
    if (name === "JsonValue") return JSON_ELEMENT;
    if (name === "ContinuationMap") return "Map<String, ContinuationToken>";
    if (name === "EffectId") return "String";
    if (name === "ReducerContractVersion") return "String";
    if (variantIndex.has(name)) {
      const { parent, nested } = variantIndex.get(name);
      return `${parent}.${nested}`;
    }
    return name;
  }
  if (def.const !== undefined && typeof def.const === "string") return "String";
  if (def.oneOf || def.anyOf) return JSON_ELEMENT;
  if (Array.isArray(def.type)) return JSON_ELEMENT;
  switch (def.type) {
    case "string":
      return "String";
    case "number":
      return "Double";
    case "integer":
      if (def.format === "int64") return "Long";
      return "Int";
    case "boolean":
      return "Boolean";
    case "null":
      return JSON_ELEMENT;
    case "array":
      return def.items ? `List<${kotlinTypeOf(def.items)}>` : "List<JsonElement>";
    case "object":
      if (def.additionalProperties && !def.properties) {
        return `Map<String, ${kotlinTypeOf(def.additionalProperties)}>`;
      }
      return JSON_ELEMENT;
    default:
      return JSON_ELEMENT;
  }
}

function nullableAnyOf(def) {
  const members = def?.anyOf;
  if (!Array.isArray(members) || members.length !== 2) return null;
  const nonNull = members.find((member) => member.type !== "null");
  const nullMember = members.find((member) => member.type === "null");
  return nonNull && nullMember ? nonNull : null;
}

function optionalityFor(def) {
  if (nullableAnyOf(def)) {
    return { nullableSuffix: "", default: "null" };
  }
  if (def.$ref) {
    const name = refName(def.$ref);
    if (name === "ContinuationMap") {
      return { nullableSuffix: "", default: "emptyMap()" };
    }
  }
  if (def.type === "array") {
    return { nullableSuffix: "", default: "emptyList()" };
  }
  if (
    def.type === "object" &&
    def.additionalProperties &&
    !def.properties
  ) {
    return { nullableSuffix: "", default: "emptyMap()" };
  }
  return { nullableSuffix: "?", default: "null" };
}

function unionDiscriminator(def) {
  if (!def.oneOf) return null;
  for (const member of def.oneOf) {
    const target = member.$ref ? defs[refName(member.$ref)] : member;
    if (!target?.properties) continue;
    if (target.properties.kind?.const !== undefined) return "kind";
    if (target.properties.type?.const !== undefined) return "type";
  }
  return null;
}

function headerComment() {
  return [
    `// @generated by packages/reducer-contract/scripts/generate-kotlin.mjs`,
    `// DO NOT EDIT BY HAND. Edit schema/reducer-runtime*.json and rerun`,
    `// \`pnpm --filter=@dreamboard-games/reducer-contract generate\`.`,
  ].join("\n");
}

function emitFileHeader() {
  return [
    headerComment(),
    ``,
    `@file:Suppress("ktlint:standard:filename", "MaximumLineLength", "MaxLineLength")`,
    ``,
    `package com.dreamboard.reducer.contract`,
    ``,
    `import kotlinx.serialization.SerialName`,
    `import kotlinx.serialization.SerializationStrategy`,
    `import kotlinx.serialization.Serializable`,
    `import kotlinx.serialization.json.JsonClassDiscriminator`,
    `import kotlinx.serialization.json.JsonElement`,
    ``,
  ].join("\n");
}

function safeKtName(name) {
  const reserved = new Set(["in", "is", "as", "object", "fun", "val", "var"]);
  return reserved.has(name) ? `\`${name}\`` : name;
}

function emitPropertyLine(key, propDef, required, indent) {
  if (propDef.const !== undefined) {
    if (typeof propDef.const !== "string") {
      throw new Error(`Unsupported non-string const for Kotlin property '${key}'.`);
    }
    return `${indent}@SerialName(${JSON.stringify(key)})\n${indent}val ${safeKtName(
      key,
    )}: String = ${JSON.stringify(propDef.const)},`;
  }

  const ktType = kotlinTypeOf(propDef);
  let suffix = "";
  let default_ = "";
  if (!required.has(key)) {
    const opt = optionalityFor(propDef);
    suffix = opt.nullableSuffix;
    default_ = ` = ${opt.default}`;
  }
  return `${indent}@SerialName(${JSON.stringify(key)})\n${indent}val ${safeKtName(
    key,
  )}: ${ktType}${suffix}${default_},`;
}

function emitTopLevelDataClass(name, def) {
  const required = new Set(def.required ?? []);
  const propLines = Object.entries(def.properties ?? {})
    .map(([key, propDef]) => emitPropertyLine(key, propDef, required, "    "))
    .filter(Boolean);
  return [
    `@Serializable`,
    `data class ${name}(`,
    propLines.join("\n"),
    `)`,
  ].join("\n");
}

function emitNestedVariant(parentName, variantName, def, discriminator) {
  const required = new Set(def.required ?? []);
  const discriminatorValue = def.properties[discriminator].const;
  const nestedName = stripParentPrefix(variantName, parentName);
  const propLines = Object.entries(def.properties)
    .map(([key, propDef]) => {
      if (propDef.const !== undefined && key === discriminator) return null;
      return emitPropertyLine(key, propDef, required, "        ");
    })
    .filter(Boolean);
  // Object form when only the discriminator distinguishes the variant.
  if (propLines.length === 0) {
    return [
      `    @Serializable`,
      `    @SerialName(${JSON.stringify(discriminatorValue)})`,
      `    data object ${nestedName} : ${parentName}`,
    ].join("\n");
  }
  return [
    `    @Serializable`,
    `    @SerialName(${JSON.stringify(discriminatorValue)})`,
    `    data class ${nestedName}(`,
    propLines.join("\n"),
    `    ) : ${parentName}`,
  ].join("\n");
}

function emitSealedInterface(name, def) {
  const discriminator = unionDiscriminator(def);
  if (!discriminator) {
    throw new Error(`oneOf for ${name} has no string const discriminator`);
  }
  const lines = [];
  lines.push(`@Serializable`);
  lines.push(`@JsonClassDiscriminator(${JSON.stringify(discriminator)})`);
  lines.push(`sealed interface ${name} {`);
  const variantBodies = def.oneOf.map((member) => {
    const variantName = refName(member.$ref);
    const variantDef = defs[variantName];
    return emitNestedVariant(name, variantName, variantDef, discriminator);
  });
  lines.push(variantBodies.join("\n\n"));
  lines.push(`}`);
  return lines.join("\n");
}

function screamingSnake(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .toUpperCase();
}

function emitOperationMetadata() {
  const lines = [];
  lines.push(
    `/** Generated metadata for the callable reducer bundle boundary. */`,
  );
  lines.push(`enum class ReducerBundlePayloadMeasurement {`);
  lines.push(`    NONE,`);
  lines.push(`    JSON_BYTES,`);
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `data class ReducerBundleRequestOperation<I>(`,
  );
  lines.push(`    val methodName: String,`);
  lines.push(`    val requestSerializer: SerializationStrategy<I>,`);
  lines.push(`    val requestPayloadMeasurement: ReducerBundlePayloadMeasurement,`);
  lines.push(`    val responsePayloadMeasurement: ReducerBundlePayloadMeasurement,`);
  lines.push(`)`);
  lines.push(``);
  lines.push(`data class ReducerBundleNoInputOperation(`);
  lines.push(`    val methodName: String,`);
  lines.push(`    val requestPayloadMeasurement: ReducerBundlePayloadMeasurement,`);
  lines.push(`    val responsePayloadMeasurement: ReducerBundlePayloadMeasurement,`);
  lines.push(`)`);
  lines.push(``);
  lines.push(`object ReducerBundleOperations {`);
  lines.push(
    `    const val VERSION_PROPERTY: String = ${JSON.stringify(
      operationsContract.versionProperty.name,
    )}`,
  );

  for (const operation of operationsContract.operations) {
    const constantName = `${screamingSnake(operation.name)}_METHOD`;
    lines.push(
      `    const val ${constantName}: String = ${JSON.stringify(operation.name)}`,
    );
  }

  lines.push(``);
  lines.push(`    val REQUIRED_METHOD_NAMES: List<String> = listOf(`);
  for (const operation of operationsContract.operations) {
    lines.push(`        ${screamingSnake(operation.name)}_METHOD,`);
  }
  lines.push(`    )`);

  for (const operation of operationsContract.operations) {
    const propertyName = screamingSnake(operation.name);
    const methodConstant = `${propertyName}_METHOD`;
    lines.push(``);
    if (operation.input === null) {
      lines.push(
        `    val ${propertyName}: ReducerBundleNoInputOperation = ReducerBundleNoInputOperation(`,
      );
      lines.push(`        methodName = ${methodConstant},`);
      lines.push(`        requestPayloadMeasurement = ReducerBundlePayloadMeasurement.NONE,`);
      lines.push(`        responsePayloadMeasurement = ReducerBundlePayloadMeasurement.JSON_BYTES,`);
      lines.push(`    )`);
    } else {
      lines.push(
        `    val ${propertyName}: ReducerBundleRequestOperation<${operation.input}> = ReducerBundleRequestOperation(`,
      );
      lines.push(`        methodName = ${methodConstant},`);
      lines.push(`        requestSerializer = ${operation.input}.serializer(),`);
      lines.push(`        requestPayloadMeasurement = ReducerBundlePayloadMeasurement.JSON_BYTES,`);
      lines.push(`        responsePayloadMeasurement = ReducerBundlePayloadMeasurement.JSON_BYTES,`);
      lines.push(`    )`);
    }
  }

  lines.push(`}`);
  return lines.join("\n");
}

// Types we don't emit as Kotlin declarations (they're primitive aliases or
// Map<String, X> used in-line).
const skipTopLevel = new Set([
  "JsonValue",
  "ContinuationMap",
  "EffectId",
  "ReducerContractVersion",
]);

const emitted = [];
for (const [name, def] of Object.entries(defs)) {
  if (skipTopLevel.has(name)) continue;

  if (def.oneOf) {
    emitted.push({ name, body: emitSealedInterface(name, def) });
    continue;
  }

  // Skip variants-of-sealed-interface; they are emitted nested inside their
  // parent sealed interface above.
  if (variantIndex.has(name)) continue;

  if (def.type === "object" && def.properties) {
    emitted.push({ name, body: emitTopLevelDataClass(name, def) });
  }
}

const file = [
  emitFileHeader(),
  emitted.map((e) => e.body).join("\n\n"),
  ``,
  emitOperationMetadata(),
  ``,
  `/**`,
  ` * Wire-protocol version implemented by this generated code. Must match`,
  ` * the JS bundle's REDUCER_CONTRACT_VERSION at load time.`,
  ` */`,
  `public const val REDUCER_CONTRACT_VERSION: String = ${JSON.stringify(pkg.version)}`,
  ``,
].join("\n");

for (const outDir of OUT_DIRS) {
  fs.writeFileSync(path.join(outDir, "ReducerContract.kt"), file);
}

console.log(
  `✓ reducer-contract kotlin codegen: wrote ${OUT_DIRS.map((outDir) => `${path.relative(ROOT, outDir)}/ReducerContract.kt`).join(", ")} (${pkg.version})`,
);
