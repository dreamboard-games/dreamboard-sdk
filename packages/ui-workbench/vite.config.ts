import { createReadStream } from "node:fs";
import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const workspaceRoot = path.resolve(__dirname, "../..");
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

export default defineConfig({
  plugins: [fixtureAssetPlugin()],
  resolve: {
    alias: [
      {
        find: /^react$/,
        replacement: path.join(__dirname, "node_modules/react/index.js"),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: path.join(__dirname, "node_modules/react/jsx-runtime.js"),
      },
      {
        find: /^react-dom\/client$/,
        replacement: path.join(__dirname, "node_modules/react-dom/client.js"),
      },
      {
        find: /^@dreamboard-games\/sdk\/runtime\/primitives$/,
        replacement: path.join(
          workspaceRoot,
          "packages/sdk/dist/runtime/primitives.js",
        ),
      },
      {
        find: /^@dreamboard-games\/sdk\/runtime$/,
        replacement: path.join(workspaceRoot, "packages/sdk/dist/runtime.js"),
      },
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
});
