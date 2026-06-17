import { expect, test } from "@playwright/test";
import {
  expectBasicAccessibilityInvariants,
  expectNoHorizontalOverflow,
} from "./driver/layout-accessibility-assertions.js";
import {
  assertValidSemanticSnapshot,
  installDeterministicWorkbenchEnvironment,
  readPageBrowserInteractionSnapshot,
  waitForWorkbenchStablePage,
} from "./driver/semantic-browser-driver.js";

test.beforeEach(async ({ page }) => {
  await installDeterministicWorkbenchEnvironment(page);
});

test("loads a stable scenario test route and replays the fixture", async ({
  page,
}) => {
  const scenarioId = process.env.UI_SCENARIO_ID ?? "hearts.pass-three.mobile";
  await page.goto(`/scenario/${scenarioId}?mode=test`);
  await waitForWorkbenchStablePage(page);
  const scenario = page.locator('[data-dreamboard-workbench="scenario"]');
  await expect(scenario).toHaveAttribute(
    "data-dreamboard-scenario-status",
    "ready",
  );
  await expect(scenario).toHaveAttribute(
    "data-dreamboard-scenario-id",
    scenarioId,
  );
  await expect(scenario.locator("[data-reference-game]")).toBeVisible();
  assertValidSemanticSnapshot(await readPageBrowserInteractionSnapshot(page));
  await expectNoHorizontalOverflow(page);
  await expectBasicAccessibilityInvariants(page);
});
