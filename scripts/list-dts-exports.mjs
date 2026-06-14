#!/usr/bin/env node
import { readFileSync } from "node:fs";
import ts from "typescript";

const [, , dtsPath] = process.argv;

if (!dtsPath) {
  console.error("Usage: node scripts/list-dts-exports.mjs <file.d.ts>");
  process.exit(2);
}

const sourceText = readFileSync(dtsPath, "utf8");
const sourceFile = ts.createSourceFile(
  dtsPath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const exportNames = new Set();

function hasExportModifier(node) {
  return Boolean(
    node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ),
  );
}

function addDeclarationName(node) {
  if (hasExportModifier(node) && node.name?.text) {
    exportNames.add(node.name.text);
  }
}

function visit(node) {
  if (ts.isExportDeclaration(node)) {
    const clause = node.exportClause;
    if (clause && ts.isNamedExports(clause)) {
      for (const element of clause.elements) {
        exportNames.add(element.name.text);
      }
    }
  } else if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isModuleDeclaration(node)
  ) {
    addDeclarationName(node);
  } else if (ts.isVariableStatement(node) && hasExportModifier(node)) {
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        exportNames.add(declaration.name.text);
      }
    }
  }

  ts.forEachChild(node, visit);
}

visit(sourceFile);

for (const name of [...exportNames].sort()) {
  console.log(name);
}
