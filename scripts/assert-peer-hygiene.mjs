import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertPeerHygiene } from "./peer-hygiene-rules.mjs";

const root = path.resolve(import.meta.dirname, "..");
const sdkPackagePath = path.join(root, "packages/sdk/package.json");

const manifest = JSON.parse(await readFile(sdkPackagePath, "utf8"));
assertPeerHygiene(manifest, "packages/sdk/package.json");

console.log("SDK peer hygiene OK");
