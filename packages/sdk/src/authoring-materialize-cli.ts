#!/usr/bin/env node
import { materializeWorkspace } from "./authoring/materialize-workspace.js";

const options = parseArgs(process.argv.slice(2));
const receipt = await materializeWorkspace(options);
console.log(JSON.stringify(receipt, null, 2));

function parseArgs(argv: readonly string[]): {
  readonly manifestPath: string;
  readonly projectRoot?: string;
  readonly writeMissingSeeds?: boolean;
} {
  let manifestPath: string | undefined;
  let projectRoot: string | undefined;
  let writeMissingSeeds = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") {
      manifestPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--project-root") {
      projectRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--write-missing-seeds") {
      writeMissingSeeds = true;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  if (!manifestPath) {
    throw new Error("--manifest is required.");
  }
  return {
    manifestPath,
    ...(projectRoot === undefined ? {} : { projectRoot }),
    ...(writeMissingSeeds ? { writeMissingSeeds: true } : {}),
  };
}
