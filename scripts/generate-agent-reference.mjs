#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import prettier from "prettier";
import ts from "typescript";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const SDK_ROOT = path.join(REPO_ROOT, "packages", "sdk");
const SDK_PACKAGE_JSON = path.join(SDK_ROOT, "package.json");
const DIST_ROOT = path.join(SDK_ROOT, "dist");
const REFERENCE_PATH = path.join(SDK_ROOT, "REFERENCE.md");
const AGENT_API_PATH = path.join(
  REPO_ROOT,
  "docs",
  "reference",
  "agent-api.md",
);
const LLMS_PATH = path.join(REPO_ROOT, "docs", "reference", "llms.txt");
const LLMS_BUDGET_BYTES = 32 * 1024;
const LLMS_ENTRY_SUMMARY_BUDGET = 18;
const SIGNATURE_BUDGET = 400;
const LLMS_OMITTED_EXPORTS = new Set([
  "testing.activate",
  "testing.assertStep",
  "testing.defineUIScenario",
  "testing.drag",
  "testing.fill",
  "testing.press",
  "testing.ProtocolUIScenarioAuthority",
  "testing.ReducerUIScenarioAuthority",
  "testing.submit",
  "testing.UIScenarioAuthority",
  "testing.UIScenarioAuthorityKind",
  "testing.UIScenarioDefinition",
  "testing.UIScenarioEnvironmentDefinition",
  "testing.pluginProtocolTapeSchema",
  "testing.portableSemanticReplayStepSchema",
  "testing.uiFixtureFrameSchema",
  "testing.uiFixtureProtocolStepSchema",
  "testing.uiReplayExecutionSchema",
  "testing.uiReplayRequestSchema",
  "testing.uiResolvedReplayIdentitySchema",
  "testing.uiScenarioFixtureBundleIndexSchema",
  "testing.uiScenarioFixtureSchema",
  "testing.uiScenarioReplayStepSchema",
  "testing.uiStepExpectationSchema",
]);
const LLMS_INCLUDED_SUBPATHS = new Set([
  ".",
  "./package-set",
  "./reducer",
  "./runtime",
  "./runtime/primitives",
  "./runtime/workspace-contract",
  "./runtime/runtime-api",
  "./codegen",
  "./reducer-contract",
  "./testing",
  "./browser-interaction",
]);
const LLMS_NAMESPACE_BY_SUBPATH = new Map([
  [".", "sdk"],
  ["./package-set", "pkg"],
  ["./reducer", "reducer"],
  ["./runtime", "runtime"],
  ["./runtime/primitives", "primitives"],
  ["./runtime/workspace-contract", "workspace"],
  ["./runtime/runtime-api", "runtimeApi"],
  ["./codegen", "codegen"],
  ["./reducer-contract", "contract"],
  ["./testing", "testing"],
  ["./browser-interaction", "browser"],
]);

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

if (!fs.existsSync(DIST_ROOT)) {
  fail(
    "packages/sdk/dist is missing. Run `pnpm --filter @dreamboard-games/sdk build` before generating the agent reference.",
  );
}

const supportedFacades = readSupportedFacades();
const facadeDtsPaths = supportedFacades.map((facade) => facade.dtsPath);
const program = ts.createProgram(facadeDtsPaths, {
  target: ts.ScriptTarget.Latest,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  skipLibCheck: true,
  types: [],
});
const checker = program.getTypeChecker();

const facadeSections = supportedFacades.map(readFacadeSection);
const internalExports = facadeSections.flatMap((section) =>
  section.exports
    .filter((entry) => entry.internal)
    .map((entry) => `${section.packageName}.${entry.name}`),
);

if (internalExports.length > 0) {
  fail(
    [
      "Public facades expose @internal declarations:",
      ...internalExports.map((name) => `  - ${name}`),
    ].join("\n"),
  );
}

const reference = await prettier.format(renderReference(facadeSections), {
  parser: "markdown",
});
const llms = renderLlms(facadeSections);

