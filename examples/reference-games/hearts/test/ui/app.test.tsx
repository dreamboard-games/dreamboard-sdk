import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Hearts app mounts generated surfaces under UI.Root", async () => {
  const appSource = await readFile(
    new URL("../../ui/App.tsx", import.meta.url),
    "utf8",
  );

  assert.match(appSource, /import\s+\{[^}]*\bUI\b[^}]*\}/s);
  assert.match(appSource, /<UI\.Root>\s*<GameUI\s*\/>\s*<\/UI\.Root>/s);
  assert.doesNotMatch(appSource, /ToastProvider/);
});
