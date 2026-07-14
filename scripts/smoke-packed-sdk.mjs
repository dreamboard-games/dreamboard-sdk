#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const [, , tarballArg] = process.argv;

if (!tarballArg) {
  console.error("Usage: node scripts/smoke-packed-sdk.mjs <sdk.tgz>");
  process.exit(2);
}

const tarballPath = path.resolve(tarballArg);
const receiptPath = process.env.AUTHORING_SMOKE_RECEIPT
  ? path.resolve(process.env.AUTHORING_SMOKE_RECEIPT)
  : null;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
  return result;
}

function runCaptured(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result.stdout;
}

function packageSpecifier(subpath) {
  return subpath === "."
    ? "@dreamboard-games/sdk"
    : `@dreamboard-games/sdk/${subpath.slice(2)}`;
}

function getExportTarget(target) {
  return typeof target === "string"
    ? target
    : (target.import ?? target.default);
}

function publicExports(manifest) {
  const entries = Object.entries(manifest.exports ?? {}).filter(
    ([subpath]) => subpath !== "./package.json",
  );
  return {
    js: entries
      .filter(([, target]) => getExportTarget(target)?.endsWith(".js"))
      .map(([subpath]) => subpath)
      .sort(),
    css: entries
      .filter(([, target]) => getExportTarget(target)?.endsWith(".css"))
      .map(([subpath, target]) => ({
        subpath,
        target: getExportTarget(target),
      }))
      .sort((left, right) => left.subpath.localeCompare(right.subpath)),
  };
}

