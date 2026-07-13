import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { WORKSPACE_CODEGEN_OWNERSHIP } from "@dreamboard-games/workspace-codegen";
import { build } from "esbuild";
import { compareReferenceGameCanonicalStrings } from "../reference-games/canonical.js";
import { generateWorkspaceArtifacts } from "./adapter.js";

export type MaterializeWorkspaceOptions = {
  readonly manifestPath: string;
  readonly projectRoot?: string;
  /** Scaffolding-only. Existing build/test paths leave seed files untouched. */
  readonly writeMissingSeeds?: boolean;
};

export type MaterializedWorkspaceReceipt = {
  readonly schemaVersion: 1;
  readonly projectRoot: string;
  readonly authoritativeFiles: number;
  readonly seededFiles: number;
  readonly artifacts: readonly {
    readonly path: string;
    readonly ownership: "authoritative";
    readonly sha256: `sha256:${string}`;
  }[];
  readonly digest: `sha256:${string}`;
};

type ManifestModule = {
  readonly default?: unknown;
  readonly manifest?: unknown;
};

const authoritativePaths = new Set(
  WORKSPACE_CODEGEN_OWNERSHIP.dynamic.generatedFiles,
);

/**
 * Materialize SDK-owned workspace contracts from authored manifest source.
 * Authoritative files are always replaced. Seed files are untouched unless a
 * scaffolding caller explicitly opts in. No test state or projection artifact
 * is emitted.
 */
export async function materializeWorkspace(
  options: MaterializeWorkspaceOptions,
): Promise<MaterializedWorkspaceReceipt> {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const manifestPath = resolveProjectPath(projectRoot, options.manifestPath);
  if (!(await isFile(manifestPath))) {
    throw new Error(`Manifest source does not exist: ${manifestPath}.`);
  }
  const manifest = await loadManifest({ manifestPath, projectRoot });
  const artifacts = generateWorkspaceArtifacts(manifest);
  const emittedAuthoritative = new Set(
    artifacts
      .filter(({ ownership }) => ownership === "authoritative")
      .map(({ path: artifactPath }) => artifactPath),
  );
  assertExactAuthoritativeInventory(emittedAuthoritative);

  let seededFiles = 0;
  const records: Array<{
    readonly path: string;
    readonly ownership: "authoritative";
    readonly sha256: `sha256:${string}`;
  }> = [];
  for (const artifact of artifacts) {
    const destination = resolveProjectPath(projectRoot, artifact.path);
    if (artifact.ownership === "seed") {
      if (!options.writeMissingSeeds || (await isFile(destination))) {
        continue;
      }
    }
    await mkdir(path.dirname(destination), { recursive: true });
    if (artifact.ownership === "authoritative") {
      await writeAuthoritativeFile(destination, artifact.content);
    } else {
      await writeFile(destination, artifact.content);
    }
    if (artifact.ownership === "seed") {
      seededFiles += 1;
      continue;
    }
    const bytes = await readFile(destination);
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== artifact.contentSha256) {
      throw new Error(
        `Generated ${artifact.path} digest does not match its SDK receipt.`,
      );
    }
    records.push({
      path: artifact.path,
      ownership: "authoritative",
      sha256: `sha256:${actual}`,
    });
  }
  records.sort((left, right) =>
    compareReferenceGameCanonicalStrings(left.path, right.path),
  );
  return {
    schemaVersion: 1,
    projectRoot,
    authoritativeFiles: records.length,
    seededFiles,
    artifacts: records,
    digest: `sha256:${createHash("sha256")
      .update(JSON.stringify(records))
      .digest("hex")}`,
  };
}

async function loadManifest(options: {
  readonly manifestPath: string;
  readonly projectRoot: string;
}): Promise<unknown> {
  const typesEntry = await resolveCurrentSdkTypesFacade();
  const entryPath = path.join(
    options.projectRoot,
    "node_modules/.cache/dreamboard-workspace-compiler",
    `manifest-${process.pid}-${randomUUID()}.mjs`,
  );
  await mkdir(path.dirname(entryPath), { recursive: true });
  try {
    const result = await build({
      entryPoints: [options.manifestPath],
      outfile: entryPath,
      absWorkingDir: options.projectRoot,
      bundle: true,
      format: "esm",
      platform: "node",
      target: "node24",
      alias: {
        "@dreamboard-games/sdk/types": typesEntry,
      },
      sourcemap: "inline",
      logLevel: "silent",
    });
    void result;
    const loaded = (await import(
      pathToFileURL(entryPath).href
    )) as ManifestModule;
    const manifest = loaded.manifest ?? loaded.default;
    if (!manifest || typeof manifest !== "object") {
      throw new Error("Manifest source must export a manifest object.");
    }
    return manifest;
  } finally {
    await rm(entryPath, { force: true });
  }
}

async function resolveCurrentSdkTypesFacade(): Promise<string> {
  const candidates = [
    path.resolve(import.meta.dirname, "../types.ts"),
    path.resolve(import.meta.dirname, "types.js"),
  ];
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  throw new Error(
    `Could not resolve the current @dreamboard-games/sdk/types facade from ${import.meta.dirname}.`,
  );
}

async function writeAuthoritativeFile(
  destination: string,
  content: string,
): Promise<void> {
  const temporaryPath = path.join(
    path.dirname(destination),
    `.${path.basename(destination)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, content);
    await rename(temporaryPath, destination);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

function assertExactAuthoritativeInventory(emitted: ReadonlySet<string>): void {
  const missing = [...authoritativePaths].filter(
    (value) => !emitted.has(value),
  );
  const unexpected = [...emitted].filter(
    (value) => !authoritativePaths.has(value),
  );
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `SDK workspace ownership mismatch (missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}).`,
    );
  }
}

function resolveProjectPath(projectRoot: string, value: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    path.isAbsolute(value) ||
    value.split(/[\\/]+/).some((segment) => segment === "..")
  ) {
    throw new Error(`Workspace path must be project-relative: ${value}.`);
  }
  const resolved = path.resolve(projectRoot, value);
  if (!resolved.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Workspace path escapes the project root: ${value}.`);
  }
  return resolved;
}

async function isFile(filePath: string): Promise<boolean> {
  return stat(filePath)
    .then((value) => value.isFile())
    .catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return false;
      }
      throw error;
    });
}
