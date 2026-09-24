import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
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
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("Registry server did not bind");
const namespace = `http://127.0.0.1:${address.port}/{name}.json`;
const games = {
  hearts: [
    "playing-card",
    "players",
    "standings",
    "hand",
    "hand-drawer",
    "actions",
    "inspector",
    "scenario-controls",
    "browser-game",
  ],
  "hex-network-trading": [
    "board-targets",
    "interaction-form",
    "resources",
    "players",
    "dice",
    "event-log",
    "standings",
    "inspector",
    "scenario-controls",
    "browser-game",
  ],
};
const selectedGame = process.argv[2];
if (selectedGame && !(selectedGame in games))
  throw new Error(`Unknown game ${selectedGame}`);
try {
  for (const [name, items] of Object.entries(games)) {
    if (selectedGame && selectedGame !== name) continue;
    const cwd = path.resolve(root, "../examples/reference-games", name);
    const config = {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "new-york",
      rsc: false,
      tsx: true,
      tailwind: {
        config: "",
        css: "ui/style.css",
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
      registries: { "@dreamboard": namespace },
    };
    await writeFile(
      path.join(cwd, "components.json"),
      JSON.stringify(config, null, 2) + "\n",
    );
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "pnpm",
        [
          "exec",
          "shadcn",
          "add",
          ...items.map((item) => `@dreamboard/${item}`),
          "--yes",
          "--overwrite",
          "--cwd",
          cwd,
        ],
        { cwd: root, stdio: "inherit" },
      );
      child.once("error", reject);
      child.once("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`shadcn installation failed (${code})`)),
      );
    });
    config.registries["@dreamboard"] =
      "https://registry.dreamboard.games/r/{name}.json";
    await writeFile(
      path.join(cwd, "components.json"),
      JSON.stringify(config, null, 2) + "\n",
    );
    console.log(
      `Installed ${items.length} requested registry items into ${name}.`,
    );
  }
} finally {
  server.close();
}
