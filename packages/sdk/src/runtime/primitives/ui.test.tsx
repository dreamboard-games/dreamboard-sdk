import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { UIRoot } from "./ui.js";

test("UIRoot mounts the SDK ThemeProvider when a preset is supplied", () => {
  const html = renderToString(
    createElement(
      UIRoot,
      { theme: "tabletop" },
      createElement("section", { "data-marker": "child" }),
    ),
  );
  // ThemeProvider serialises the resolved theme into CSS variables on a
  // wrapper element. Reading any one of those vars proves it mounted.
  expect(html).toContain("--db-color-");
  expect(html).toContain('data-marker="child"');
});

test("UIRoot is transparent when no theme is supplied", () => {
  const html = renderToString(
    createElement(
      UIRoot,
      null,
      createElement("section", { "data-marker": "passthrough" }),
    ),
  );
  // No wrapper means no CSS variable serialisation. The child still renders.
  expect(html).not.toContain("--db-color-");
  expect(html).toContain('data-marker="passthrough"');
});
