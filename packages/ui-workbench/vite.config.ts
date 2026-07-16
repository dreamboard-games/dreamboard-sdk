import { createReadStream, existsSync, readFileSync } from "node:fs";
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

const workspaceRoot = path.resolve(__dirname, "../..");
const sdkRoot = path.join(workspaceRoot, "packages/sdk");
const sdkManifest = JSON.parse(
  readFileSync(path.join(sdkRoot, "package.json"), "utf8"),
) as {
  exports?: Record<
    string,
    string | { import?: string; default?: string; types?: string }
  >;
};
const referenceGamesRoot = path.join(workspaceRoot, "examples/reference-games");
const fixtureRequestPrefix = "/fixtures/";
const manifestContractId = "@dreamboard/manifest-contract";
const scenarioCatalogId = "virtual:dreamboard-scenario-catalog";
const uiSourceModulePrefix = "virtual:dreamboard-ui-source:";

function fixtureAssetPlugin(fixtureSourceRoot: string): Plugin {
  return {
    name: "dreamboard-fixture-assets",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = request.url?.split("?")[0] ?? "";
        if (!url.startsWith(fixtureRequestPrefix)) {
          next();
          return;
        }

        const relativePath = decodeURIComponent(
          url.slice(fixtureRequestPrefix.length),
        );
        const absolutePath = path.resolve(fixtureSourceRoot, relativePath);
        if (!absolutePath.startsWith(fixtureSourceRoot + path.sep)) {
          response.statusCode = 403;
          response.end("Forbidden fixture path.");
          return;
        }

        try {
          const stats = await stat(absolutePath);
          if (!stats.isFile()) {
            next();
            return;
          }
          if (absolutePath.endsWith(".mjs")) {
            const transformed = await server.transformRequest(
              `/@fs/${absolutePath}`,
            );
            response.setHeader("Content-Type", "application/javascript");
            response.end(transformed?.code ?? "");
            return;
          }
          response.setHeader(
            "Content-Type",
            absolutePath.endsWith(".json")
              ? "application/json"
              : "application/octet-stream",
          );
          createReadStream(absolutePath).pipe(response);
        } catch {
          next();
        }
      });
    },
    async closeBundle() {
      const outputRoot = path.join(__dirname, "dist/fixtures");
      await rm(outputRoot, { recursive: true, force: true });
      await mkdir(outputRoot, { recursive: true });
      await cp(fixtureSourceRoot, outputRoot, {
        recursive: true,
        force: true,
      });
    },
  };
}

function generatedScenarioPlugin(generatedRoot: string): Plugin {
  const catalogPath = path.join(generatedRoot, "catalog.ts");
  return {
    name: "dreamboard-generated-scenarios",
    enforce: "pre",
    configureServer(server) {
      server.watcher.add(generatedRoot);
      server.watcher.on("all", (_event, changedPath) => {
        if (
          path.resolve(changedPath).startsWith(`${generatedRoot}${path.sep}`)
        ) {
          server.ws.send({ type: "full-reload" });
        }
      });
    },
    resolveId(source) {
      if (source === scenarioCatalogId) {
        return catalogPath;
      }
      if (!source.startsWith(uiSourceModulePrefix)) {
        return null;
      }
      const relativePath = source.slice(uiSourceModulePrefix.length);
      const absolutePath = path.resolve(workspaceRoot, relativePath);
      if (!absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
        throw new Error(`Generated UI source escapes the workspace: ${source}`);
      }
      return absolutePath;
    },
  };
}

function referenceGameManifestContractPlugin(): Plugin {
  return {
    name: "dreamboard-reference-game-manifest-contract",
    enforce: "pre",
    resolveId(source, importer) {
      if (source !== manifestContractId || !importer) {
        return null;
      }

      const importerPath = importer.startsWith("/@fs/")
        ? importer.slice("/@fs/".length)
        : importer;
      const relativeImporter = path.relative(referenceGamesRoot, importerPath);
      if (
        relativeImporter.startsWith("..") ||
        path.isAbsolute(relativeImporter)
      ) {
        return null;
      }

      const [gameId] = relativeImporter.split(path.sep);
      if (!gameId) {
        return null;
      }

      return path.join(
        referenceGamesRoot,
        gameId,
        "shared/manifest-contract.ts",
      );
    },
  };
}