if (Buffer.byteLength(llms, "utf8") > LLMS_BUDGET_BYTES) {
  fail(
    `docs/reference/llms.txt is ${Buffer.byteLength(
      llms,
      "utf8",
    )} bytes, over the ${LLMS_BUDGET_BYTES} byte budget.`,
  );
}

const outputs = [
  { path: REFERENCE_PATH, content: reference },
  { path: AGENT_API_PATH, content: reference },
  { path: LLMS_PATH, content: llms },
];

if (checkOnly) {
  checkOutputs(outputs);
} else {
  for (const output of outputs) {
    fs.mkdirSync(path.dirname(output.path), { recursive: true });
    fs.writeFileSync(output.path, output.content);
  }
  console.log(
    `Generated agent reference (${countExports(facadeSections)} exports, ${Buffer.byteLength(
      llms,
      "utf8",
    )} byte llms.txt).`,
  );
}

function readSupportedFacades() {
  const packageJson = JSON.parse(fs.readFileSync(SDK_PACKAGE_JSON, "utf8"));
  const entries = [];

  for (const [subpath, target] of Object.entries(packageJson.exports ?? {})) {
    if (subpath === "./package.json") continue;
    if (typeof target !== "object" || !target.types) continue;

    const relativeDts = target.types.replace(/^\.\//, "");
    const dtsPath = path.join(SDK_ROOT, relativeDts);
    if (!fs.existsSync(dtsPath)) {
      fail(`Missing declaration file for ${subpath}: ${relativeDts}`);
    }

    const packageName =
      subpath === "."
        ? "@dreamboard-games/sdk"
        : `@dreamboard-games/sdk/${subpath.replace(/^\.\//, "")}`;
    const sectionName = subpath === "." ? "root" : subpath.replace(/^\.\//, "");

    entries.push({ subpath, packageName, sectionName, dtsPath });
  }

  return entries;
}

function readFacadeSection(facade) {
  const sourceFile = program.getSourceFile(facade.dtsPath);
  if (!sourceFile) {
    fail(`Unable to read ${path.relative(REPO_ROOT, facade.dtsPath)}`);
  }

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) {
    fail(`Unable to resolve module symbol for ${facade.packageName}`);
  }

  const exports = checker
    .getExportsOfModule(moduleSymbol)
    .filter((symbol) => symbol.name !== "default")
    .map((symbol) => toReferenceEntry(symbol, sourceFile))
    .sort((left, right) => left.name.localeCompare(right.name));

  return { ...facade, exports };
}

function toReferenceEntry(exportSymbol, sourceFile) {
  const target =
    exportSymbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(exportSymbol)
      : exportSymbol;
  const declarations = target.declarations ?? exportSymbol.declarations ?? [];
  const declaration = chooseDeclaration(declarations);
  const internal = hasInternalTag(target) || hasInternalTag(exportSymbol);
  const docs = firstParagraph(
    ts.displayPartsToString(target.getDocumentationComment(checker)),
  );
  const signature = renderSignature(
    exportSymbol.name,
    target,
    declaration,
    sourceFile,
  );

  return {
    name: exportSymbol.name,
    docs,
    signature,
    internal,
    summary: docs || fallbackSummary(signature),
  };
}

function chooseDeclaration(declarations) {
  return (
    declarations.find((declaration) =>
      [
        ts.SyntaxKind.FunctionDeclaration,
        ts.SyntaxKind.ClassDeclaration,
        ts.SyntaxKind.InterfaceDeclaration,
        ts.SyntaxKind.TypeAliasDeclaration,
        ts.SyntaxKind.EnumDeclaration,
        ts.SyntaxKind.VariableDeclaration,
      ].includes(declaration.kind),
    ) ?? declarations[0]
  );
}

function hasInternalTag(symbol) {
  return symbol
    .getJsDocTags(checker)
    .some((tag) => tag.name.toLowerCase() === "internal");
}

function renderSignature(publicName, symbol, declaration, sourceFile) {
  const type = checker.getTypeOfSymbolAtLocation(
    symbol,
    declaration ?? symbol.valueDeclaration ?? sourceFile,
  );
  const signatures = [
    ...type.getCallSignatures(),
    ...type.getConstructSignatures(),
  ];
  const printedSignatures = signatures
    .map((signature) =>
      checker.signatureToString(
        signature,
        declaration,
        ts.TypeFormatFlags.NoTruncation,
      ),
    )
    .filter(Boolean);

  if (printedSignatures.length > 0) {
    const prefix =
      printedSignatures.length === 1 ? inferCallablePrefix(declaration) : "";
    const text = printedSignatures
      .map((signature) =>
        prefix
          ? `${prefix} ${publicName}${signature};`
          : `${publicName}${signature};`,
      )
      .join("\n");
    if (text.length <= SIGNATURE_BUDGET) return text;
  }

  const declarationText = declaration ? cleanDeclarationText(declaration) : "";
  if (declarationText && declarationText.length <= SIGNATURE_BUDGET) {
    return declarationText;
  }

  const typeText = checker.typeToString(
    type,
    declaration,
    ts.TypeFormatFlags.NoTruncation,
  );
  if (typeText && typeText !== "any" && typeText.length <= SIGNATURE_BUDGET) {
    return `declare const ${publicName}: ${typeText};`;
  }

  if (declarationText) {
    return summarizeDeclaration(publicName, declarationText);
  }

  return `export { ${publicName} };`;
}

function inferCallablePrefix(declaration) {
  if (declaration && ts.isClassDeclaration(declaration)) return "class";
  return "function";
}

function cleanDeclarationText(declaration) {
  let node = declaration;
  if (ts.isVariableDeclaration(declaration)) {
    node = declaration.parent?.parent ?? declaration;
  }

  let text = node.getText(declaration.getSourceFile());
  text = text.replace(/^export\s+/gm, "");
  text = text.replace(/^declare\s+/gm, "");
  text = text.replace(/\s+$/g, "");

  if (ts.isVariableStatement(node)) {
    text = text.replace(/;\s*$/, ";");
  }

  return text.trim();
}

function summarizeDeclaration(publicName, declarationText) {
  const firstLine = declarationText.split("\n").find(Boolean)?.trim() ?? "";
  if (/^type\s/.test(firstLine)) return `type ${publicName} = ...;`;
  if (/^interface\s/.test(firstLine)) return `interface ${publicName} { ... }`;
  if (/^class\s/.test(firstLine)) return `class ${publicName} { ... }`;
  if (/^(const|let|var)\s/.test(firstLine))
    return `declare const ${publicName}: ...;`;
  if (/^function\s/.test(firstLine))
    return `function ${publicName}(...args: never[]): unknown;`;
  return `${publicName}: ...;`;
}

function firstParagraph(text) {
  return (
    text
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
      .find(Boolean) ?? ""
  );
}

function fallbackSummary(signature) {
  return signature
    .replace(/\s+/g, " ")
    .replace(/[;{].*$/, "")
    .trim();
}

function renderReference(sections) {
  return `${renderPreamble()}
${sections.map(renderSection).join("\n")}`;
}

function renderPreamble() {
  return `# Dreamboard SDK Agent Reference

Generated from the published declaration facades in \`packages/sdk/dist\`.
Do not edit this file directly; run \`pnpm docs:generate\`.

## Mental Model

1. Author the manifest and let codegen produce a workspace contract.
2. Bind that contract once with \`createContractAuthoring(contract)\`.
3. Define game state, phases, interactions, and views through the bound authoring object.
4. Reducer code reads with \`q\`, mutates through \`tx\`, and returns \`accept\` or \`reject\`.
5. Runtime/UI code consumes generated workspace-contract values and SDK primitives.
6. If artifacts go stale, regenerate with \`dreamboard test generate\` before debugging authored code.

## Decision Table

| I want to... | Use... |
| --- | --- |
| bind generated contract facts to authoring helpers | \`createContractAuthoring(contract)\` |
| define top-level game state and errors | bound \`game(...)\` |
| define a phase | bound \`phase(name)(...)\` |
| define a view projection | bound \`view(...)\` |
| validate an action | an interaction \`rule\` |
| explain why an interaction is blocked | \`ctx.explain\` or testing availability matchers |
| read table state in reducer code | \`q\` table queries |
| change table state in reducer code | \`tx\` transaction operations |
| accept an interaction | \`accept(...)\` |
| reject an interaction | \`reject(...)\` |
| store turn-scoped state | phase state schema |
| reference generated ids | generated contract \`ids\` and \`literals\` |
| render plugin UI | \`PluginRuntime\` and runtime primitives |
| inspect exact installed API offline | \`node_modules/@dreamboard-games/sdk/REFERENCE.md\` |

## Generated Surface
`;
}

function renderSection(section) {
  const body = section.exports
    .map(
      (entry) => `### ${entry.name}

\`\`\`ts
${entry.signature}
\`\`\`

${entry.docs || "_No JSDoc summary is available yet._"}
`,
    )
    .join("\n");

  return `## ${section.packageName}

${body}`;
}

function renderLlms(sections) {
  const lines = [
    "# Dreamboard SDK API index",
    "# Generated by pnpm docs:generate. See node_modules/@dreamboard-games/sdk/REFERENCE.md for full signatures.",
    "# Curated for coding-agent context budgets; full Markdown covers every public facade export.",
    "",
  ];

  for (const section of sections) {
    if (!LLMS_INCLUDED_SUBPATHS.has(section.subpath)) continue;

    const namespace =
      LLMS_NAMESPACE_BY_SUBPATH.get(section.subpath) ??
      section.subpath.replace(/^\.\//, "");
    for (const entry of section.exports) {
      const key = `${namespace}.${entry.name}`;
      if (LLMS_OMITTED_EXPORTS.has(key)) continue;
      lines.push(
        `${key} - ${clipText(entry.summary, LLMS_ENTRY_SUMMARY_BUDGET)}`,
      );
    }
  }

  const omitted = sections
    .filter((section) => !LLMS_INCLUDED_SUBPATHS.has(section.subpath))
    .map((section) => section.packageName);
  if (omitted.length > 0) {
    lines.push("");
    lines.push(`Omitted heavy surfaces: ${omitted.join(", ")}.`);
  }

  return `${lines.join("\n")}\n`;
}

function clipText(text, maxLength) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function countExports(sections) {
  return sections.reduce((count, section) => count + section.exports.length, 0);
}

function checkOutputs(outputs) {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "agent-reference-check-"),
  );
  try {
    const drift = [];
    for (const output of outputs) {
      const relative = path.relative(REPO_ROOT, output.path);
      const expectedPath = path.join(tempRoot, relative);
      fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
      fs.writeFileSync(expectedPath, output.content);

      if (!fs.existsSync(output.path) || !sameFile(expectedPath, output.path)) {
        drift.push({ relative, expectedPath, actualPath: output.path });
      }
    }

    if (drift.length > 0) {
      console.error("");
      console.error("x Agent reference generated files are out of sync.");
      console.error("");
      console.error("Drift detected in:");
      for (const item of drift) {
        console.error(`  - ${item.relative}`);
      }
      console.error("");
      console.error("Diff:");
      for (const item of drift) {
        const diff = spawnSync(
          "git",
          [
            "--no-pager",
            "diff",
            "--no-index",
            "--",
            item.expectedPath,
            item.actualPath,
          ],
          { cwd: REPO_ROOT, encoding: "utf8" },
        );
        console.error((diff.stdout || diff.stderr || "").trim());
      }
      console.error("");
      console.error(
        "Fix: run `pnpm docs:generate` and commit the generated files.",
      );
      process.exit(1);
    }

    console.log(
      `Agent reference generated files are clean (${countExports(
        facadeSections,
      )} exports, ${Buffer.byteLength(llms, "utf8")} byte llms.txt).`,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function sameFile(left, right) {
  const result = spawnSync(
    "git",
    ["diff", "--no-index", "--quiet", "--exit-code", "--", left, right],
    { cwd: REPO_ROOT },
  );
  return result.status === 0;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
