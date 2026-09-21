import { expect, test } from "@playwright/test";
import {
  BROWSER_INTERACTION_ATTRIBUTES,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
} from "@dreamboard-games/sdk/browser-interaction";
import {
  assertValidSemanticSnapshot,
  installDeterministicWorkbenchEnvironment,
  readPageBrowserInteractionSnapshot,
  waitForWorkbenchStablePage,
} from "./driver/semantic-browser-driver.js";

test.beforeEach(async ({ page }) => {
  await installDeterministicWorkbenchEnvironment(page);
});

test("hearts accepts keyboard card selection and submission", async ({
  page,
}) => {
  await page.goto("/scenario/hearts.dealt-hand.desktop?mode=test");
  await waitForWorkbenchStablePage(page);
  await expect(
    page.locator('[data-dreamboard-workbench="scenario"]'),
  ).toHaveAttribute("data-dreamboard-scenario-status", "ready");

  const attrs = BROWSER_INTERACTION_ATTRIBUTES;
  for (const actuatorId of [
    "primitive-card:cardIds:clubs-6",
    "primitive-card:cardIds:diamonds-10",
    "primitive-card:cardIds:hearts-10",
    "primitive-submit",
  ]) {
    const target = page.locator(
      [
        `[${attrs.protocol}="${DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION}"]`,
        `[${attrs.role}="actuator"]`,
        `[${attrs.actuatorId}="${actuatorId}"]`,
      ].join(""),
    );
    await target.focus();
    await expect(target).toBeFocused();
    await page.keyboard.press("Enter");
    await page.evaluate(() => window.__dreamboardUIFixture?.flush());
  }

  await expect
    .poll(async () => {
      await page.evaluate(() => window.__dreamboardUIFixture?.flush());
      const snapshot = await readPageBrowserInteractionSnapshot(page);
      assertValidSemanticSnapshot(snapshot);
      return page.evaluate(() => {
        const bridge = window.__dreamboardUIFixture;
        if (!bridge)
          throw new Error("UI fixture test bridge is not installed.");
        return {
          projectionMatches:
            bridge.getProjectionDigest() ===
            bridge.getExpected().finalProjectionDigest,
          acceptedSubmission: bridge
            .getHostEvents()
            .some(
              (event) =>
                event.kind === "submit-received" && event.result === "accepted",
            ),
        };
      });
    })
    .toEqual({
      projectionMatches: true,
      acceptedSubmission: true,
    });
});
