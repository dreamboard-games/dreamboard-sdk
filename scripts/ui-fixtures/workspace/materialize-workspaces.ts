import path from "node:path";

import { materializeWorkspace } from "../../../packages/sdk/dist/authoring-compiler.js";
import {
  referenceGamesRoot,
  resolveReferenceGameIds,
} from "../../ui/support.ts";
import { withTemporarySourcePackageLinks } from "./package-links.ts";

export interface MaterializedGame {
  readonly id: string;
  readonly digest: string;
}

export async function withMaterializedReferenceGameWorkspaces<T>(
  requestedGameIds: readonly string[] = [],
  callback: (games: readonly MaterializedGame[]) => Promise<T>,
): Promise<T> {
  const gameIds = await resolveReferenceGameIds(requestedGameIds);
  const gameRoots = gameIds.map((id) => path.join(referenceGamesRoot, id));
  return withTemporarySourcePackageLinks(gameRoots, async () => {
    const materialized: MaterializedGame[] = [];
    for (const id of gameIds) {
      const result = await materializeWorkspace({
        projectRoot: path.join(referenceGamesRoot, id),
        manifestPath: "manifest.ts",
      });
      materialized.push({ id, digest: result.digest });
    }
    return callback(materialized);
  });
}

export async function materializeReferenceGameWorkspaces(
  requestedGameIds: readonly string[] = [],
): Promise<readonly MaterializedGame[]> {
  return withMaterializedReferenceGameWorkspaces(
    requestedGameIds,
    async (materialized) => materialized,
  );
}
