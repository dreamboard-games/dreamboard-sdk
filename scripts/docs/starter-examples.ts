import { readFile } from "node:fs/promises";
import path from "node:path";

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
