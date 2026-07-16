import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { pathExists, readJson, walkFiles } from "./lib/files.ts";
import { packagesDir, rootDir, sdkDir } from "./lib/paths.ts";
import { run } from "./lib/process.ts";

type ExportTarget =
  | string
  | {
      types?: string;
      import?: string;
      default?: string;
    };

type PackageManifest = {
  name?: string;
  version?: string;
  private?: boolean;
  publishConfig?: { access?: string };
  files?: string[];
  exports?: Record<string, ExportTarget>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

export type PackedSdk = {
  name: "@dreamboard-games/sdk";
  version: string;
  file: string;
  path: string;
  integrity: string;
};

const publicPackageName = "@dreamboard-games/sdk";
const privatePackagePrefix = "@dreamboard-games/";
const requiredPeers = ["framer-motion", "react", "react-dom", "zod"];
const buildOnlyDependencies = [
  "@tailwindcss/cli",
  "tailwindcss",
  "typescript",
  "tsup",
];

export async function copySdkPrivateDeclarations(): Promise<void> {
  const sdkDist = path.join(sdkDir, "dist");
  const pluginDist = path.join(packagesDir, "plugin-runtime-contract/dist");
  await mkdir(sdkDist, { recursive: true });
  const pluginFiles = await readdir(pluginDist);
  const declarationChunks = pluginFiles.filter((fileName) =>
    /^[a-z0-9-]+-[A-Za-z0-9_-]+\.d\.ts$/.test(fileName),
  );
  const sdkFiles = await readdir(sdkDist);
  const reducerChunk = sdkFiles.find((fileName) =>
    /^index\.d-.*\.d\.ts$/.test(fileName),
  );
  const reducerDeclaration = reducerChunk
    ? {
        importName: "w as Wire",
        modulePath: `./${reducerChunk.replace(/\.d\.ts$/, ".js")}`,
      }
    : {
        importName: "ReducerWire as Wire",
        modulePath: "./reducer-contract.js",
      };
  if (declarationChunks.length === 0) {
    throw new Error("Plugin runtime declaration chunks were not built.");
  }
  if (!reducerChunk && !sdkFiles.includes("reducer-contract.d.ts")) {
    throw new Error("The SDK reducer-contract declaration was not built.");
  }
  for (const fileName of [...declarationChunks, "digest.d.ts", "schema.d.ts"]) {
    const source = await readFile(path.join(pluginDist, fileName), "utf8");
    const rewritten = source
      .replace(/\nimport '@dreamboard-games\/reducer-contract\/zod';/, "")
      .replace(
        /import \* as Wire from '@dreamboard-games\/reducer-contract\/wire';/,
        `import { ${reducerDeclaration.importName} } from '${reducerDeclaration.modulePath}';`,
      );
    await writeFile(path.join(sdkDist, fileName), rewritten, "utf8");
  }
}

export function assertPeerHygiene(
  manifest: PackageManifest,
  label = "packages/sdk/package.json",
): void {
  const dependencies = manifest.dependencies ?? {};
  const peers = manifest.peerDependencies ?? {};
  const devDependencies = manifest.devDependencies ?? {};
  const duplicated = Object.keys(dependencies).filter(
    (name) => peers[name] !== undefined,
  );
  if (duplicated.length > 0) {
    throw new Error(
      `${label} lists peer packages in dependencies: ${duplicated.join(", ")}`,
    );
  }
  const buildTools = buildOnlyDependencies.filter(
    (name) => dependencies[name] !== undefined,
  );
  if (buildTools.length > 0) {
    throw new Error(
      `${label} lists build tools as runtime dependencies: ${buildTools.join(", ")}`,
    );
  }
  const missingPeers = requiredPeers.filter(
    (name) => peers[name] === undefined,
  );
  if (missingPeers.length > 0) {
    throw new Error(
      `${label} is missing peer dependencies: ${missingPeers.join(", ")}`,
    );
  }
  const missingDevPeers = requiredPeers.filter(
    (name) => devDependencies[name] === undefined,
  );
  if (missingDevPeers.length > 0) {
    throw new Error(
      `${label} must install peer dependencies for local checks: ${missingDevPeers.join(", ")}`,
    );
  }
}

export async function assertPublicationBoundary(): Promise<void> {
  const rootManifest = await readJson<PackageManifest>(
    path.join(rootDir, "package.json"),
  );
  if (rootManifest.private !== true) {
    throw new Error("The workspace root must remain private.");
  }
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const publicPackages: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(packagesDir, entry.name, "package.json");
    if (!(await pathExists(manifestPath))) continue;
    const manifest = await readJson<PackageManifest>(manifestPath);
    if (manifest.private !== true)
      publicPackages.push(manifest.name ?? entry.name);
    if (manifest.name === publicPackageName) {
      if (
        manifest.private === true ||
        manifest.publishConfig?.access !== "public"
      ) {
        throw new Error(
          `${publicPackageName} must be the one public workspace package.`,
        );
      }
    } else if (
      manifest.name?.startsWith(privatePackagePrefix) &&
      manifest.private !== true
    ) {
      throw new Error(`${manifest.name} must remain private.`);
    }
  }
  if (publicPackages.length !== 1 || publicPackages[0] !== publicPackageName) {
    throw new Error(
      `Expected only ${publicPackageName} to be public; found ${publicPackages.join(", ") || "none"}.`,
    );
  }
  assertPeerHygiene(
    await readJson<PackageManifest>(path.join(sdkDir, "package.json")),
  );
}

