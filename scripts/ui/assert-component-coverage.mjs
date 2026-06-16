#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../..");
const sdkDir = path.join(root, "packages/sdk");
const componentsIndexPath = path.join(sdkDir, "src/ui/components/index.ts");
const coveragePath = path.join(sdkDir, "src/ui/testing/component-coverage.ts");
const storiesDir = path.join(sdkDir, "src/ui/stories");

const knownCapabilities = new Set([
  "click",
  "keyboard",
  "pointer-drag",
  "touch-drag",
  "responsive-layout",
  "runtime-draft",
  "runtime-submit",
]);

function fail(message) {
  throw new Error(`Component coverage validation failed:\n\n${message}`);
}

function sortUnique(values) {
  return [...new Set(values)].sort();
}

function format(values) {
  return values.length > 0 ? values.join(", ") : "(none)";
}

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

async function collectCoverage() {
  const text = await readFile(coveragePath, "utf8");
  const source = readSource(text, coveragePath);
  const coverage = literalToValue(findVariable(source, "COMPONENT_COVERAGE"));
  const interactiveExports = literalToValue(
    findVariable(source, "EXPORTED_INTERACTIVE_COMPONENTS"),
  );
  if (!Array.isArray(coverage) || !Array.isArray(interactiveExports)) {
    fail(`Could not read coverage arrays from ${coveragePath}`);
  }
  return { coverage, interactiveExports };
}

async function collectComponentExports() {
  const text = await readFile(componentsIndexPath, "utf8");
  const source = readSource(text, componentsIndexPath);
  const exports = [];
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) {
      continue;
    }
    const clause = statement.exportClause;
    if (!clause || !ts.isNamedExports(clause)) {
      continue;
    }
    for (const element of clause.elements) {
      if (!element.isTypeOnly) {
        exports.push(element.name.text);
      }
    }
  }
  return sortUnique(exports);
}

function slugifyTitle(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyExport(value) {
  return slugifyTitle(
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2"),
  );
}

function collectTitle(source) {
  let title;
  function visit(node) {
    if (title) {
      return;
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === "meta") {
        const initializer = unwrapExpression(node.initializer);
        if (initializer && ts.isObjectLiteralExpression(initializer)) {
          for (const property of initializer.properties) {
            if (
              ts.isPropertyAssignment(property) &&
              propertyNameToString(property.name) === "title"
            ) {
              const value = literalToValue(property.initializer);
              if (typeof value === "string") {
                title = value;
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return title;
}

async function collectStoryIds() {
  const files = (await readdir(storiesDir))
    .filter(
      (file) => file.endsWith(".stories.tsx") || file.endsWith(".stories.ts"),
    )
    .sort();
  const storyIds = [];
  for (const file of files) {
    const absolute = path.join(storiesDir, file);
    const source = readSource(await readFile(absolute, "utf8"), absolute);
    const title = collectTitle(source);
    if (!title) {
      fail(`Missing Storybook title in ${path.relative(root, absolute)}`);
    }
    for (const statement of source.statements) {
      if (
        ts.isVariableStatement(statement) &&
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        )
      ) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            storyIds.push(
              `${slugifyTitle(title)}--${slugifyExport(declaration.name.text)}`,
            );
          }
        }
      }
    }
  }
  return sortUnique(storyIds);
}

function validateCoverage({
  componentExports,
  coverage,
  interactiveExports,
  storyIds,
}) {
  const failures = [];
  const componentExportSet = new Set(componentExports);
  const coverageNames = coverage.map((entry) => entry.exportName);
  const coverageNameSet = new Set(coverageNames);
  const interactiveExportSet = new Set(interactiveExports);
  const storyIdSet = new Set(storyIds);

  const duplicateCoverageNames = sortUnique(
    coverageNames.filter(
      (name, index) => coverageNames.indexOf(name) !== index,
    ),
  );
  if (duplicateCoverageNames.length > 0) {
    failures.push(
      `Duplicate component coverage entries: ${format(duplicateCoverageNames)}`,
    );
  }

  const missingCoverage = interactiveExports.filter(
    (name) => !coverageNameSet.has(name),
  );
  if (missingCoverage.length > 0) {
    failures.push(
      `Interactive exports missing coverage entries: ${format(missingCoverage)}`,
    );
  }

  const unexportedInteractive = interactiveExports.filter(
    (name) => !componentExportSet.has(name),
  );
  if (unexportedInteractive.length > 0) {
    failures.push(
      `Interactive exports not found in public components index: ${format(
        unexportedInteractive,
      )}`,
    );
  }

  const unexpectedCoverage = coverageNames.filter(
    (name) => !interactiveExportSet.has(name),
  );
  if (unexpectedCoverage.length > 0) {
    failures.push(
      `Coverage entries not listed as interactive exports: ${format(
        unexpectedCoverage,
      )}`,
    );
  }

  const unexportedCoverage = coverageNames.filter(
    (name) => !componentExportSet.has(name),
  );
  if (unexportedCoverage.length > 0) {
    failures.push(
      `Coverage entries not found in public components index: ${format(
        unexportedCoverage,
      )}`,
    );
  }

  for (const entry of coverage) {
    if (!entry.owner || typeof entry.owner !== "string") {
      failures.push(`${entry.exportName}: missing owner`);
    }
    if (!Array.isArray(entry.storyIds) || entry.storyIds.length === 0) {
      failures.push(`${entry.exportName}: missing Storybook story IDs`);
    }
    if (
      !Array.isArray(entry.requiredCapabilities) ||
      entry.requiredCapabilities.length === 0
    ) {
      failures.push(`${entry.exportName}: missing capability tags`);
    }
    const unknownCapabilities = (entry.requiredCapabilities ?? []).filter(
      (capability) => !knownCapabilities.has(capability),
    );
    if (unknownCapabilities.length > 0) {
      failures.push(
        `${entry.exportName}: unknown capabilities ${format(unknownCapabilities)}`,
      );
    }
    const unknownStories = (entry.storyIds ?? []).filter(
      (storyId) => !storyIdSet.has(storyId),
    );
    if (unknownStories.length > 0) {
      failures.push(
        `${entry.exportName}: unknown stories ${format(unknownStories)}`,
      );
    }
  }

  if (failures.length > 0) {
    fail(failures.join("\n"));
  }
}

async function main() {
  const componentExports = await collectComponentExports();
  const storyIds = await collectStoryIds();
  const { coverage, interactiveExports } = await collectCoverage();
  validateCoverage({
    componentExports,
    coverage,
    interactiveExports,
    storyIds,
  });

  const runtimeGaps = coverage.filter(
    (entry) =>
      entry.requiredCapabilities.some((capability) =>
        capability.startsWith("runtime-"),
      ) && entry.workbenchScenarioIds.length === 0,
  );

  console.log(`OK component exports: ${componentExports.length}`);
  console.log(`OK discovered story IDs: ${storyIds.length}`);
  console.log(`OK interactive component coverage entries: ${coverage.length}`);
  if (runtimeGaps.length > 0) {
    console.log(
      `Runtime capability gaps awaiting Workbench coverage: ${runtimeGaps
        .map((entry) => entry.exportName)
        .join(", ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
