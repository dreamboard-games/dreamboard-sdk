import { createReadStream } from "node:fs";
import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const workspaceRoot = path.resolve(__dirname, "../..");
const sdkRoot = path.join(workspaceRoot, "packages/sdk");
const fixtureSourceRoot = path.join(workspaceRoot, "fixtures/ui");
const fixtureRequestPrefix = "/fixtures/";

function fixtureAssetPlugin(): Plugin {
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
      await mkdir(outputRoot, { recursive: true });
      await cp(fixtureSourceRoot, outputRoot, {
        recursive: true,
        force: true,
      });
    },
  };
}

/**
 * SDK module aliases.
 *
 * By default — and ALWAYS for `vite build`, which the Playwright proof path and
 * `ui:workbench:build` use — the Workbench resolves `@dreamboard-games/sdk` from
 * the built `dist` output, matching the exact artifact the parity proof and a
 * real host ship.
 *
 * In the dev inner loop you can opt into resolving SDK *source* instead so that
 * component edits hot-reload without a `pnpm --filter @dreamboard-games/sdk
 * build` first. Enable it with `DREAMBOARD_WORKBENCH_SDK=source` (see the
 * `ui:workbench:src` / `dev:src` scripts). This only ever affects the dev
 * server; it never changes what the proof path measures.
 */
function sdkAliases(useSource: boolean) {
  const target = (subpath: string) =>
    useSource
      ? path.join(sdkRoot, "src", `${subpath}.ts`)
      : path.join(sdkRoot, "dist", `${subpath}.js`);
  const aliases = [
    {
      find: /^@dreamboard-games\/sdk\/runtime\/primitives$/,
      replacement: target("runtime/primitives"),
    },
    {
      find: /^@dreamboard-games\/sdk\/runtime$/,
      replacement: target("runtime"),
    },
    {
      find: /^@dreamboard-games\/sdk\/ui$/,
      replacement: target("ui"),
    },
  ];
  // `testing` and `browser-interaction` resolve to `dist` via package exports in
  // the default path; only override them when serving from source so the whole
  // SDK surface hot-reloads as one consistent copy.
  if (useSource) {
    aliases.push(
      {
        find: /^@dreamboard-games\/sdk\/testing$/,
        replacement: target("testing"),
      },
      {
        find: /^@dreamboard-games\/sdk\/browser-interaction$/,
        replacement: target("browser-interaction"),
      },
    );
  }
  return aliases;
}

export default defineConfig(({ command }) => {
  // Source mode is dev-only and opt-in. The `command === "serve"` guard means
  // every `vite build` (Playwright proof, `ui:workbench:build`) stays on `dist`
  // regardless of the environment variable.
  const useSdkSource =
    command === "serve" && process.env.DREAMBOARD_WORKBENCH_SDK === "source";
  if (useSdkSource) {
    console.log(
      "[ui-workbench] resolving @dreamboard-games/sdk from source (dev inner loop — not the proof artifact)",
    );
  }

  return {
    plugins: [fixtureAssetPlugin()],
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