function exportTarget(target: ExportTarget): string | undefined {
  return typeof target === "string"
    ? target
    : (target.import ?? target.default);
}

function declarationTarget(target: ExportTarget): string | undefined {
  return typeof target === "string" ? undefined : target.types;
}

function declarationExports(filePath: string): {
  all: string[];
  values: string[];
} {
  const program = ts.createProgram([filePath], {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    types: [],
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(filePath);
  if (!source) throw new Error(`Unable to load declaration ${filePath}.`);
  const symbol = checker.getSymbolAtLocation(source);
  if (!symbol) return { all: [], values: [] };
  const exports = checker.getExportsOfModule(symbol);
  const isValue = (candidate: ts.Symbol): boolean => {
    const resolved =
      candidate.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(candidate)
        : candidate;
    return Boolean(resolved.flags & ts.SymbolFlags.Value);
  };
  return {
    all: [...new Set(exports.map((candidate) => candidate.name))].sort(),
    values: [
      ...new Set(exports.filter(isValue).map((candidate) => candidate.name)),
    ].sort(),
  };
}

export async function assertSdkExportParity(
  packageRoot = sdkDir,
): Promise<void> {
  const manifest = await readJson<PackageManifest>(
    path.join(packageRoot, "package.json"),
  );
  const failures: string[] = [];
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    if (subpath === "./package.json") continue;
    const runtimeTarget = exportTarget(target);
    if (!runtimeTarget) {
      failures.push(`${subpath}: missing default/import target`);
      continue;
    }
    const runtimePath = path.resolve(packageRoot, runtimeTarget);
    if (!existsSync(runtimePath)) {
      failures.push(`${subpath}: missing ${runtimeTarget}`);
      continue;
    }
    if (!runtimeTarget.endsWith(".js")) continue;
    const typesTarget = declarationTarget(target);
    if (!typesTarget) {
      failures.push(`${subpath}: JavaScript export has no declaration target`);
      continue;
    }
    const typesPath = path.resolve(packageRoot, typesTarget);
    if (!existsSync(typesPath)) {
      failures.push(`${subpath}: missing ${typesTarget}`);
      continue;
    }
    const declared = declarationExports(typesPath);
    const synthetic = declared.all.filter((name) => /^[A-Za-z]$/.test(name));
    if (synthetic.length > 0) {
      failures.push(
        `${subpath}: synthetic declaration aliases ${synthetic.join(", ")}`,
      );
    }
    const moduleUrl = pathToFileURL(runtimePath);
    moduleUrl.search = `exports=${Date.now()}-${Math.random()}`;
    const runtime = Object.keys(
      (await import(moduleUrl.href)) as object,
    ).sort();
    const declaredSet = new Set(declared.values);
    const runtimeSet = new Set(runtime);
    const missingRuntime = declared.values.filter(
      (name) => !runtimeSet.has(name),
    );
    const missingTypes = runtime.filter((name) => !declaredSet.has(name));
    if (missingRuntime.length > 0 || missingTypes.length > 0) {
      failures.push(
        `${subpath}: declaration/runtime mismatch (runtime missing: ${missingRuntime.join(", ") || "none"}; declarations missing: ${missingTypes.join(", ") || "none"})`,
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `SDK export checks failed:\n${failures.map((failure) => `  ${failure}`).join("\n")}`,
    );
  }
}

export async function assertSdkExportTargets(
  packageRoot: string,
): Promise<void> {
  const manifest = await readJson<PackageManifest>(
    path.join(packageRoot, "package.json"),
  );
  const failures: string[] = [];
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    if (subpath === "./package.json") continue;
    const runtimeTarget = exportTarget(target);
    if (
      !runtimeTarget ||
      !existsSync(path.resolve(packageRoot, runtimeTarget))
    ) {
      failures.push(`${subpath}: missing ${runtimeTarget ?? "runtime target"}`);
      continue;
    }
    if (runtimeTarget.endsWith(".js")) {
      const typesTarget = declarationTarget(target);
      if (!typesTarget || !existsSync(path.resolve(packageRoot, typesTarget))) {
        failures.push(
          `${subpath}: missing ${typesTarget ?? "declaration target"}`,
        );
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Packed SDK export targets failed:\n${failures.join("\n")}`,
    );
  }
}

export function sha512Integrity(bytes: Uint8Array): string {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

export function resolvePackedTarballPath(
  outputDirectory: string,
  reportedFilename: string,
  createdTarballs: string[],
): string {
  if (
    createdTarballs.length !== 1 ||
    path.basename(reportedFilename) !== createdTarballs[0]
  ) {
    throw new Error(
      `pnpm pack must create exactly one SDK tarball; created ${createdTarballs.join(", ") || "none"}.`,
    );
  }
  return path.resolve(outputDirectory, createdTarballs[0]);
}

export async function packSdk(outputDirectory: string): Promise<PackedSdk> {
  await mkdir(outputDirectory, { recursive: true });
  const before = new Set(await readdir(outputDirectory));
  const output = run(
    "pnpm",
    ["pack", "--json", "--pack-destination", outputDirectory],
    { cwd: sdkDir, capture: true },
  );
  const metadata = JSON.parse(output) as {
    name?: string;
    version?: string;
    filename?: string;
  };
  if (
    metadata.name !== publicPackageName ||
    !metadata.version ||
    !metadata.filename
  ) {
    throw new Error(`pnpm pack returned invalid SDK metadata:\n${output}`);
  }
  const createdTarballs = (await readdir(outputDirectory)).filter(
    (name) => name.endsWith(".tgz") && !before.has(name),
  );
  const tarballPath = resolvePackedTarballPath(
    outputDirectory,
    metadata.filename,
    createdTarballs,
  );
  return {
    name: publicPackageName,
    version: metadata.version,
    file: path.basename(tarballPath),
    path: tarballPath,
    integrity: sha512Integrity(await readFile(tarballPath)),
  };
}

function publicSpecifiers(manifest: PackageManifest): {
  js: string[];
  css: string[];
} {
  const js: string[] = [];
  const css: string[] = [];
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    if (subpath === "./package.json") continue;
    const resolved = exportTarget(target);
    if (resolved?.endsWith(".js")) js.push(subpath);
    if (resolved?.endsWith(".css")) css.push(resolved);
  }
  return { js: js.sort(), css: css.sort() };
}

function packageSpecifier(subpath: string): string {
  return subpath === "."
    ? publicPackageName
    : `${publicPackageName}/${subpath.slice(2)}`;
}

async function assertNoDanglingDeclarations(
  packageRoot: string,
): Promise<void> {
  const failures: string[] = [];
  for (const filePath of await walkFiles(path.join(packageRoot, "dist"))) {
    if (!filePath.endsWith(".d.ts") && !filePath.endsWith(".d.mts")) continue;
    const source = (await readFile(filePath, "utf8"))
      .split("\n")
      .filter((line) => !/^\s*(?:\*|\/\/|\/\*)/.test(line))
      .join("\n");
    for (const match of source.matchAll(
      /(?:from|import\()\s*["'](\.\.?\/[^"']+)["']/g,
    )) {
      const specifier = match[1];
      if (!specifier) continue;
      const base = path.resolve(
        path.dirname(filePath),
        specifier.replace(/\.js$/, ""),
      );
      if (
        ![`${base}.d.ts`, `${base}.d.mts`, path.join(base, "index.d.ts")].some(
          existsSync,
        )
      ) {
        failures.push(
          `${path.relative(packageRoot, filePath)} -> ${specifier}`,
        );
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Packed declarations have missing relative targets:\n${failures.join("\n")}`,
    );
  }
}

async function assertNoPrivateImports(packageRoot: string): Promise<void> {
  const failures: string[] = [];
  const importPattern =
    /(?:from\s+|import\s*(?:\(\s*)?|require\s*\(\s*)["'](@dreamboard-games\/(?:plugin-runtime-contract|reducer-contract|sdk-types|workspace-codegen)(?:\/[^"']*)?)["']/g;
  for (const filePath of await walkFiles(path.join(packageRoot, "dist"))) {
    if (!/\.(?:[cm]?js|d\.[cm]?ts)$/.test(filePath)) continue;
    const source = await readFile(filePath, "utf8");
    for (const match of source.matchAll(importPattern)) {
      failures.push(`${path.relative(packageRoot, filePath)} -> ${match[1]}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Packed SDK imports private workspace packages:\n${failures.join("\n")}`,
    );
  }
}

export async function verifyPackedSdk(tarballPath: string): Promise<void> {
  const tempRoot = await mkdtemp(
    path.join(tmpdir(), "dreamboard-sdk-package-"),
  );
  try {
    const extractRoot = path.join(tempRoot, "extract");
    await mkdir(extractRoot, { recursive: true });
    run("tar", ["-xzf", path.resolve(tarballPath), "-C", extractRoot]);
    const packageRoot = path.join(extractRoot, "package");
    const topLevel = await readdir(packageRoot);
    const allowedTopLevel = new Set([
      "LICENSE.md",
      "README.md",
      "dist",
      "package.json",
    ]);
    const unexpectedTopLevel = topLevel.filter(
      (entry) => !allowedTopLevel.has(entry),
    );
    if (unexpectedTopLevel.length > 0) {
      throw new Error(
        `The SDK tarball contains unexpected top-level entries: ${unexpectedTopLevel.join(", ")}.`,
      );
    }
    const manifest = await readJson<PackageManifest>(
      path.join(packageRoot, "package.json"),
    );
    if (manifest.name !== publicPackageName || !manifest.version) {
      throw new Error("The tarball does not contain the SDK package manifest.");
    }
    const serializedManifest = JSON.stringify(manifest);
    if (
      serializedManifest.includes("catalog:") ||
      serializedManifest.includes("workspace:")
    ) {
      throw new Error(
        "Packed package.json contains a workspace or catalog dependency specifier.",
      );
    }
    for (const dependencies of [
      manifest.dependencies,
      manifest.optionalDependencies,
      manifest.peerDependencies,
    ]) {
      for (const name of Object.keys(dependencies ?? {})) {
        if (name.startsWith(privatePackagePrefix)) {
          throw new Error(
            `Packed package.json depends on private package ${name}.`,
          );
        }
      }
    }
    assertPeerHygiene(manifest, "packed package.json");
    await assertSdkExportTargets(packageRoot);
    await assertNoDanglingDeclarations(packageRoot);
    await assertNoPrivateImports(packageRoot);
    for (const cssTarget of publicSpecifiers(manifest).css) {
      const css = await readFile(path.resolve(packageRoot, cssTarget), "utf8");
      if (!css.trim()) throw new Error(`${cssTarget} is empty.`);
      if (/@(?:import\s+["']tailwindcss|source|apply)\b/.test(css)) {
        throw new Error(
          `${cssTarget} contains uncompiled Tailwind directives.`,
        );
      }
    }

    const consumer = path.join(tempRoot, "consumer");
    await mkdir(consumer);
    await writeFile(
      path.join(consumer, "package.json"),
      `${JSON.stringify(
        {
          name: "dreamboard-sdk-package-smoke",
          private: true,
          type: "module",
          dependencies: {
            [publicPackageName]: `file:${path.resolve(tarballPath)}`,
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    run(
      "pnpm",
      ["install", "--ignore-workspace", "--ignore-scripts", "--lockfile=false"],
      { cwd: consumer },
    );
    const installedSdkRoot = path.join(
      consumer,
      "node_modules",
      "@dreamboard-games",
      "sdk",
    );
    await assertSdkExportParity(installedSdkRoot);
    const probe = path.join(consumer, "probe.mjs");
    await writeFile(
      probe,
      `${publicSpecifiers(manifest)
        .js.map(
          (subpath) =>
            `await import(${JSON.stringify(packageSpecifier(subpath))});`,
        )
        .join("\n")}\n`,
      "utf8",
    );
    run("node", [probe], { cwd: consumer });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function packAndVerifySdk(
  outputDirectory: string,
): Promise<PackedSdk> {
  const packed = await packSdk(outputDirectory);
  await verifyPackedSdk(packed.path);
  return packed;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [command, ...extra] = process.argv.slice(2);
  if (command !== "copy-declarations" || extra.length > 0) {
    console.error("Usage: node scripts/package.ts copy-declarations");
    process.exitCode = 2;
  } else {
    copySdkPrivateDeclarations().catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  }
}
