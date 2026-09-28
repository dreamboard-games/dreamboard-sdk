import { readFile } from "node:fs/promises";
import path from "node:path";

/** Read the one documented preparation script, so isolation uses the author's steps. */
export async function readStarterPreparation(root: string): Promise<string> {
  const content = await readFile(
    path.join(root, "templates/game/README.md"),
    "utf8",
  );
  const script = content.match(
    /node --input-type=module <<'JS'\n([\s\S]*?)\nJS/,
  );
  if (!script)
    throw new Error(
      "Starter README must include its dependency preparation script.",
    );
  return script[1];
}

/** Only the complete quick-start example is executable documentation. */
export async function readQuickStart(root: string): Promise<string> {
  const content = await readFile(
    path.join(root, "docs/guides/getting-started/quick-start.md"),
    "utf8",
  );
  const examples = [...content.matchAll(/```ts\n([\s\S]*?)\n```/g)];
  if (examples.length !== 1)
    throw new Error(
      "Quick start must contain one complete TypeScript example.",
    );
  return examples[0][1];
}
