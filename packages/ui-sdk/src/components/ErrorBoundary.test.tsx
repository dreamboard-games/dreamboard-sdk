import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { DefaultErrorFallback } from "./ErrorBoundary.js";
import { ThemeProvider } from "../theme/ThemeProvider.js";

test("ErrorBoundary fallback derives styling from --db-* theme variables", () => {
  const source = readFileSync(
    join(import.meta.dir, "ErrorBoundary.tsx"),
    "utf8",
  );

  // The fallback must read SDK theme tokens, not hardcoded palette literals.
  expect(source).toContain("cssVarOr");
  expect(source).toContain("data-dreamboard-error-fallback");

  // Hard-coded accent treatment must not be the new default.
  expect(source).not.toContain('boxShadow: "6px 6px 0 #111827"');
  expect(source).not.toContain('border: "2px solid #0f172a"');
  expect(source).not.toContain("bg-gradient-to-br");
});

test("DefaultErrorFallback emits the themed fallback markup", () => {
  const html = renderToStaticMarkup(
    <ThemeProvider>
      <DefaultErrorFallback error={new Error("boom")} onReset={() => {}} />
    </ThemeProvider>,
  );

  expect(html).toContain("data-dreamboard-error-fallback");
  expect(html).toContain("Game failed to start");
  expect(html).toContain('role="alert"');
  expect(html).toContain("var(--db-");
  expect(html).toContain("--db-semantic-surface-app");
});

test("DefaultErrorFallback works without a ThemeProvider ancestor", () => {
  const html = renderToStaticMarkup(
    <DefaultErrorFallback error={new Error("boom")} onReset={() => {}} />,
  );

  expect(html).toContain("data-dreamboard-error-fallback");
  expect(html).toContain("Game failed to start");
  // `cssVarOr` injects safe defaults so the fallback still reads correctly
  // when no ThemeProvider is mounted (a common case at startup).
  expect(html).toContain("var(--db-semantic-surface-app, #fdfbf7)");
});
