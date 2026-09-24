import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readCatalogs, catalogVersion } from "./catalogs.ts";
import { prepareIsolatedReferenceGame } from "./verify.ts";

test("portable game preparation preserves authored aliases and resolves canonical catalogs exactly", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reference-catalog-"));
  try {
    await writeFile(
      path.join(root, "pnpm-workspace.yaml"),
      "catalog:\n  vite: ^8.0.0\n",
    );
    await writeFile(
      path.join(root, "pnpm-lock.yaml"),
      "catalogs:\n  default:\n    vite:\n      specifier: ^8.0.0\n      version: 8.0.16\n",
    );
    await writeFile(
      path.join(root, "tsconfig.base.json"),
      JSON.stringify({ compilerOptions: { strict: true } }),
    );
    const game = path.join(root, "examples/game");
    const sandbox = path.join(root, "isolated");
    await mkdir(game, { recursive: true });
    await mkdir(sandbox);
    const config = {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        paths: { "@game": ["./ui/game.ts"], "@/*": ["./ui/*"] },
      },
      include: ["ui/**/*", "test/**/*", "vite.config.ts"],
    };
    await writeFile(
      path.join(sandbox, "tsconfig.json"),
      JSON.stringify(config),
    );
    await writeFile(
      path.join(sandbox, "package.json"),
      JSON.stringify({
        dependencies: { "@dreamboard-games/sdk": "workspace:*" },
        devDependencies: { vite: "catalog:" },
      }),
    );
    const catalogs = await readCatalogs(root);
    await prepareIsolatedReferenceGame(
      { id: "fixture", dir: game },
      sandbox,
      "/tmp/candidate.tgz",
      root,
      catalogs,
    );
    const portable = JSON.parse(
      await readFile(path.join(sandbox, "tsconfig.json"), "utf8"),
    );
    assert.deepEqual(portable, { ...config, extends: "./tsconfig.base.json" });
    assert.deepEqual(
      JSON.parse(
        await readFile(path.join(sandbox, "tsconfig.base.json"), "utf8"),
      ),
      { compilerOptions: { strict: true } },
    );
    const pkg = JSON.parse(
      await readFile(path.join(sandbox, "package.json"), "utf8"),
    );
    assert.equal(pkg.packageManager, "pnpm@10.4.1");
    assert.equal(
      pkg.dependencies["@dreamboard-games/sdk"],
      "file:/tmp/candidate.tgz",
    );
    assert.equal(pkg.devDependencies.vite, "8.0.16");
    assert.throws(
      () => catalogVersion(catalogs, "missing", "catalog:"),
      /no current locked version/,
    );
    await writeFile(
      path.join(root, "pnpm-workspace.yaml"),
      "catalog:\n  vite: ^9.0.0\n",
    );
    const stale = await readCatalogs(root);
    assert.throws(
      () => catalogVersion(stale, "vite", "catalog:"),
      /no current locked version/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
