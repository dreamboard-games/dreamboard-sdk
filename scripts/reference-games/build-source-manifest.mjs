import path from "node:path";
import { pathToFileURL } from "node:url";

const compilerPath = path.resolve(
  import.meta.dirname,
  "../../packages/sdk/dist/reference-game-compiler.js",
);

async function loadCompiler() {
  return import(pathToFileURL(compilerPath).href);
}

export async function buildReferenceGameSourceManifest(options) {
  const compiler = await loadCompiler();
  return compiler.collectReferenceGameSourceManifest(options);
}

export async function collectReferenceGameSourceObjects(options) {
  const compiler = await loadCompiler();
  return compiler.collectReferenceGameSourceObjects(options);
}
