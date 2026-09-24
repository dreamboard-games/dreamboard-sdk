import { test, expect, type Locator } from "@playwright/test";
import { gameDriver } from "../helpers/browser-game";
import { injectAxe, checkA11y } from "axe-playwright";

async function choose(target: Locator, touch: boolean) {
  if (touch) await target.tap();
  else await target.click();
}

test("opening camp and trail use real board commands with keyboard and touch", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?scenario=setup&at=opening&as=player-1");
  const camp = page
    .locator('svg [data-input="intersectionId"][data-disabled="false"]')
    .first();
  await expect(camp).toBeVisible();
  if (isMobile) await camp.tap();
  else {
    await camp.focus();
    await page.keyboard.press("Enter");
  }
  await expect(
    page.locator('[data-reference-phase="setupTrail"]'),
  ).toBeVisible();
  await expect(page.locator('[data-camp-owner="player-1"]')).toHaveCount(1);
  await choose(
    page.locator('svg [data-input="edgeId"][data-disabled="false"]').first(),
    isMobile,
  );
  await expect(page.locator('[data-trail-owner="player-1"]')).toHaveCount(1);
  await expect(
    page.locator('[data-reference-phase="setupCamp"]'),
  ).toBeVisible();
  await expect(page.locator('svg [data-disabled="false"]')).toHaveCount(0);
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: true });
});

test("Depot selects receive before give and commits one atomic exchange", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?scenario=depot&at=depot-ready&as=player-2");
  const supplies = page.getByRole("definition");
  const before = await supplies.allTextContents();
  const key = '[data-interaction="main.tradeWithSupplyDepot"]';
  await choose(
    page.locator(`${key}[data-input="receiveResource"][data-value="brick"]`),
    isMobile,
  );
  await choose(
    page.locator(`${key}[data-input="giveResource"][data-value="timber"]`),
    isMobile,
  );
  await expect(supplies).toHaveText(before);
  await choose(page.locator(`${key}[data-action="submit"]`), isMobile);
  await expect(
    page
      .locator("main")
      .getByText("player-2 exchanged 3 timber for 1 brick.", { exact: false }),
  ).toBeVisible();
  await expect(supplies.nth(0)).toHaveText(String(Number(before[0]) - 3));
  await expect(supplies.nth(1)).toHaveText(String(Number(before[1]) + 1));
  await expect(page.locator('[data-reference-phase="main"]')).toBeVisible();
});

test("Bandits saved step cancels and completes explicit no-victim choice", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?scenario=bandits&at=ready-to-move&as=player-1");
  await choose(page.locator('svg [data-value="northForest"]'), isMobile);
  const key = '[data-interaction="moveBandits.moveBandits"]';
  await expect(page.getByLabel("Saved choices")).toBeVisible();
  await expect(
    page.locator(
      '[data-stormtrail-hex="centralBarrens"] [aria-label="Bandits"]',
    ),
  ).toBeVisible();
  await choose(page.locator(`${key}[data-action="cancel"]`), isMobile);
  await expect(page.getByText("Step 1", { exact: true })).toBeVisible();
  await choose(page.locator('svg [data-value="southWestClay"]'), isMobile);
  await choose(
    page.locator(`${key}[data-input="targetPlayerId"][data-value="null"]`),
    isMobile,
  );
  await choose(page.locator(`${key}[data-action="submit"]`), isMobile);
  await expect(page.locator('[data-reference-phase="main"]')).toBeVisible();
  await expect(
    page.locator(
      '[data-stormtrail-hex="southWestClay"] [aria-label="Bandits"]',
    ),
  ).toBeVisible();
});

test("saved Bandits prefix restores and seat switches preserve privacy", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?scenario=bandits&at=ready-to-move&as=player-1");
  await choose(page.locator('svg [data-value="northForest"]'), isMobile);
  await expect(page.getByLabel("Saved choices")).toContainText("northForest");
  await choose(
    page.getByRole("button", { name: "Save checkpoint", exact: true }),
    isMobile,
  );
  await gameDriver(page).selectSeat("player-3");
  await expect(
    page.locator(
      '[data-action="submit"][data-interaction="moveBandits.moveBandits"]',
    ),
  ).toHaveCount(0);
  await expect(page.getByLabel("Saved choices")).toHaveCount(0);
  await gameDriver(page).selectSeat("player-1");
  await choose(
    page.locator(
      '[data-action="cancel"][data-interaction="moveBandits.moveBandits"]',
    ),
    isMobile,
  );
  await choose(
    page.getByRole("button", { name: "Restore checkpoint", exact: true }),
    isMobile,
  );
  await expect(page.getByLabel("Saved choices")).toContainText("northForest");
  await choose(
    page.locator('[data-input="targetPlayerId"][data-value="player-2"]'),
    isMobile,
  );
  await choose(
    page.locator(
      '[data-action="submit"][data-interaction="moveBandits.moveBandits"]',
    ),
    isMobile,
  );
  await expect(page.locator('[data-reference-phase="main"]')).toBeVisible();
});

