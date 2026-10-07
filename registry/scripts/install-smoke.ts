import { build, preview } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { chromium, expect } from "@playwright/test";
import { z } from "zod";
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
    const pkg = z
      .object({ version: z.string() })
      .parse(
        JSON.parse(await readFile(path.join(sdk, "package.json"), "utf8")),
      );
    await run(["pack", "--pack-destination", project], sdk);
    sdkArchive = path.join(project, `dreamboard-games-sdk-${pkg.version}.tgz`);
    await writeFile(
      path.join(project, "src/game.ts"),
      `import type { Card, SeatCardId, IdOf, InteractionKey as SDKInteractionKey, GameSnapshot, boardFeature, handFeature, panZoomFeature, dragFeature, originsFeature, shortcutsFeature, ShortcutTarget as SDKShortcutTarget, ShortcutZoneTarget as SDKShortcutZoneTarget } from "@dreamboard-games/sdk";
      type Features = { board: ReturnType<typeof boardFeature<unknown>>; hand: ReturnType<typeof handFeature<unknown>>; drag: ReturnType<typeof dragFeature<unknown>>; origins: ReturnType<typeof originsFeature<unknown>>; panZoom: ReturnType<typeof panZoomFeature<unknown>>; shortcuts: ReturnType<typeof shortcutsFeature<unknown>> };
      export type GameModel = GameSnapshot<unknown, Features>;
      export type GameCard = Card<unknown, Features>;
      export type CardId = SeatCardId<unknown>;
      export type ZoneId = IdOf<unknown, "zoneId">;
      export type InteractionKey = SDKInteractionKey<unknown>;
      export type ShortcutTarget = SDKShortcutTarget<unknown>;
      export type ShortcutZoneTarget = SDKShortcutZoneTarget<unknown>;
      export type CardDrag = import("@dreamboard-games/sdk/react").CardGestureOptions<unknown>["drag"];
      type Model = GameModel;
      export declare function useGame<Value>(select: (game: Model) => Value, options?: { readonly compare?: (previous: Value, next: Value) => boolean }): Value;
      import { createGameHook } from "@dreamboard-games/sdk/react";
      type Hooks = ReturnType<ReturnType<typeof createGameHook<unknown>>>;
      export declare const SDKGameProvider: Hooks["GameProvider"];
      export { GameProvider } from "./components/dreamboard/game-provider";
      export declare const useCardGesture: Hooks["useCardGesture"];
      export declare const useActiveCard: Hooks["useActiveCard"];
      export declare const useGameShortcuts: Hooks["useGameShortcuts"];
      export declare const useShortcutTarget: Hooks["useShortcutTarget"];
      export declare const useShortcutHints: Hooks["useShortcutHints"];
      export declare const useDropArea: Hooks["useDropArea"];
      export declare const useDragOverlay: Hooks["useDragOverlay"];`,
    );
  }
  await writeFile(
    path.join(project, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      packageManager: "pnpm@10.4.1",
      dependencies: {
        react: "19.3.0",
        "react-dom": "19.3.0",
        ...(bound
          ? {
              "@dreamboard-games/sdk": `file:${sdkArchive}`,
              "@tanstack/react-store": "0.11.1",
            }
          : {}),
      },
      devDependencies: {
        ...(bound ? { "@playwright/test": "1.63.0" } : {}),
        tailwindcss: "4.3.3",
        typescript: "6.0.3",
        "@types/react": "19.3.0",
        "@types/react-dom": "19.3.0",
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
        paths: { "@/*": ["./src/*"], "@game": ["./src/game.ts"] },
      },
      include: ["src"],
    }),
  );
  await writeFile(
    path.join(project, "src/styles.d.ts"),
    'declare module "*.css";\n',
  );
  await writeFile(
    path.join(project, "src/style.css"),
    "@import 'tailwindcss';\n",
  );
  await writeFile(
    path.join(project, "components.json"),
    JSON.stringify({
      $schema: "https://ui.shadcn.com/schema.json",
      style: "base-nova",
      iconLibrary: "lucide",
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
  await writeFile(
    path.join(project, "index.html"),
    '<div id="root"></div><script type="module" src="/src/main.tsx"></script>',
  );
  await writeFile(
    path.join(project, "src/main.tsx"),
    `
    import { createRoot } from "react-dom/client";
    import { PlayingCard } from "./components/dreamboard/playing-card";
    ${bound ? 'import { ScenarioControls } from "./components/dreamboard/scenario-controls";' : ""}
    import "./style.css";
    createRoot(document.getElementById("root")!).render(<main>
      <div data-testid="theme-proof" className="flex h-11 w-[173px] bg-primary text-primary-foreground">Tailwind</div>
      <PlayingCard rank="A" suit="hearts" />
      ${bound ? '<ScenarioControls scenarios={["opening"]} players={[{ playerId: "one" }]} me="one" onSeatChange={() => {}} onCheckpoint={() => ({ turn: 1 })} onRestore={() => {}} />' : ""}
    </main>);
  `,
  );
  await run(["exec", "tsc", "--noEmit"], project);
  await build({
    root: project,
    configFile: false,
    plugins: [tailwindcss()],
    resolve: { alias: { "@": path.join(project, "src") } },
    build: { outDir: "dist" },
  });
  const host = await preview({
    root: project,
    configFile: false,
    preview: { host: "127.0.0.1", port: 0 },
  });
  const browser = await chromium.launch(
    process.env.CI ? {} : { channel: "chrome" },
  );
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(host.resolvedUrls!.local[0]);
    const proof = page.getByTestId("theme-proof");
    await expect(proof).toHaveCSS("display", "flex");
    await expect(proof).toHaveCSS("height", "44px");
    await expect(proof).toHaveCSS("width", "173px");
    await expect(proof).toHaveCSS("background-color", "rgb(35, 87, 106)");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expect(proof).toHaveCSS("background-color", "rgb(171, 213, 225)");
    await page.evaluate(() =>
      document.documentElement.classList.remove("dark"),
    );
    if (bound) {
      await expect(
        page.getByRole("button", { name: "Save checkpoint" }),
      ).toHaveCSS("min-height", "44px");
      await expect(
        page.getByRole("button", { name: "Restore checkpoint" }),
      ).toBeDisabled();
      await page.getByRole("button", { name: "Save checkpoint" }).click();
      await expect(
        page.getByRole("button", { name: "Restore checkpoint" }),
      ).toBeEnabled();
      await expect(
        page.getByRole("combobox", { name: "Selected seat" }),
      ).toHaveValue("one");
    }
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      host.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
  }
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
      ? "Installed and typechecked all registry items; rendered a consumer against the packed SDK."
      : "Installed, typechecked and rendered pure registry source in an SDK-free consumer.",
  );
} finally {
  server.close();
  await rm(project, { recursive: true, force: true });
}
