import path from "node:path";
import { verifyReferenceGames } from "./verify.ts";
export { discoverReferenceGames } from "./games.ts";
export { verifyReferenceGames };
export async function runReferenceCommand(
  args: readonly string[],
  root = path.resolve(import.meta.dirname, "../.."),
): Promise<void> {
  if (args.length > 1) throw new Error("Usage: pnpm reference [game-id]");
  await verifyReferenceGames({ root, ...(args[0] ? { gameId: args[0] } : {}) });
}
