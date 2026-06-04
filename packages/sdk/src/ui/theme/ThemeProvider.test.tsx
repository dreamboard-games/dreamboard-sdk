import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { ThemeProvider } from "./ThemeProvider.js";

test("ThemeProvider publishes shadcn vars and body font on the themed subtree", () => {
  const html = renderToString(
    <ThemeProvider
      override={{
        typography: {
          fontFamily: {
            body: '"Test Body", system-ui, sans-serif',
            display: '"Test Display", serif',
          },
        },
        semantic: {
          intent: {
            primary: {
              solid: "#123456",
            },
          },
        },
      }}
    >
      <span>content</span>
    </ThemeProvider>,
  );

  expect(html).toContain(
    "--font-sans:&quot;Test Body&quot;, system-ui, sans-serif",
  );
  expect(html).toContain("--font-display:&quot;Test Display&quot;, serif");
  expect(html).toContain("--primary:#123456");
  expect(html).toContain(
    "font-family:&quot;Test Body&quot;, system-ui, sans-serif",
  );
});
