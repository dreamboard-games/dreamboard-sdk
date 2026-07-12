#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildRoot,
  compareCanonicalStrings,
  expectedReferenceGameIds,
  readJson,
  referenceGamesRoot,
  repoCommandEnv,
  root,
  sha256Directory,
  sha256File,
  walkFiles,
  writeJson,
} from "./reference-games-lib.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env:
      command === "git"
        ? repoCommandEnv(options.env)
        : (options.env ?? process.env),
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${options.cwd ?? root}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result;
}

async function packPackage(gameId, destination) {
  const gameDir = path.join(referenceGamesRoot, gameId);
  const pack = run(
    "npm",
    ["pack", "--json", "--pack-destination", destination],
    {
      cwd: gameDir,
    },
  );
  const output = JSON.parse(pack.stdout);
  const tarballName = output[0]?.filename;
  if (!tarballName) {
    throw new Error(
      `npm pack did not report a tarball for ${gameId}\n${pack.stdout}`,
    );
  }
  const tarballPath = path.join(destination, tarballName);
  return {
    filename: tarballName,
    sha256: `sha256:${await sha256File(tarballPath)}`,
  };
}

function writeString(buffer, value, offset, length) {
  buffer.write(value.slice(0, length), offset, length, "utf8");
}

function writeOctal(buffer, value, offset, length) {
  const octal = value.toString(8).padStart(length - 1, "0");
  buffer.write(`${octal}\0`, offset, length, "ascii");
}

function splitTarPath(name) {
  if (Buffer.byteLength(name) <= 100) {
    return { name, prefix: "" };
  }
  const parts = name.split("/");
  for (let index = parts.length - 1; index > 0; index -= 1) {
    const entryName = parts.slice(index).join("/");
    const prefix = parts.slice(0, index).join("/");
    if (
      Buffer.byteLength(entryName) <= 100 &&
      Buffer.byteLength(prefix) <= 155
    ) {
      return { name: entryName, prefix };
    }
  }
  throw new Error(`Deterministic tar entry name is too long: ${name}`);
}

function tarHeader({ name, size }) {
  const tarPath = splitTarPath(name);
  const header = Buffer.alloc(512, 0);
  writeString(header, tarPath.name, 0, 100);
  writeOctal(header, 0o644, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, size, 124, 12);
  writeOctal(header, 1781568000, 136, 12);
  header.fill(" ", 148, 156);
  writeString(header, "0", 156, 1);
  writeString(header, "ustar\0", 257, 6);
  writeString(header, "00", 263, 2);
  if (tarPath.prefix) {
    writeString(header, tarPath.prefix, 345, 155);
  }

  let checksum = 0;
  for (const byte of header) {
    checksum += byte;
  }
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  return header;
}

async function collectBundleEntries() {
  const sources = [
    {
      baseDir: root,
      includeDir: path.join(root, "examples/reference-games"),
      prefix: "examples/reference-games",
      excludeDirs: new Set(["node_modules", "dist"]),
    },
    {
      baseDir: buildRoot,
      includeDir: path.join(buildRoot, "packages"),
      prefix: "packages",
      excludeDirs: new Set(),
    },
  ];
  const entries = [];
  for (const source of sources) {
    const files = await walkFiles(source.includeDir, {
      excludeDirs: source.excludeDirs,
    });
    for (const relative of files) {
      const absolute = path.join(source.includeDir, relative);
      entries.push({
        name: path.posix.join(
          source.prefix,
          relative.split(path.sep).join("/"),
        ),
        absolute,
      });
    }
  }
  return entries.sort((left, right) =>
    compareCanonicalStrings(left.name, right.name),
  );
}

async function writeDeterministicBundle(bundlePath) {
  const chunks = [];
  for (const entry of await collectBundleEntries()) {
    const content = await readFile(entry.absolute);
    chunks.push(tarHeader({ name: entry.name, size: content.length }));
    chunks.push(content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) {
      chunks.push(Buffer.alloc(padding, 0));
    }
  }
  chunks.push(Buffer.alloc(1024, 0));
  await writeFile(
    bundlePath,
    gzipSync(Buffer.concat(chunks), {
      mtime: 0,
    }),
  );
}

async function main() {
  run("node", ["scripts/ui/check-reference-games.mjs"], {
    cwd: root,
    stdio: "inherit",
  });

  await rm(buildRoot, { recursive: true, force: true });
  await mkdir(buildRoot, { recursive: true });
  const packageRoot = path.join(buildRoot, "packages");
  await mkdir(packageRoot, { recursive: true });

  const sdkPackDir = path.join(buildRoot, "sdk");
  await mkdir(sdkPackDir, { recursive: true });
  run("pnpm", ["--filter", "@dreamboard-games/sdk", "build"], {
    cwd: root,
    stdio: "inherit",
  });
  const sdkPack = run(
    "npm",
    ["pack", "--json", "--pack-destination", sdkPackDir],
    { cwd: path.join(root, "packages/sdk") },
  );
  const sdkTarballName = JSON.parse(sdkPack.stdout)[0]?.filename;
  if (!sdkTarballName) {
    throw new Error(
      `npm pack did not report an SDK tarball\n${sdkPack.stdout}`,
    );
  }
  const sdkTarballPath = path.join(sdkPackDir, sdkTarballName);

  const sdkCommit = run("git", ["rev-parse", "--short=12", "HEAD"], {
    cwd: root,
  }).stdout.trim();
  const games = {};
  for (const gameId of expectedReferenceGameIds) {
    const gameDir = path.join(referenceGamesRoot, gameId);
    const packageJson = await readJson(path.join(gameDir, "package.json"));
    const packed = await packPackage(gameId, packageRoot);
    games[gameId] = {
      name: packageJson.name,
      version: packageJson.version,
      sourceSha256: `sha256:${await sha256Directory(gameDir, {
        excludeDirs: new Set(["node_modules", "dist"]),
      })}`,
      compiledPackageSha256: packed.sha256,
      compiledPackage: `packages/${packed.filename}`,
    };
  }

  const bundlePath = path.join(buildRoot, "reference-games-bundle.tgz");
  await writeDeterministicBundle(bundlePath);

  const lock = {
    schemaVersion: 1,
    sdkCommit,
    sdkTarballSha256: `sha256:${await sha256File(sdkTarballPath)}`,
    referenceBundle: {
      url: `artifact://dreamboard-sdk/reference-games/${sdkCommit}.tgz`,
      path: path.relative(root, bundlePath),
      sha256: `sha256:${await sha256File(bundlePath)}`,
    },
    games,
  };
  await writeJson(path.join(buildRoot, "reference-bundle.lock.json"), lock);
  console.log(JSON.stringify(lock, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
