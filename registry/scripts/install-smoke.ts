import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const bound = process.argv.includes("--bound");
const project = await mkdtemp(path.join(tmpdir(), "dreamboard-registry-"));
function run(args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`pnpm ${args.join(" ")} failed (${code})`)),
    );
  });
}
const server = createServer(async (request, response) => {
  const name = /^\/([a-z-]+)\.json$/.exec(request.url ?? "")?.[1];
  if (!name) {
    response.writeHead(404).end();
    return;
  }
  try {
    response.setHeader("content-type", "application/json");
    response.end(await readFile(path.join(root, "build/r", `${name}.json`)));
  } catch {
    response.writeHead(404).end();
  }
});
try {
  await run(["build"], root);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing registry address");
  const url = `http://127.0.0.1:${address.port}`;
  await mkdir(path.join(project, "src"));
  let sdkArchive = "";
  if (bound) {
    const sdk = path.resolve(root, "../packages/sdk");
    const pkg = JSON.parse(
      await readFile(path.join(sdk, "package.json"), "utf8"),
    );
    await run(["pack", "--pack-destination", project], sdk);
    sdkArchive = path.join(project, `dreamboard-games-sdk-${pkg.version}.tgz`);
    await writeFile(
      path.join(project, "src/game.ts"),
      `import type { GameSnapshot, boardFeature, handFeature, panZoomFeature } from "@dreamboard-games/sdk";
      type Model = GameSnapshot<unknown, { board: ReturnType<typeof boardFeature<unknown>>; hand: ReturnType<typeof handFeature<unknown>>; panZoom: ReturnType<typeof panZoomFeature<unknown>> }>;
      export declare function useGame<Value>(select: (game: Model) => Value): Value;`,
    );
  }
  await writeFile(
    path.join(project, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      packageManager: "pnpm@10.4.1",
      dependencies: {
        react: "19.2.7",
        "react-dom": "19.2.7",
        ...(bound
          ? {
              "@dreamboard-games/sdk": `file:${sdkArchive}`,
              "@tanstack/react-store": "0.11.1",
            }
          : {}),
      },
      devDependencies: {
        ...(bound ? { "@playwright/test": "1.60.0" } : {}),
        typescript: "5.9.3",
        "@types/react": "19.2.14",
        "@types/react-dom": "19.2.3",
      },
    }),
  );
  await writeFile(
    path.join(project, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        baseUrl: ".",
        paths: { "@/*": ["./src/*"], "@game": ["./src/game.ts"] },
      },
      include: ["src"],
    }),
  );
  await writeFile(
    path.join(project, "src/style.css"),
    "@import 'tailwindcss';\n",
  );
  await writeFile(
    path.join(project, "components.json"),
    JSON.stringify({
      $schema: "https://ui.shadcn.com/schema.json",
      style: "new-york",
      rsc: false,
      tsx: true,
      tailwind: {
        config: "",
        css: "src/style.css",
        baseColor: "slate",
        cssVariables: true,
      },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
        lib: "@/lib",
        hooks: "@/hooks",
      },
      registries: { "@dreamboard": `${url}/{name}.json` },
    }),
  );
  await run(["install", "--ignore-scripts"], project);
  await run(
    [
      "exec",
      "shadcn",
      "add",
      "@dreamboard/playing-card",
      "--yes",
      "--cwd",
      project,
    ],
    root,
  );
  // Installing only the composed item must pull its card and token dependencies.
  await readFile(path.join(project, "src/components/dreamboard/card.tsx"));
  await readFile(path.join(project, "src/components/dreamboard/tokens.css"));
  const manifest = JSON.parse(
    await readFile(path.join(root, "registry.json"), "utf8"),
  ) as {
    items: {
      name: string;
      meta?: { binding?: string };
      files: { target: string }[];
    }[];
  };
  await run(
    [
      "exec",
      "shadcn",
      "add",
      ...manifest.items
        .filter((item) => bound || !item.meta?.binding)
        .map((item) => `@dreamboard/${item.name}`),
      "--yes",
      "--cwd",
      project,
    ],
    root,
  );
  await run(["exec", "tsc", "--noEmit"], project);
  for (const item of manifest.items.filter(
    (item) => bound || !item.meta?.binding,
  )) {
    for (const file of item.files) {
      await readFile(
        path.join(
          project,
          file.target.startsWith("@components/")
            ? file.target.replace("@components/", "src/components/")
            : path.join("src", file.target),
        ),
      );
    }
  }
  console.log(
    bound
      ? "Installed and typechecked all registry items against the packed SDK."
      : "Installed and typechecked all pure registry items in an SDK-free consumer.",
  );
} finally {
  server.close();
  await rm(project, { recursive: true, force: true });
}
