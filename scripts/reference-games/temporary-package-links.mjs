import { createRequire } from "node:module";
import { lstat, mkdir, readlink, rm, symlink } from "node:fs/promises";
import path from "node:path";

import { root } from "../ui/reference-games-lib.mjs";

const sdkRequire = createRequire(
  new URL("../../packages/sdk/package.json", import.meta.url),
);

const packageTargets = [
  {
    packageName: "@dreamboard-games/sdk",
    target: path.join(root, "packages/sdk"),
  },
  {
    packageName: "@dreamboard-games/plugin-runtime-contract",
    target: path.join(root, "packages/plugin-runtime-contract"),
  },
  {
    packageName: "react",
    target: path.dirname(sdkRequire.resolve("react/package.json")),
  },
  {
    packageName: "react-dom",
    target: path.dirname(sdkRequire.resolve("react-dom/package.json")),
  },
  {
    packageName: "zod",
    target: path.dirname(sdkRequire.resolve("zod/package.json")),
  },
];

/**
 * Give reference-game source tools a temporary, source-backed package graph.
 * Reference games are deliberately outside the pnpm workspace, so a root-only
 * install does not create their package links. The caller remains responsible
 * for serializing mutations that can overlap (Workbench does so with its
 * materialization lock).
 */
export async function withTemporaryReferenceGamePackageLinks(
  { gameRoots = [] } = {},
  callback,
) {
  if (typeof callback !== "function") {
    throw new TypeError("A temporary package-link callback is required.");
  }

  const nodeModulesRoots = [
    path.join(root, "node_modules"),
    ...gameRoots.map((gameRoot) => path.join(gameRoot, "node_modules")),
  ];
  const linkTargets = nodeModulesRoots.flatMap((nodeModulesRoot) =>
    packageTargets.map(({ packageName, target }) => ({
      link: path.join(nodeModulesRoot, packageName),
      target,
    })),
  );
  const restorations = [];

  try {
    for (const item of linkTargets) {
      await mkdir(path.dirname(item.link), { recursive: true });
      const stat = await lstat(item.link).catch((error) => {
        if (error?.code === "ENOENT") return null;
        throw error;
      });
      if (stat && !stat.isSymbolicLink()) {
        throw new Error(
          `${item.link} exists and is not a symlink; refusing to replace it for reference-game tooling.`,
        );
      }

      const previousTarget = stat ? await readlink(item.link) : null;
      if (
        previousTarget !== null &&
        path.resolve(path.dirname(item.link), previousTarget) ===
          path.resolve(item.target)
      ) {
        continue;
      }

      restorations.push({ link: item.link, previousTarget });
      if (stat) {
        await rm(item.link, { force: true });
      }
      await symlink(item.target, item.link, "dir");
    }

    return await callback();
  } finally {
    for (const { link, previousTarget } of restorations.reverse()) {
      await rm(link, { force: true });
      if (previousTarget !== null) {
        await symlink(previousTarget, link, "dir");
      }
    }
  }
}
