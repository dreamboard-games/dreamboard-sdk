import path from "node:path";

import { pinReferenceGames } from "./pin.ts";
import { verifyReferenceGames } from "./verify.ts";

export { discoverReferenceGames } from "./games.ts";
export {
  fetchPublicSdkMetadata,
  pinReferenceGames,
  readSdkLockIdentity,
  replaceFilesAtomically,
  requireExactPublicVersion,
} from "./pin.ts";
export { verifyReferenceGames } from "./verify.ts";

export async function runReferenceCommand(
  args: readonly string[],
  root = path.resolve(import.meta.dirname, "../.."),
): Promise<void> {
  if (args[0] === "pin") {
    if (args.length !== 2) {
      throw new Error("Usage: pnpm reference pin <version>");
    }
    await pinReferenceGames({ root, version: args[1] });
    return;
  }
  if (args.length > 1) {
    throw new Error("Usage: pnpm reference [game-id]");
  }
  await verifyReferenceGames({
    root,
    ...(args[0] ? { gameId: args[0] } : {}),
  });
}
