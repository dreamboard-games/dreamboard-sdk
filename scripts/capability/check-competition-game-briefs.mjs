#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const researchDir = path.join(
  repoRoot,
  "docs/capability-research/competition-game-authoring",
);
const briefsDir = path.join(researchDir, "briefs");
const schemaPath = path.join(researchDir, "brief.schema.json");
const matrixPath = path.join(researchDir, "capability-matrix.yaml");
const receiptPath = path.join(
  repoRoot,
  "artifacts/capability/competition-game-authoring/brief-check-receipt.json",
);

const allowedClassifications = new Set([
  "native",
  "composition",
  "intentionally-out-of-scope",
]);
const deprecatedGapClassifications = new Set([
  "ergonomic-gap",
  "contract-gap",
  "blocked",
]);
const allowedSourceKinds = new Set(["original", "anonymized"]);
const allowedRights = new Set([
  "public-safe-original",
  "public-safe-anonymized",
]);
const requiredBriefFields = [
  "id",
  "title",
  "source",
  "players",
  "authorJobs",
  "uiJobs",
  "authorityJobs",
  "acceptance",
];
const nonNativeRequiredFields = [
  "publicApiSymbol",
  "sourceImplementation",
  "referenceGameCallSite",
  "focusedTest",
  "workbenchScenario",
  "packedProof",
  "publicDocumentation",
  "retainedLimitation",
];
const commercialTerms = [
  "7 wonders",
  "azul",
  "catan",
  "dominion",
  "dungeons & dragons",
  "gloomhaven",
  "magic: the gathering",
  "monopoly",
  "pokemon",
  "scythe",
  "terraforming mars",
  "ticket to ride",
  "wingspan",
  "yahtzee",
];
const anchorBriefIds = new Set([
  "roll-and-write-scorecard-01",
  "multiplayer-ranking-and-ties-01",
  "solo-countdown-puzzle-01",
  "automa-river-rival-01",
]);

const errors = [];

function fail(message) {
  errors.push(message);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonLike(filePath) {
  const raw = await readFile(filePath, "utf8");
  try {
    return {
      raw,
      value: JSON.parse(raw),
      hash: createHash("sha256").update(raw).digest("hex"),
    };
  } catch (error) {
    const normalized = raw.replace(/,\s*([}\]])/g, "$1");
    try {
      return {
        raw,
        value: JSON.parse(normalized),
        hash: createHash("sha256").update(raw).digest("hex"),
      };
    } catch {
      fail(
        `${path.relative(repoRoot, filePath)} must use the repository's formatted JSON-compatible YAML subset: ${error.message}`,
      );
      return { raw, value: null, hash: null };
    }
  }
}

function requireStringArray(record, field, context) {
  const value = record[field];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string" && item.trim().length > 0)
  ) {
    fail(`${context}.${field} must be a non-empty string array`);
    return [];
  }
  return value;
}

function validateBrief(fileName, brief, raw) {
  const context = `brief ${fileName}`;
  if (!isRecord(brief)) {
    fail(`${context} must be an object`);
    return null;
  }
  for (const field of requiredBriefFields) {
    if (!(field in brief))
      fail(`${context} is missing required field ${field}`);
  }
  if (
    typeof brief.id !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{2}$/.test(brief.id)
  ) {
    fail(
      `${context}.id must be a stable kebab-case id ending in a two-digit suffix`,
    );
  }
  if (!fileName.startsWith(`${brief.id}.`)) {
    fail(`${context} filename must match id ${brief.id}`);
  }
  if (typeof brief.title !== "string" || brief.title.length < 4) {
    fail(`${context}.title must be a useful string`);
  }
  if (
    "summary" in brief &&
    (typeof brief.summary !== "string" || brief.summary.length < 12)
  ) {
    fail(`${context}.summary must be a useful string`);
  }
  if (!isRecord(brief.source)) {
    fail(`${context}.source must be an object`);
  } else {
    if (!allowedSourceKinds.has(brief.source.kind)) {
      fail(`${context}.source.kind is unsupported`);
    }
    if (!allowedRights.has(brief.source.rights)) {
      fail(`${context}.source.rights is missing or unsupported`);
    }
  }
  if (!isRecord(brief.players)) {
    fail(`${context}.players must be an object`);
  } else if (
    !Number.isInteger(brief.players.min) ||
    !Number.isInteger(brief.players.max) ||
    brief.players.min < 1 ||
    brief.players.max < brief.players.min
  ) {
    fail(`${context}.players must have integer min/max with max >= min`);
  }
  const authorJobs = requireStringArray(brief, "authorJobs", context);
  requireStringArray(brief, "uiJobs", context);
  requireStringArray(brief, "authorityJobs", context);
  requireStringArray(brief, "acceptance", context);
  for (const job of new Set(
    authorJobs.filter((item, index) => authorJobs.indexOf(item) !== index),
  )) {
    fail(`${context}.authorJobs contains duplicate job ${JSON.stringify(job)}`);
  }
  const lowerRaw = raw.toLowerCase();
  for (const term of commercialTerms) {
    if (lowerRaw.includes(term)) {
      fail(
        `${context} references prohibited commercial term ${JSON.stringify(term)}`,
      );
    }
  }
  return brief;
}

