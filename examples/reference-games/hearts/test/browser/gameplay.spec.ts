import { expect, test, type Locator } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";
import { completeGamePath } from "../scenario-paths";
import { gameDriver } from "../helpers/browser-game";

async function activate(locator: Locator, touch: boolean) {
  if (touch) await locator.tap();
  else {
    await locator.focus();
    await locator.press("Enter");
  }
}

test("a complete hand uses real selected-seat commands, sealed passes and legal card play", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?scenario=complete&at=opening&as=player-1");
  await expect(
    page.getByRole("heading", { name: "Hearts", exact: true }),
  ).toBeVisible();
  const driver = gameDriver(page);
  const card = driver.card;
  const seal = driver.submit("passing.submit");
  await expect(page.locator('button[data-action="select"]')).toHaveCount(13);
  await expect(seal).toBeDisabled();
  await expect(card("clubs-2")).toHaveCount(0);
  await page.screenshot({
    path: `/tmp/hearts-headless-${isMobile ? "mobile" : "desktop"}.png`,
    fullPage: true,
  });
  for (const [index, command] of completeGamePath.entries()) {
    await driver.selectSeat(`player-${command.actor.seat + 1}`);
    if (command.interactionId === "submit") {
      for (const id of command.params.cardIds)
        await activate(card(id), isMobile);
      await expect(seal).toBeEnabled();
      await activate(seal, isMobile);
      if (index < 3) {
        await expect(page.getByRole("status")).toContainText("sealed");
        await expect(
          page.locator('button[data-action="select"]:enabled'),
        ).toHaveCount(0);
      }
    } else {
      await expect(card(command.params.cardId)).toBeEnabled();
      if (index === 4)
        await expect(
          page.locator('button[data-action="select"]:enabled'),
        ).toHaveCount(1);
      await activate(card(command.params.cardId), isMobile);
      await expect(card(command.params.cardId)).toHaveCount(0);
    }
  }
  await expect(
    page.getByRole("table", { name: "Final standings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "player-4" }),
  ).toContainText("2 · win");
  await expect(page.getByText("13/13 tricks", { exact: true })).toBeVisible();
  await expect(page.locator('button[data-action="select"]')).toHaveCount(0);
  await injectAxe(page);
  await checkA11y(page, undefined, {
    axeOptions: {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    },
  });
});

test("private seat changes and named checkpoints remain responsive and accessible", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?scenario=complete&at=opening&as=player-1");
  await expect(page.locator('button[data-action="select"]')).toHaveCount(13);
  const before = await page
    .locator('button[data-action="select"]')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-value")),
    );
  expect(before).toHaveLength(13);
  await page.getByLabel("Selected seat").selectOption("player-2");
  await expect(page.locator('button[data-value="clubs-2"]')).toBeVisible();
  const after = await page
    .locator('button[data-action="select"]')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-value")),
    );
  expect(after.some((id) => before.includes(id))).toBe(false);
  await activate(page.locator('button[data-value="clubs-2"]'), isMobile);
  await expect(page.locator('button[data-value="clubs-2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await activate(page.locator('button[data-action="reset"]'), isMobile);
  await expect(page.locator('button[data-value="clubs-2"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await activate(
    page.getByRole("button", { name: "Save checkpoint", exact: true }),
    isMobile,
  );
  for (const id of completeGamePath[1].params.cardIds) {
    await activate(
      page.locator(`button[data-action="select"][data-value="${id}"]`),
      isMobile,
    );
  }
  await activate(
    page.locator(
      'button[data-action="submit"][data-interaction="passing.submit"]',
    ),
    isMobile,
  );
  await expect(page.getByRole("status")).toContainText("sealed");
  await activate(
    page.getByRole("button", { name: "Restore checkpoint", exact: true }),
    isMobile,
  );
  await expect(page.getByRole("status")).toContainText("Select three cards");
  await expect(
    page.locator('button[data-action="select"]:enabled'),
  ).toHaveCount(13);
  await injectAxe(page);
  await checkA11y(page, undefined, {
    axeOptions: {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    },
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/?scenario=complete&at=sealed-pass&as=player-1");
  await expect(page.getByRole("status")).toContainText("sealed");
  await expect(
    page.locator('button[data-action="select"]:enabled'),
  ).toHaveCount(0);
  await page.goto("/?scenario=complete&at=mid-hand&as=player-1");
  await expect(page.getByText("7/13 tricks", { exact: true })).toBeVisible();
});
