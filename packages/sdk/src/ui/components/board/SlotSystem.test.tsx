import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { ThemeProvider } from "../../theme/ThemeProvider.js";
import { DefaultSlotItem } from "./SlotSystem.js";

test("DefaultSlotItem uses readable theme colors on light surfaces", () => {
  const html = renderToString(
    <ThemeProvider theme="tabletop">
      <DefaultSlotItem
        name="Field"
        description="Grow crops"
        capacity={1}
        occupantCount={0}
        isHighlighted
      />
    </ThemeProvider>,
  );

  expect(html).toContain("color:#2f2a22");
  expect(html).toContain("color:#5f5547");
  expect(html).not.toContain("text-white");
});

test("DefaultSlotItem treats a full slot as occupied rather than dangerous", () => {
  const html = renderToString(
    <ThemeProvider theme="tabletop">
      <DefaultSlotItem name="Field" capacity={1} occupantCount={1} />
    </ThemeProvider>,
  );

  expect(html).toContain("background:#f4ecd8");
  expect(html).toContain("border-color:#5f5547");
  expect(html).not.toContain("background:#f9c7c7");
});
