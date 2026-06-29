import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { sdkPackages, sdkPackageNames } from "./sdk-packages.mjs";

const root = path.resolve(import.meta.dirname, "..");
const registryUrl =
  process.env.SDK_LOCAL_REGISTRY_URL ?? "http://127.0.0.1:4873";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

async function hashDirectory(hash, dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".turbo" ||
      entry.name === "tsconfig.tsbuildinfo"
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath);
    hash.update(relativePath);
    if (entry.isDirectory()) {
      await hashDirectory(hash, fullPath);
    } else if (entry.isFile()) {
      hash.update(await readFile(fullPath));
    }
  }
}

function localTimestamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function rewriteDeps(deps, localVersion) {
  if (!deps) {
    return deps;
  }
  const next = { ...deps };
  for (const name of Object.keys(next)) {
    if (sdkPackageNames.has(name)) {
      next[name] = localVersion;
    }
  }
  return next;
}

async function preparePackage(pkg, localVersion, tempRoot) {
  const sourceDir = path.join(root, pkg.dir);
  const outDir = path.join(tempRoot, pkg.name.replace("/", "__"));
  await cp(sourceDir, outDir, {
    recursive: true,
    filter: (source) => {
      const basename = path.basename(source);
      return (
        basename !== "node_modules" &&
        basename !== ".turbo" &&
        basename !== "tsconfig.tsbuildinfo"
      );
    },
  });

  const packageJsonPath = path.join(outDir, "package.json");
  const manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));
  manifest.version = localVersion;
  delete manifest.private;
  manifest.publishConfig = {
    ...(manifest.publishConfig ?? {}),
    access: "public",
    registry: registryUrl,
  };
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    manifest[field] = rewriteDeps(manifest[field], localVersion);
  }
  await writeFile(packageJsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
  if (pkg.name === "@dreamboard-games/sdk") {
    await stampSdkAuthoringMetadata(outDir, manifest.version);
  }
  return outDir;
}

async function stampSdkAuthoringMetadata(packageDir, packageVersion) {
  const generatedSourcePath = path.join(
    packageDir,
    "src",
    "authoring",
    "generated-metadata.ts",
  );
  const source = await readFile(generatedSourcePath, "utf8");
  await writeFile(
    generatedSourcePath,
    source.replace(
      /sdkVersion:\s*"[^"]+"/,
      `sdkVersion: ${JSON.stringify(packageVersion)}`,
    ),
  );

  const distRoot = path.join(packageDir, "dist");
  const queue = [distRoot];
  let runtimeReplacementCount = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }
      if (!entry.isFile() || !/\.(js|map)$/.test(entry.name)) continue;
      const content = await readFile(entryPath, "utf8");
      if (!content.includes("sdkVersion")) continue;
      const next = content.replace(
        /sdkVersion:\s*"[^"]+"/g,
        `sdkVersion: ${JSON.stringify(packageVersion)}`,
      );
      if (next !== content) {
        await writeFile(entryPath, next);
        if (entry.name.endsWith(".js")) runtimeReplacementCount += 1;
      }
    }
  }
  if (runtimeReplacementCount === 0) {
    throw new Error(
      "Local SDK staging could not stamp bundled authoring metadata.",
    );
  }
}

async function main() {
  const rootManifest = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  const hash = createHash("sha256");
  for (const pkg of sdkPackages) {
    await hashDirectory(hash, path.join(root, pkg.dir));
  }
  const fingerprint = hash.digest("hex").slice(0, 12);
  const localVersion = `${rootManifest.version}-local.${localTimestamp()}.${fingerprint}`;
  const tempRoot = path.join(
    root,
    ".dreamboard-dev",
    "local-publish",
    localVersion,
  );

  await rm(tempRoot, { recursive: true, force: true });
  await mkdir(tempRoot, { recursive: true });

  run("pnpm", ["--filter", "@dreamboard-games/sdk", "build"]);

  for (const pkg of sdkPackages) {
    const outDir = await preparePackage(pkg, localVersion, tempRoot);
    const distStats = await stat(path.join(outDir, "dist")).catch(() => null);
    if (!distStats) {
      throw new Error(`${pkg.name} did not produce dist/ before publish`);
    }
    run("npm", ["publish", "--registry", registryUrl, "--tag", "local"], {
      cwd: outDir,
    });
  }

  const packages = Object.fromEntries(
    sdkPackages.map((pkg) => [pkg.name, localVersion]),
  );
  for (const [name, version] of Object.entries(packages)) {
    run("npm", [
      "view",
      `${name}@${version}`,
      "version",
      "--registry",
      registryUrl,
    ]);
  }

  const receipt = {
    version: 1,
    sdkVersion: localVersion,
    registryUrl,
    publishedAt: new Date().toISOString(),
    packages,
  };
  const receiptPath = path.join(
    root,
    ".dreamboard-dev",
    "local-registry",
    "sdk-package-set.json",
  );
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, receiptPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
