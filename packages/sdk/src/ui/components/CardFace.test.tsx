import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { ThemeProvider } from "../theme/ThemeProvider.js";
import { CardFace } from "./Card.js";

const card = {
  id: "card-1",
  cardType: "minion",
  name: "Bishop",
  properties: { title: "Bishop", subtitle: "Holy" },
};

test("CardFace renders default content from reserved properties", () => {
  const html = renderToString(
    <ThemeProvider>
      <CardFace card={card} />
    </ThemeProvider>,
  );
  expect(html).toContain("data-dreamboard-card-face");
  expect(html).toContain("Bishop");
  expect(html).toContain("Holy");
});

test("CardFace exposes data-* attributes for each visual state flag", () => {
  const html = renderToString(
    <ThemeProvider>
      <CardFace
        card={card}
        eligible
        selected
        invalid
        previewing
        intentProgress={0.42}
      />
    </ThemeProvider>,
  );
  expect(html).toContain('data-eligible="true"');
  expect(html).toContain('data-selected="true"');
  expect(html).toContain('data-invalid="true"');
  expect(html).toContain('data-previewing="true"');
  expect(html).toContain('data-intent-progress="0.42"');
});

test("CardFace omits data attributes for false/undefined flags", () => {
  const html = renderToString(
    <ThemeProvider>
      <CardFace card={card} disabled={false} />
    </ThemeProvider>,
  );
  expect(html).not.toContain("data-disabled=");
  expect(html).not.toContain("data-eligible=");
  expect(html).not.toContain("data-selected=");
});

test("CardFace preserves text contrast for disabled and submitted states", () => {
  const html = renderToString(
    <ThemeProvider>
      <CardFace card={card} disabled submitted />
    </ThemeProvider>,
  );
  expect(html).not.toContain("opacity:");
});

test("CardFace renders submitted state with success accent", () => {
  const html = renderToString(
    <ThemeProvider>
      <CardFace card={card} submitted />
    </ThemeProvider>,
  );
  expect(html).toContain('data-submitted="true"');
});

test("CardFace renders face-down without leaking content", () => {
  const html = renderToString(
    <ThemeProvider>
      <CardFace card={card} faceDown />
    </ThemeProvider>,
  );
  expect(html).toContain("data-dreamboard-card-face");
  expect(html).toContain('data-face-down="true"');
  expect(html).not.toContain("Bishop");
});

test("face-down CardFace uses the calm baseline by default", () => {
  // A row of opponent hands, draw piles or hidden-card rows must read
  // as ordered chrome — not repeated decorative emphasis. The face-down
  // back without an emphasis state should not switch on the accent
  // marker.
  const html = renderToString(
    <ThemeProvider>
      <CardFace card={card} faceDown />
    </ThemeProvider>,
  );
  expect(html).toContain('data-face-down="true"');
  expect(html).not.toContain('data-accented="true"');
});

test("face-down CardFace upgrades to the accent shell on emphasis states", () => {
  const html = renderToString(
    <ThemeProvider>
      <CardFace card={card} faceDown selected />
    </ThemeProvider>,
  );
  expect(html).toContain('data-face-down="true"');
  expect(html).toContain('data-accented="true"');
  expect(html).toContain('data-selected="true"');
});
