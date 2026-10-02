import { build } from "esbuild";
import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";

test("React adapter bundles maintained subscriptions without reducer execution or Node", async () => {
  const result = await build({
    entryPoints: [new URL("../react.ts", import.meta.url).pathname],
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    external: ["react", "react-dom", "react/jsx-runtime"],
    metafile: true,
  });
  const inputs = Object.keys(result.metafile.inputs);
  const locales = Object.values(result.metafile.outputs).flatMap((output) =>
    Object.entries(output.inputs)
      .filter(
        ([path, input]) =>
          path.includes("/locales/") && input.bytesInOutput > 0,
      )
      .map(([path]) => path.split("/").at(-1)),
  );
  expect(locales).toEqual(["en.js"]);
  expect(inputs.some((path) => path.includes("@tanstack/react-store"))).toBe(
    true,
  );
  expect(
    inputs.some(
      (path) =>
        path.includes("/reducer/") ||
        path.includes("/testing/") ||
        path.startsWith("node:"),
    ),
  ).toBe(false);
  const imports = Object.values(result.metafile.outputs).flatMap((output) =>
    output.imports.map((item) => item.path),
  );
  expect(
    imports.every((path) =>
      ["react", "react-dom", "react/jsx-runtime"].includes(path),
    ),
  ).toBe(true);
});

test("bundled SDK schemas preserve English validation errors", async () => {
  const result = await build({
    stdin: {
      contents: `
        import { PluginSessionDescriptorSchema } from "./shared/protocol/schema.ts";
        globalThis.message = PluginSessionDescriptorSchema
          .safeParse({ sessionId: 12, players: [] }).error.issues[0].message;
      `,
      resolveDir: new URL("..", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
  });
  const context = { Blob, message: "" };
  runInNewContext(result.outputFiles[0].text, context);
  expect(context.message).toBe(
    "Invalid input: expected string, received number",
  );
});
