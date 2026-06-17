import { expect, test } from "@playwright/test";

test("loads a stable scenario test route and replays the fixture", async ({
  page,
}) => {
  const scenarioId = process.env.UI_SCENARIO_ID ?? "hearts.pass-three.mobile";
  await page.goto(`/scenario/${scenarioId}?mode=test`);
  const scenario = page.locator('[data-dreamboard-workbench="scenario"]');
  await expect(scenario).toHaveAttribute(
    "data-dreamboard-scenario-status",
    "ready",
  );
  await expect(scenario).toHaveAttribute("data-dreamboard-scenario-id", scenarioId);
  await expect(scenario.locator("[data-reference-game]")).toBeVisible();
});