test("private discard and trade response execute from the selected seat", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?scenario=discard&at=ready-to-discard&as=player-2");
  await gameDriver(page)
    .resource("discardBarrier.discardSupplies", "resources", "brick")
    .fill("1");
  await gameDriver(page)
    .resource("discardBarrier.discardSupplies", "resources", "provisions")
    .fill("3");
  await choose(
    page.locator(
      '[data-action="submit"][data-interaction="discardBarrier.discardSupplies"]',
    ),
    isMobile,
  );
  await expect(
    page.locator(
      '[data-action="submit"][data-interaction="discardBarrier.discardSupplies"]',
    ),
  ).toHaveCount(0);
  await gameDriver(page).selectSeat("player-1");
  await gameDriver(page)
    .resource("discardBarrier.discardSupplies", "resources", "brick")
    .fill("4");
  await choose(
    page.locator(
      '[data-action="submit"][data-interaction="discardBarrier.discardSupplies"]',
    ),
    isMobile,
  );
  await expect(
    page.locator('[data-reference-phase="moveBandits"]'),
  ).toBeVisible();
  await page.goto("/?scenario=trade&at=pending-trade&as=player-1");
  await choose(
    page.locator(
      '[data-action="submit"][data-interaction="pendingTrade.acceptTrade"]',
    ),
    isMobile,
  );
  await expect(page.locator('[data-reference-phase="main"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pending offer", exact: true }),
  ).toHaveCount(0);
});

for (const scenario of [
  { name: "production", at: "produced", seat: "player-1", phase: "main" },
  { name: "complete", at: "growing-network", seat: "player-2", phase: "main" },
  { name: "complete", at: "game-over", seat: "player-2", phase: "gameOver" },
])
  test(`live ${scenario.at} checkpoint renders canonical board and selected-seat view`, async ({
    page,
  }, testInfo) => {
    await page.goto(
      `/?scenario=${scenario.name}&at=${scenario.at}&as=${scenario.seat}`,
    );
    await expect(
      page.locator(`[data-reference-phase="${scenario.phase}"]`),
    ).toBeVisible();
    await expect(page.locator("[data-stormtrail-hex]")).toHaveCount(7);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/hex-ui-${scenario.at}-${testInfo.project.name}.png`,
      fullPage: true,
    });
    if (scenario.phase === "gameOver")
      await expect(
        page.getByRole("table", { name: "Expedition outcome" }),
      ).toBeVisible();
    await injectAxe(page);
    await checkA11y(page, undefined, { detailedReport: true });
  });

test("rejected same-resource Depot trade reports an error and preserves its draft", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?scenario=depot&at=depot-ready&as=player-2");
  const key = '[data-interaction="main.tradeWithSupplyDepot"]';
  await choose(
    page.locator(`${key}[data-input="giveResource"][data-value="timber"]`),
    isMobile,
  );
  await choose(
    page.locator(`${key}[data-input="receiveResource"][data-value="timber"]`),
    isMobile,
  );
  const before = await page.getByRole("definition").allTextContents();
  await choose(page.locator(`${key}[data-action="submit"]`), isMobile);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).not.toHaveText("Dismiss error");
  await expect(
    page.locator(`${key}[data-input="giveResource"][data-value="timber"]`),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(`${key}[data-input="receiveResource"][data-value="timber"]`),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("definition")).toHaveText(before);
  await choose(
    gameDriver(page).choice(
      "main.tradeWithSupplyDepot",
      "receiveResource",
      "brick",
    ),
    isMobile,
  );
  await choose(gameDriver(page).submit("main.tradeWithSupplyDepot"), isMobile);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