async function main() {
  const consumerDir = await mkdtemp(
    path.join(tmpdir(), "dreamboard-sdk-consumer-"),
  );
  try {
    await mkdir(consumerDir, { recursive: true });
    await writeFile(
      path.join(consumerDir, "package.json"),
      `${JSON.stringify(
        { name: "dreamboard-sdk-packed-smoke", private: true, type: "module" },
        null,
        2,
      )}\n`,
    );

    run(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath],
      { cwd: consumerDir },
    );

    const sdkRoot = path.join(
      consumerDir,
      "node_modules",
      "@dreamboard-games",
      "sdk",
    );
    const manifest = JSON.parse(
      await readFile(path.join(sdkRoot, "package.json"), "utf8"),
    );
    const exportsToSmoke = publicExports(manifest);
    const specifiers = exportsToSmoke.js.map(packageSpecifier);
    const probePath = path.join(consumerDir, "import-public-subpaths.mjs");
    await writeFile(
      probePath,
      [
        `const specifiers = ${JSON.stringify(specifiers, null, 2)};`,
        "const expectedRoot = '/node_modules/@dreamboard-games/sdk/';",
        "for (const specifier of specifiers) {",
        "  const resolved = await import.meta.resolve(specifier);",
        "  if (!resolved.includes(expectedRoot)) {",
        "    throw new Error(`${specifier} resolved outside packed consumer install: ${resolved}`);",
        "  }",
        "  const module = await import(specifier);",
        "  console.log(`${specifier} -> ${Object.keys(module).length} runtime exports`);",
        "}",
        "",
      ].join("\n"),
    );
    run("node", [probePath], { cwd: consumerDir });

    const authoringProbePath = path.join(
      consumerDir,
      "check-authoring-adapter.mjs",
    );
    await writeFile(
      authoringProbePath,
      `
        import { createHash } from "node:crypto";
        import { createRequire } from "node:module";
        import { readFile } from "node:fs/promises";
        import {
          diagnosticCodesForValidationErrors,
          projectAuthoringAdapter,
        } from "@dreamboard-games/sdk/authoring";

        const stableJson = (value) => {
          if (value === undefined) return "null";
          if (value === null || typeof value !== "object") return JSON.stringify(value);
          if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
          return "{" + Object.entries(value)
            .filter(([, entry]) => entry !== undefined)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, entry]) => JSON.stringify(key) + ":" + stableJson(entry))
            .join(",") + "}";
        };
        const sha256 = (value) => createHash("sha256").update(value).digest("hex");
        const deepFrozen = (value) =>
          Boolean(value && typeof value === "object" && Object.isFrozen(value)) &&
          Object.values(value).every((entry) =>
            !entry || typeof entry !== "object" || deepFrozen(entry));
        const pathDeclared = (path) =>
          projectAuthoringAdapter.generatedPaths.includes(path) ||
          projectAuthoringAdapter.generatedPathPatterns.some(
            (pattern) => path.startsWith(pattern.prefix) && path.endsWith(pattern.suffix),
          );

        if (projectAuthoringAdapter.protocolVersion !== 1) {
          throw new Error("Unsupported authoring protocol");
        }
        const require = createRequire(import.meta.url);
        const packageManifest = JSON.parse(
          await readFile(require.resolve("@dreamboard-games/sdk/package.json"), "utf8"),
        );
        if (projectAuthoringAdapter.metadata.sdkVersion !== packageManifest.version) {
          throw new Error("Authoring metadata version does not match the packed SDK manifest");
        }
        if (!deepFrozen(projectAuthoringAdapter.manifestConformanceCases)) {
          throw new Error("Authoring conformance cases are not deeply frozen");
        }

        let validCaseCount = 0;
        let invalidCaseCount = 0;
        for (const testCase of projectAuthoringAdapter.manifestConformanceCases) {
          const validation = projectAuthoringAdapter.validateManifest(testCase.manifest);
          if (validation.valid !== testCase.expected.valid) {
            throw new Error(testCase.id + " validity mismatch");
          }
          if (validation.valid) {
            validCaseCount += 1;
            const materialized = projectAuthoringAdapter.materializeManifest(testCase.manifest);
            const digest = sha256(stableJson(materialized));
            if (digest !== testCase.expected.materializedSha256) {
              throw new Error(testCase.id + " materialized digest mismatch");
            }
            const workspaceFirst = projectAuthoringAdapter.generateWorkspaceArtifacts(testCase.manifest);
            const workspaceSecond = projectAuthoringAdapter.generateWorkspaceArtifacts(testCase.manifest);
            if (stableJson(workspaceFirst) !== stableJson(workspaceSecond)) {
              throw new Error(testCase.id + " artifact generation is not deterministic");
            }
            const paths = workspaceFirst.map((artifact) => artifact.path);
            if (stableJson(paths) !== stableJson([...paths].sort((left, right) => left.localeCompare(right)))) {
              throw new Error(testCase.id + " workspace artifacts are not sorted");
            }
            const allArtifacts = [...workspaceFirst];
            if (new Set(allArtifacts.map((artifact) => artifact.path)).size !== allArtifacts.length) {
              throw new Error(testCase.id + " emitted duplicate artifact paths");
            }
            for (const artifact of allArtifacts) {
              if (!pathDeclared(artifact.path)) {
                throw new Error(testCase.id + " emitted undeclared path " + artifact.path);
              }
              if (artifact.contentSha256 !== sha256(artifact.content)) {
                throw new Error(testCase.id + " emitted a stale content hash");
              }
            }
          } else {
            invalidCaseCount += 1;
            const codes = diagnosticCodesForValidationErrors(validation.errors);
            if (stableJson(codes) !== stableJson(testCase.expected.diagnosticCodes)) {
              throw new Error(testCase.id + " diagnostic code mismatch");
            }
          }
        }
        console.log(JSON.stringify({
          protocolVersion: projectAuthoringAdapter.protocolVersion,
          sdkVersion: packageManifest.version,
          metadata: projectAuthoringAdapter.metadata,
          fixtureDigest: sha256(stableJson(projectAuthoringAdapter.manifestConformanceCases)),
          fixtureCount: projectAuthoringAdapter.manifestConformanceCases.length,
          validCaseCount,
          invalidCaseCount,
          generatedPathCount: projectAuthoringAdapter.generatedPaths.length,
          generatedPathPatternCount: projectAuthoringAdapter.generatedPathPatterns.length,
        }));
      `,
    );
    const authoringOutput = runCaptured("node", [authoringProbePath], {
      cwd: consumerDir,
    });
    const authoringProof = JSON.parse(authoringOutput.trim());

    const cssFailures = [];
    for (const cssExport of exportsToSmoke.css) {
      const cssPath = path.resolve(sdkRoot, cssExport.target);
      const relative = path.relative(sdkRoot, cssPath);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        cssFailures.push(`${cssExport.subpath} resolves outside package`);
        continue;
      }
      const cssStat = await stat(cssPath).catch(() => null);
      if (!cssStat || cssStat.size === 0) {
        cssFailures.push(`${cssExport.subpath} missing or empty`);
        continue;
      }
      console.log(
        `${packageSpecifier(cssExport.subpath)} -> ${cssStat.size} bytes`,
      );
    }
    if (cssFailures.length > 0) {
      throw new Error(
        `CSS export smoke failures:\n  ${cssFailures.join("\n  ")}`,
      );
    }

    console.log(
      `\nOK: imported ${exportsToSmoke.js.length} JS subpaths and checked ${exportsToSmoke.css.length} CSS exports from ${path.basename(tarballPath)}`,
    );
    if (receiptPath) {
      const tarballBytes = await readFile(tarballPath);
      await mkdir(path.dirname(receiptPath), { recursive: true });
      await writeFile(
        receiptPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            kind: "dreamboard-sdk-package-candidate",
            checkedAt: new Date().toISOString(),
            package: {
              name: manifest.name,
              version: manifest.version,
              tarball: path.basename(tarballPath),
              sha512: createHash("sha512").update(tarballBytes).digest("hex"),
              integrity: `sha512-${createHash("sha512")
                .update(tarballBytes)
                .digest("base64")}`,
            },
            authoring: authoringProof,
            publicJsSubpathCount: exportsToSmoke.js.length,
            publicCssSubpathCount: exportsToSmoke.css.length,
          },
          null,
          2,
        )}\n`,
      );
    }
  } finally {
    await rm(consumerDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
