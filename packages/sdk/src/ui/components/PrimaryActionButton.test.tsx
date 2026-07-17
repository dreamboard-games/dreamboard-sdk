import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { ThemeProvider } from "../theme/ThemeProvider.js";
import { PrimaryActionButton } from "./PrimaryActionButton.js";

test("PrimaryActionButton renders controlled label and action id", () => {
  const html = renderToString(
    <ThemeProvider>
      <PrimaryActionButton label="Roll Dice" actionId="rollDice" />
    </ThemeProvider>,
  );

  expect(html).toContain("data-dreamboard-primary-action");
  expect(html).toContain('data-available="true"');
  expect(html).toContain('data-interaction-id="rollDice"');
  expect(html).toContain("Roll Dice");
});

test("PrimaryActionButton disables and surfaces unavailableReason", () => {
  const html = renderToString(
    <ThemeProvider>
      <PrimaryActionButton
        label="Roll Dice"
        actionId="rollDice"
        available={false}
        unavailableReason="Wait for your turn"
      />
    </ThemeProvider>,
  );

  expect(html).toContain('data-available="false"');
  expect(html).toContain("disabled=");
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain("Wait for your turn");
});

test("PrimaryActionButton supports a label override", () => {
  const html = renderToString(
    <ThemeProvider>
      <PrimaryActionButton label="Confirm" actionId="rollDice" />
    </ThemeProvider>,
  );

  expect(html).toContain("Confirm");
  expect(html).not.toContain("Roll Dice");
});

test("PrimaryActionButton suppresses the halo when attention='off'", () => {
  const htmlWithHalo = renderToString(
    <ThemeProvider>
      <PrimaryActionButton
        label="Roll Dice"
        actionId="rollDice"
        attention="always"
      />
    </ThemeProvider>,
  );
  const htmlWithoutHalo = renderToString(
    <ThemeProvider>
      <PrimaryActionButton
        label="Roll Dice"
        actionId="rollDice"
        attention="off"
      />
    </ThemeProvider>,
  );

  expect(htmlWithHalo).toContain("box-shadow");
  expect(htmlWithoutHalo).toContain('data-interaction-id="rollDice"');
  expect(htmlWithHalo.split("position:absolute").length).toBeGreaterThan(
    htmlWithoutHalo.split("position:absolute").length,
  );
});

test("PrimaryActionButton skips the halo entirely when reduced motion is requested", () => {
  const html = renderToString(
    <ThemeProvider reducedMotion="force">
      <PrimaryActionButton
        label="Roll Dice"
        actionId="rollDice"
        attention="always"
      />
    </ThemeProvider>,
  );

  expect(html).toContain('data-interaction-id="rollDice"');
  expect(html.split("position:absolute").length).toBe(1);
});