/**
 * SDK module aliases.
 *
 * By default — and always for `vite build` — the Workbench resolves
 * `@dreamboard-games/sdk` from the built `dist` output.
 *
 * In the dev inner loop you can opt into resolving SDK *source* instead so that
 * component edits hot-reload without a `pnpm --filter @dreamboard-games/sdk
 * build` first. Enable it with `DREAMBOARD_WORKBENCH_SDK=source` (see the
 * `pnpm ui workbench --source`). This only affects the dev server.
 */
function sdkAliases(useSource: boolean) {
  return Object.entries(sdkManifest.exports ?? {}).flatMap(
    ([subpath, target]) => {
      const importTarget =
        typeof target === "string" ? target : (target.import ?? target.default);
      if (!importTarget?.endsWith(".js")) return [];
      if (!importTarget.startsWith("./dist/")) {
        throw new Error(
          `SDK JavaScript export ${subpath} must resolve beneath ./dist/.`,
        );
      }

      const specifier =
        subpath === "."
          ? "@dreamboard-games/sdk"
          : `@dreamboard-games/sdk/${subpath.slice(2)}`;
      const distRelativePath = importTarget.slice("./dist/".length);
      const replacement = useSource
        ? path.join(sdkRoot, "src", distRelativePath.replace(/\.js$/, ".ts"))
        : path.join(sdkRoot, "dist", distRelativePath);
      if (useSource && !existsSync(replacement)) {
        throw new Error(
          `SDK export ${subpath} has no source-mode entry at ${replacement}.`,
        );
      }
      const escapedSpecifier = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return [{ find: new RegExp(`^${escapedSpecifier}$`), replacement }];
    },
  );
}

export default defineConfig(({ command }) => {
  const generatedRootValue = process.env.DREAMBOARD_WORKBENCH_GENERATED_ROOT;
  if (!generatedRootValue || !path.isAbsolute(generatedRootValue)) {
    throw new Error(
      "DREAMBOARD_WORKBENCH_GENERATED_ROOT must be an explicit absolute materialization root. Run the Workbench through the repository wrapper.",
    );
  }
  const generatedRoot = path.resolve(generatedRootValue);
  const fixtureSourceRoot = path.join(generatedRoot, "fixtures");
  for (const requiredPath of [
    path.join(generatedRoot, "catalog.ts"),
    path.join(fixtureSourceRoot, "reference-games/index.json"),
  ]) {
    if (!existsSync(requiredPath)) {
      throw new Error(
        `Workbench materialization is missing ${requiredPath}. Run it through pnpm ui workbench.`,
      );
    }
  }
  // Source mode is dev-only and opt-in. The `command === "serve"` guard means
  // every `vite build` stays on `dist`
  // regardless of the environment variable.
  const useSdkSource =
    command === "serve" && process.env.DREAMBOARD_WORKBENCH_SDK === "source";
  if (useSdkSource) {
    console.log("[ui-workbench] resolving @dreamboard-games/sdk from source");
  }

  return {
    plugins: [
      generatedScenarioPlugin(generatedRoot),
      referenceGameManifestContractPlugin(),
      tailwindcss(),
      fixtureAssetPlugin(fixtureSourceRoot),
    ],
    build: {
      target: "esnext",
    },
    oxc: {
      target: "esnext",
    },
    resolve: {
      alias: [
        {
          find: /^react$/,
          replacement: path.join(__dirname, "node_modules/react/index.js"),
        },
        {
          find: /^react\/jsx-runtime$/,
          replacement: path.join(
            __dirname,
            "node_modules/react/jsx-runtime.js",
          ),
        },
        {
          find: /^react-dom\/client$/,
          replacement: path.join(__dirname, "node_modules/react-dom/client.js"),
        },
        {
          find: /^zod$/,
          replacement: path.join(__dirname, "node_modules/zod/index.js"),
        },
        ...sdkAliases(useSdkSource),
        {
          find: /^@dreamboard-games\/plugin-runtime-contract$/,
          replacement: path.join(
            workspaceRoot,
            "packages/plugin-runtime-contract/dist/index.js",
          ),
        },
      ],
    },
    server: {
      fs: {
        allow: [workspaceRoot],
      },
    },
  };
});
