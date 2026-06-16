#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const sdkDir = path.join(root, "packages/sdk");
const sdkManifestPath = path.join(sdkDir, "package.json");

function formatList(names) {
  return names.length > 0 ? names.join(", ") : "(none)";
}

function sortUnique(names) {
  return [...new Set(names)].sort();
}

export function getPackageExportEntries(pkg) {
  return Object.entries(pkg.exports ?? {}).map(([subpath, target]) => {
    const importTarget =
      typeof target === "string" ? target : (target.import ?? target.default);
    const declarationTarget =
      typeof target === "string" ? undefined : target.types;
    return {
      subpath,
      target,
      importTarget,
      declarationTarget,
      isJavaScript: Boolean(importTarget?.endsWith(".js")),
      isCss: Boolean(importTarget?.endsWith(".css")),
    };
  });
}

function resolvePackagePath(target) {
  if (!target) return null;
  return path.resolve(sdkDir, target);
}

function createDeclarationProgram(declarationPath) {
  return ts.createProgram([declarationPath], {
    allowJs: false,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    strict: false,
    target: ts.ScriptTarget.ESNext,
    types: [],
  });
}

function isValueExport(symbol, checker) {
  let resolved = symbol;
  if (symbol.flags & ts.SymbolFlags.Alias) {
    resolved = checker.getAliasedSymbol(symbol);
  }
  return Boolean(resolved.flags & ts.SymbolFlags.Value);
}

export function collectDeclarationExports(declarationPath) {
  const program = createDeclarationProgram(declarationPath);
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(declarationPath);
  if (!source) {
    throw new Error(
      `Declaration file is not part of the program: ${declarationPath}`,
    );
  }
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) {
    return { all: [], values: [] };
  }
  const exportedSymbols = checker.getExportsOfModule(moduleSymbol);
  return {
    all: sortUnique(exportedSymbols.map((symbol) => symbol.name)),
    values: sortUnique(
      exportedSymbols
        .filter((symbol) => isValueExport(symbol, checker))
        .map((symbol) => symbol.name),
    ),
  };
}

export function compareExportNames(declaredValues, runtimeValues) {
  const declared = new Set(declaredValues);
  const runtime = new Set(runtimeValues);
  return {
    missingRuntime: declaredValues.filter((name) => !runtime.has(name)),
    missingDeclaration: runtimeValues.filter((name) => !declared.has(name)),
  };
}

export function findSyntheticDeclarationAliases(exportedNames) {
  return exportedNames.filter((name) => /^[A-Za-z]$/.test(name)).sort();
}

async function importRuntimeValues(jsPath) {
  const moduleUrl = pathToFileURL(jsPath);
  moduleUrl.search = `parity=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const module = await import(moduleUrl.href);
  return Object.keys(module).sort();
}

async function readSdkManifest() {
  return JSON.parse(await readFile(sdkManifestPath, "utf8"));
}

async function main() {
  const pkg = await readSdkManifest();
  const failures = [];
  const checked = [];
  const skipped = [];

  for (const entry of getPackageExportEntries(pkg)) {
    if (entry.subpath === "./package.json") {
      skipped.push(`${entry.subpath} (metadata)`);
      continue;
    }
    if (entry.isCss) {
      skipped.push(`${entry.subpath} (css)`);
      continue;
    }
    if (!entry.isJavaScript) {
      skipped.push(`${entry.subpath} (non-js)`);
      continue;
    }

    const jsPath = resolvePackagePath(entry.importTarget);
    const declarationPath = resolvePackagePath(entry.declarationTarget);
    if (!entry.declarationTarget || !declarationPath) {
      failures.push(
        `${entry.subpath}: JavaScript export has no declaration target`,
      );
      continue;
    }
    if (!jsPath || !existsSync(jsPath)) {
      failures.push(
        `${entry.subpath}: missing runtime file ${entry.importTarget}`,
      );
      continue;
    }
    if (!existsSync(declarationPath)) {
      failures.push(
        `${entry.subpath}: missing declaration file ${entry.declarationTarget}`,
      );
      continue;
    }

    const declarationExports = collectDeclarationExports(declarationPath);
    const suspicious = findSyntheticDeclarationAliases(declarationExports.all);
    if (suspicious.length > 0) {
      failures.push(
        `${entry.subpath}: synthetic public declaration aliases: ${suspicious.join(", ")}`,
      );
    }

    const runtimeValues = await importRuntimeValues(jsPath);
    const diff = compareExportNames(declarationExports.values, runtimeValues);
    if (diff.missingRuntime.length > 0 || diff.missingDeclaration.length > 0) {
      failures.push(
        [
          `${entry.subpath}: declaration/runtime value export mismatch`,
          `  declaration values missing at runtime: ${formatList(diff.missingRuntime)}`,
          `  runtime values missing in declarations: ${formatList(diff.missingDeclaration)}`,
        ].join("\n"),
      );
    } else {
      checked.push(
        `${entry.subpath}: ${runtimeValues.length} runtime value exports`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(`SDK export parity failed:\n\n${failures.join("\n\n")}`);
  }

  for (const line of checked) {
    console.log(`OK ${line}`);
  }
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.join(", ")}`);
  }
  console.log(`\nOK: checked ${checked.length} JavaScript export subpaths`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
