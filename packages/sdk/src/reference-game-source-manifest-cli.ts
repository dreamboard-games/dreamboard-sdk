#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { collectReferenceGameSourceManifest } from "./reference-games/source-collector.js";
import type { ReferenceGameSourceProvenance } from "./reference-games/schema.js";

const options = parseArgs(process.argv.slice(2));
const manifest = await collectReferenceGameSourceManifest(options);
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
if (options.out) {
  await writeFile(path.resolve(options.out), serialized);
} else {
  process.stdout.write(serialized);
}

function parseArgs(argv: readonly string[]): {
  readonly sourceRoot: string;
  readonly provenance: ReferenceGameSourceProvenance;
  readonly out?: string;
} {
  let sourceRoot: string | undefined;
  let out: string | undefined;
  let revision: string | undefined;
  let repository: string | undefined;
  let worktree = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-root") {
      sourceRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--out") {
      out = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--revision") {
      revision = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--repository") {
      repository = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--worktree") {
      worktree = true;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  if (!sourceRoot) throw new Error("--source-root is required.");
  if (worktree && (revision || repository)) {
    throw new Error("--worktree cannot be combined with Git provenance.");
  }
  let provenance: ReferenceGameSourceProvenance;
  if (worktree) {
    provenance = { kind: "worktree" };
  } else {
    if (!revision || !repository) {
      throw new Error(
        "Provide --worktree or both --repository and --revision.",
      );
    }
    if (repository !== "dreamboard-games/dreamboard-sdk") {
      throw new Error("--repository must be dreamboard-games/dreamboard-sdk.");
    }
    provenance = {
      kind: "git",
      repository: "dreamboard-games/dreamboard-sdk",
      revision,
    };
  }
  return {
    sourceRoot,
    provenance,
    ...(out === undefined ? {} : { out }),
  };
}
