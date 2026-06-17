#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sdkDist = path.join(root, "packages/sdk/dist");
const pluginContractDist = path.join(
  root,
  "packages/plugin-runtime-contract/dist",
);

await mkdir(sdkDist, { recursive: true });

const declarationChunks = (await readdir(pluginContractDist)).filter(
  (fileName) => /^schema-.*\.d\.ts$/.test(fileName),
);
const sdkReducerContractChunk = (await readdir(sdkDist)).find((fileName) =>
  /^index\.d-.*\.d\.ts$/.test(fileName),
);

if (declarationChunks.length === 0) {
  throw new Error(
    "Expected plugin-runtime-contract declaration chunks to exist before copying SDK private DTS files.",
  );
}
if (!sdkReducerContractChunk) {
  throw new Error(
    "Expected SDK reducer-contract declaration chunk to exist before copying SDK private DTS files.",
  );
}

for (const fileName of declarationChunks) {
  const sourcePath = path.join(pluginContractDist, fileName);
  const targetPath = path.join(sdkDist, fileName);
  const source = await readFile(sourcePath, "utf8");
  const rewritten = source
    .replace(/\nimport '@dreamboard-games\/reducer-contract\/zod';/, "")
    .replace(
      /import \* as Wire from '@dreamboard-games\/reducer-contract\/wire';/,
      `import { w as Wire } from './${sdkReducerContractChunk.replace(/\.d\.ts$/, ".js")}';`,
    );
  await writeFile(targetPath, rewritten);
}
