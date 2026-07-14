#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compareCanonicalStrings,
  root,
  sha256File,
  writeJson,
} from "../ui/reference-games-lib.mjs";
import { buildReferenceGameSourceManifest } from "./build-source-manifest.mjs";
import { materializeReferenceGameSource } from "./materialize-git-source.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceRef = args["source-ref"] ?? "HEAD";
  const outRoot = path.resolve(
    root,
    args.out ?? path.join("build/reference-games/source"),
  );

  run("pnpm", ["--filter", "@dreamboard-games/sdk", "build"]);

  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-reference-games-"),
  );
  try {
    const materialized = await materializeReferenceGameSource({
      sourceRef,
      outputRoot: path.join(tempRoot, "source"),
    });
    const manifest = await buildReferenceGameSourceManifest({
      sourceRoot: materialized.sourceRoot,
      provenance: {
        kind: "git",
        repository: "dreamboard-games/dreamboard-sdk",
        revision: materialized.revision,
      },
    });
    const bundleDir = path.join(
      outRoot,
      manifest.sourceFingerprint.replace("sha256:", "sha256-"),
    );
    await rm(bundleDir, { recursive: true, force: true });
    await mkdir(bundleDir, { recursive: true });

    const manifestPath = path.join(
      bundleDir,
      "reference-game-source-manifest.json",
    );
    await writeJson(manifestPath, manifest);
    const archivePath = path.join(bundleDir, "reference-game-source.tar.gz");
    await writeDeterministicSourceArchive({
      sourceRoot: materialized.sourceRoot,
      objects: manifest.payload.objects,
      manifestPath,
      archivePath,
    });
    const receipt = {
      schemaVersion: 2,
      receiptType: "dreamboard.reference-game-source-materialization",
      sourceRevision: materialized.revision,
      sourceFingerprint: manifest.sourceFingerprint,
      manifestSha256: `sha256:${await sha256File(manifestPath)}`,
      archiveSha256: `sha256:${await sha256File(archivePath)}`,
      output: path.relative(root, bundleDir),
    };
    await writeJson(
      path.join(bundleDir, "materialization-receipt.json"),
      receipt,
    );
    console.log(JSON.stringify(receipt, null, 2));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function writeDeterministicSourceArchive({
  sourceRoot,
  objects,
  manifestPath,
  archivePath,
}) {
  const entries = [
    ...objects.map(({ path: objectPath }) => ({
      name: objectPath,
      absolute: path.join(sourceRoot, objectPath),
    })),
    {
      name: "reference-game-source-manifest.json",
      absolute: manifestPath,
    },
  ].sort((left, right) => compareCanonicalStrings(left.name, right.name));
  const chunks = [];
  for (const entry of entries) {
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
    archivePath,
    gzipSync(Buffer.concat(chunks), {
      mtime: 0,
    }),
  );
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
  writeOctal(header, 0, 136, 12);
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

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value.`);
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
