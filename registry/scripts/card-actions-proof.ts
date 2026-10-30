import { expect, type Page } from "@playwright/test";

/** Menus resolve the eligible input and respect caller-owned selection and concealment. */
export async function proveCardActionComposition(page: Page) {
  const first = page.getByTestId("control-first-0").getByRole("button");
  const second = page.getByTestId("control-second-0").getByRole("button");
  await second.click();
  await page.getByRole("button", { name: "Pair cards", exact: true }).click();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await first.click();
  const pair = page.getByRole("button", { name: "Pair cards", exact: true });
  const inspect = page.getByRole("button", {
    name: "Inspect card",
    exact: true,
  });
  const pairBox = (await pair.boundingBox())!;
  const inspectBox = (await inspect.boundingBox())!;
  expect(pairBox.width).toBeCloseTo(inspectBox.width, 0);
  expect(pairBox.height).toBeCloseTo(inspectBox.height, 0);
  await pair.click();
  await expect(page.getByTestId("action-results")).toContainText('"pairs":1');

  await second.click();
  await expect(
    page.getByRole("button", { name: "Pair cards", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("x");
  await expect(page.getByTestId("action-results")).toContainText('"pairs":2');

  const custom = page.getByTestId("custom-control").getByRole("button");
  await custom.click();
  await page.getByRole("button", { name: "Pair cards", exact: true }).click();
  await expect(page.getByTestId("custom-choices")).toHaveText("1");
  await custom.click();
  await expect(
    page.getByRole("button", { name: "Pair cards", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("p");
  await expect(page.getByTestId("custom-choices")).toHaveText("2");
  await expect(page.getByTestId("action-results")).toContainText('"pairs":2');
  await custom.click({ modifiers: ["Shift"] });
  await expect(custom).toHaveAttribute("aria-pressed", "true");
  await custom.click();
  await expect(custom).toHaveAttribute("aria-pressed", "false");

  await page.getByTestId("control-hidden-0").getByRole("button").click();
  await expect(
    page.getByRole("button", { name: "Inspect card", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByTestId("control-hidden-1").getByRole("button").click();
  await page.getByRole("button", { name: "Inspect card", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Card inspection" }),
  ).toBeVisible();
  await expect(page.getByText("Secret front must stay concealed")).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");

  const deck = page.getByRole("button", {
    name: "Draw pile actions",
    exact: true,
  });
  const box = (await deck.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2, {
    steps: 4,
  });
  await expect(page.locator("[data-draw-overlay]")).toHaveCount(0);
  await page.mouse.up();
  // A failed drag can leave the ordinary click menu open.
  if (
    !(await page
      .getByRole("button", { name: "Resolve empty draw", exact: true })
      .isVisible())
  )
    await deck.click();
  await page
    .getByRole("button", { name: "Resolve empty draw", exact: true })
    .click();
  await expect(page.getByTestId("action-results")).toContainText('"draws":1');
  await expect(page.locator("[data-draw-overlay]")).toHaveCount(0);
}
