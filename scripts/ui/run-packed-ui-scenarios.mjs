#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { root } from "./reference-games-lib.mjs";

const result = spawnSync(
  "node",
  ["scripts/ui/verify-reference-consumers.mjs", ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
