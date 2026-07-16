import { createRequire } from "node:module";
import { lstat, mkdir, readlink, rm, symlink } from "node:fs/promises";
import path from "node:path";

import { hasErrorCode, root } from "../../ui/support.ts";

const sdkRequire = createRequire(
  new URL("../../../packages/sdk/package.json", import.meta.url),
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
] as const;

interface LinkRestoration {
  readonly link: string;
  readonly previousTarget: string | null;
}

export async function withTemporarySourcePackageLinks<T>(
  gameRoots: readonly string[],
  callback: () => Promise<T>,
): Promise<T> {
  const nodeModulesRoots = [
    path.join(root, "node_modules"),
    ...gameRoots.map((gameRoot) => path.join(gameRoot, "node_modules")),
  ];
  const links = nodeModulesRoots.flatMap((nodeModulesRoot) =>
    packageTargets.map(({ packageName, target }) => ({
      link: path.join(nodeModulesRoot, packageName),
      target,
    })),
  );
  const restorations: LinkRestoration[] = [];

  try {
    for (const item of links) {
      await mkdir(path.dirname(item.link), { recursive: true });
      const current = await lstat(item.link).catch((error: unknown) => {
        if (hasErrorCode(error, "ENOENT")) return null;
        throw error;
      });
      if (current && !current.isSymbolicLink()) {
        throw new Error(
          `${item.link} exists and is not a symlink; refusing to replace it.`,
        );
      }
      const previousTarget = current ? await readlink(item.link) : null;
      if (
        previousTarget !== null &&
        path.resolve(path.dirname(item.link), previousTarget) ===
          path.resolve(item.target)
      ) {
        continue;
      }
      restorations.push({ link: item.link, previousTarget });
      if (current) await rm(item.link, { force: true });
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
