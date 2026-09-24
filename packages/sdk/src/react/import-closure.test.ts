import { build } from "esbuild";
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
  const inputs = Object.keys(result.metafile!.inputs);
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
  const imports = Object.values(result.metafile!.outputs).flatMap((output) =>
    output.imports.map((item) => item.path),
  );
  expect(
    imports.every((path) =>
      ["react", "react-dom", "react/jsx-runtime"].includes(path),
    ),
  ).toBe(true);
});
