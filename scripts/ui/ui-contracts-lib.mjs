import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { root, throwCatalogError } from "./scenario-catalog-lib.mjs";

const uiContractsPath = path.join(
  root,
  "packages/sdk/src/ui/testing/ui-contracts.ts",
);

export const knownContractCapabilities = new Set([
  "click",
  "keyboard",
  "pointer-drag",
  "touch-drag",
  "responsive-layout",
  "runtime-draft",
  "runtime-submit",
]);

function readSource(text, filename) {
  return ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
}

function unwrapExpression(node) {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyNameToString(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return undefined;
}

function literalToValue(node) {
  const unwrapped = unwrapExpression(node);
  if (
    ts.isStringLiteral(unwrapped) ||
    ts.isNoSubstitutionTemplateLiteral(unwrapped)
  ) {
    return unwrapped.text;
  }
  if (unwrapped.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (unwrapped.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (ts.isArrayLiteralExpression(unwrapped)) {
    return unwrapped.elements.map((element) => literalToValue(element));
  }
  if (ts.isObjectLiteralExpression(unwrapped)) {
    const object = {};
    for (const property of unwrapped.properties) {
      if (!ts.isPropertyAssignment(property)) {
        continue;
      }
      const key = propertyNameToString(property.name);
      if (!key) {
        continue;
      }
      object[key] = literalToValue(property.initializer);
    }
    return object;
  }
  if (ts.isCallExpression(unwrapped)) {
    if (unwrapped.arguments.length === 1) {
      return literalToValue(unwrapped.arguments[0]);
    }
  }
  return undefined;
}

function findVariable(source, name) {
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === name) {
        found = node.initializer;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

function isGlob(value) {
  return /[*?[\]{}]/.test(value);
}

function validateContracts(contracts) {
  const errors = [];
  const seen = new Set();
  for (const contract of contracts) {
    if (!contract || typeof contract !== "object") {
      errors.push("contract entries must be objects");
      continue;
    }
    if (typeof contract.id !== "string" || contract.id.length === 0) {
      errors.push("contract is missing id");
      continue;
    }
    if (seen.has(contract.id)) {
      errors.push(`duplicate contract id ${contract.id}`);
    }
    seen.add(contract.id);
    if (!["component", "primitive", "runtime"].includes(contract.kind)) {
      errors.push(`${contract.id}: unknown contract kind ${contract.kind}`);
    }
    if (typeof contract.owner !== "string" || contract.owner.length === 0) {
      errors.push(`${contract.id}: missing owner`);
    }
    if (
      !Array.isArray(contract.sourceFiles) ||
      contract.sourceFiles.length === 0
    ) {
      errors.push(`${contract.id}: missing sourceFiles`);
    }
    for (const sourceFile of contract.sourceFiles ?? []) {
      if (typeof sourceFile !== "string" || sourceFile.length === 0) {
        errors.push(`${contract.id}: sourceFiles must be non-empty strings`);
        continue;
      }
      if (
        path.isAbsolute(sourceFile) ||
        sourceFile.split(/[\\/]+/).includes("..")
      ) {
        errors.push(
          `${contract.id}: source file must be repo-relative: ${sourceFile}`,
        );
        continue;
      }
      if (!isGlob(sourceFile) && !existsSync(path.join(root, sourceFile))) {
        errors.push(`${contract.id}: missing source file ${sourceFile}`);
      }
    }
    for (const capability of contract.requiredCapabilities ?? []) {
      if (!knownContractCapabilities.has(capability)) {
        errors.push(`${contract.id}: unknown capability ${capability}`);
      }
    }
  }
  if (errors.length > 0) {
    throwCatalogError(errors);
  }
}

export async function collectUIContracts({
  sourcePath = uiContractsPath,
} = {}) {
  const source = readSource(await readFile(sourcePath, "utf8"), sourcePath);
  const contracts = literalToValue(findVariable(source, "UI_CONTRACTS"));
  if (!Array.isArray(contracts)) {
    throw new Error(`Could not read UI_CONTRACTS from ${sourcePath}`);
  }
  validateContracts(contracts);
  return contracts;
}