function validateMatrix(matrix, briefsById) {
  const matrixRows = Array.isArray(matrix)
    ? matrix
    : isRecord(matrix) && Array.isArray(matrix.rows)
      ? matrix.rows
      : null;
  if (!matrixRows) {
    fail(
      "capability-matrix.yaml must contain an array or an object with a rows array",
    );
    return [];
  }

  const matrixKeys = new Set();
  const briefIdsInMatrix = new Set();
  const jobRowsByBrief = new Map();

  for (const [index, row] of matrixRows.entries()) {
    const context = `matrix row ${index + 1}`;
    if (!isRecord(row)) {
      fail(`${context} must be an object`);
      continue;
    }
    const { briefId, job, classification } = row;
    if (!briefsById.has(briefId)) {
      fail(`${context} references unknown briefId ${JSON.stringify(briefId)}`);
      continue;
    }
    briefIdsInMatrix.add(briefId);
    const brief = briefsById.get(briefId);
    if (!brief.authorJobs.includes(job)) {
      fail(
        `${context} job ${JSON.stringify(job)} is absent from ${briefId}.authorJobs`,
      );
    }
    const key = `${briefId}\0${job}`;
    if (matrixKeys.has(key)) {
      fail(`${context} duplicates matrix coverage for ${briefId} / ${job}`);
    }
    matrixKeys.add(key);
    if (deprecatedGapClassifications.has(classification)) {
      fail(
        `${context} still uses deprecated Phase 00 gap classification ${JSON.stringify(
          classification,
        )}; Phase 05 rows must be native, composition, or intentionally-out-of-scope`,
      );
    } else if (!allowedClassifications.has(classification)) {
      fail(
        `${context} has unsupported classification ${JSON.stringify(classification)}`,
      );
    }
    requireStringArray(row, "canonicalConcepts", context);
    requireStringArray(row, "evidence", context);
    const rows = jobRowsByBrief.get(briefId) ?? [];
    rows.push(row);
    jobRowsByBrief.set(briefId, rows);

    if (classification !== "native") {
      for (const field of nonNativeRequiredFields) {
        const value = row[field];
        const isValidString =
          typeof value === "string" && value.trim().length > 0;
        const isValidStringArray =
          Array.isArray(value) &&
          value.length > 0 &&
          value.every(
            (item) => typeof item === "string" && item.trim().length > 0,
          );
        if (!isValidString && !isValidStringArray) {
          fail(`${context} is ${classification} but lacks ${field}`);
        }
      }
    }
  }

  for (const brief of briefsById.values()) {
    if (!briefIdsInMatrix.has(brief.id)) {
      fail(`brief ${brief.id} is not referenced by the capability matrix`);
    }
    for (const job of brief.authorJobs) {
      if (!matrixKeys.has(`${brief.id}\0${job}`)) {
        fail(
          `brief ${brief.id} author job ${JSON.stringify(job)} lacks a matrix row`,
        );
      }
    }
  }

  for (const anchorBriefId of anchorBriefIds) {
    const rows = jobRowsByBrief.get(anchorBriefId) ?? [];
    const brief = briefsById.get(anchorBriefId);
    if (!brief) {
      fail(`missing mandatory anchor brief ${anchorBriefId}`);
    } else if (rows.length !== brief.authorJobs.length) {
      fail(
        `anchor brief ${anchorBriefId} does not have complete capability rows`,
      );
    }
  }

  const nativeControlBriefs = [...jobRowsByBrief.entries()].filter(([, rows]) =>
    rows.every((row) => row.classification === "native"),
  );
  if (nativeControlBriefs.length < 2) {
    fail(
      "at least two briefs must be explicitly classified as requiring no new runtime capability",
    );
  }

  return matrixRows;
}

await readJsonLike(schemaPath);
const briefFiles = (await readdir(briefsDir))
  .filter((fileName) => fileName.endsWith(".yaml") || fileName.endsWith(".yml"))
  .sort();

if (briefFiles.length < 12) {
  fail(`expected at least 12 briefs, found ${briefFiles.length}`);
}

const briefsById = new Map();
const briefReceipts = [];
for (const fileName of briefFiles) {
  const filePath = path.join(briefsDir, fileName);
  const { raw, value, hash } = await readJsonLike(filePath);
  const brief = validateBrief(fileName, value, raw);
  if (!brief) continue;
  if (briefsById.has(brief.id)) {
    fail(`duplicate brief id ${brief.id}`);
  }
  briefsById.set(brief.id, brief);
  briefReceipts.push({
    id: brief.id,
    path: path.relative(repoRoot, filePath),
    sha256: hash,
    authorJobCount: Array.isArray(brief.authorJobs)
      ? brief.authorJobs.length
      : 0,
  });
}

const { value: matrix, hash: matrixHash } = await readJsonLike(matrixPath);
const rows = validateMatrix(matrix, briefsById);

const receipt = {
  status: errors.length === 0 ? "passed" : "failed",
  checkedAt: new Date().toISOString(),
  briefCount: briefsById.size,
  matrixRowCount: rows.length,
  schemaPath: path.relative(repoRoot, schemaPath),
  matrix: {
    path: path.relative(repoRoot, matrixPath),
    sha256: matrixHash,
  },
  briefs: briefReceipts,
  errors,
};

await mkdir(path.dirname(receiptPath), { recursive: true });
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  console.error(
    `competition game brief check failed; receipt: ${path.relative(repoRoot, receiptPath)}`,
  );
  process.exit(1);
}

console.log(
  `competition game brief check passed: ${briefsById.size} briefs, ${rows.length} matrix rows`,
);
console.log(`receipt: ${path.relative(repoRoot, receiptPath)}`);
