import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { ThemeProvider } from "../theme/ThemeProvider.js";
import { CardFace } from "./Card.js";
import { HandView } from "./HandView.js";
import type { ViewCard } from "../index.js";
import type { InteractionVisualState } from "../types/visual-state.js";

const cards: ViewCard[] = [
  { id: "c1", cardType: "spell", name: "Spark", properties: {} },
  { id: "c2", cardType: "spell", name: "Lift", properties: {} },
  { id: "c3", cardType: "spell", name: "Mend", properties: {} },
];

test("HandView renders an empty placeholder when there are no cards", () => {
  const html = renderToString(
    <ThemeProvider>
      <HandView
        cards={[]}
        renderCard={(card) => <CardFace card={card} />}
        renderEmpty={() => <span>No cards</span>}
      />
    </ThemeProvider>,
  );
  expect(html).toContain('data-empty="true"');
  expect(html).toContain("No cards");
});

test("HandView forwards stateForCard into the card renderer", () => {
  const states: Record<string, InteractionVisualState> = {
    c1: { eligible: true },
    c2: { selected: true },
    c3: { disabled: true },
  };
  const html = renderToString(
    <ThemeProvider>
      <HandView
        cards={cards}
        stateForCard={(card) => states[card.id]}
        renderCard={(card, state) => (
          <CardFace
            card={card}
            eligible={state.eligible}
            selected={state.selected}
            disabled={state.disabled}
          />
        )}
      />
    </ThemeProvider>,
  );
  expect(html).toContain('data-eligible="true"');
  expect(html).toContain('data-selected="true"');
  expect(html).toContain('data-disabled="true"');
});

test("HandView accepts both single layout kind and policy object", () => {
  const html = renderToString(
    <ThemeProvider>
      <HandView
        cards={cards}
        layout={{ desktop: "fan", mobile: "tray" }}
        renderCard={(card) => <CardFace card={card} />}
      />
    </ThemeProvider>,
  );
  expect(html).toContain('data-layout="fan"');
});

test("HandView reports the resolved layout mode in data-mode", () => {
  const html = renderToString(
    <ThemeProvider>
      <HandView
        cards={cards}
        layout="fan"
        renderCard={(card) => <CardFace card={card} />}
      />
    </ThemeProvider>,
  );
  // Server render starts with no measurement → falls back to the desktop intent.
  expect(html).toContain('data-mode="fan"');
});

test("HandView reports reduced-motion when the theme requests it", () => {
  const html = renderToString(
    <ThemeProvider reducedMotion="force">
      <HandView
        cards={cards}
        layout="fan"
        renderCard={(card) => <CardFace card={card} />}
      />
    </ThemeProvider>,
  );
  expect(html).toContain('data-reduced-motion="true"');
});

test("HandView tray mode renders safe-area padding", () => {
  const html = renderToString(
    <ThemeProvider>
      <HandView
        cards={cards}
        layout="tray"
        renderCard={(card) => <CardFace card={card} />}
      />
    </ThemeProvider>,
  );
  expect(html).toContain('data-mode="tray"');
  expect(html).toContain('role="row" tabindex="0"');
  expect(html).toContain("env(safe-area-inset-bottom");
});
