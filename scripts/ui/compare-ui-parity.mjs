#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  compareUIParityObservations,
  parseUIParityObservation,
} from "../../packages/sdk/dist/testing.js";
import { root } from "./reference-games-lib.mjs";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--expected" || arg === "--actual" || arg === "--out") {
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  if (!options.expected || !options.actual) {
    throw new Error(
      "Usage: node scripts/ui/compare-ui-parity.mjs --expected <observation.json> --actual <observation.json> [--out <comparison.json>]",
    );
  }
  return options;
}

async function readObservation(filePath) {
  return parseUIParityObservation(
    JSON.parse(await readFile(path.resolve(root, filePath), "utf8")),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const expected = await readObservation(options.expected);
  const actual = await readObservation(options.actual);
  const result = compareUIParityObservations(expected, actual);
  if (options.out) {
    const outPath = path.resolve(root, options.out);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (!result.ok) {
    console.error(JSON.stringify(result.failure, null, 2));
    process.exit(1);
  }
  console.log("UI parity observations match");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
