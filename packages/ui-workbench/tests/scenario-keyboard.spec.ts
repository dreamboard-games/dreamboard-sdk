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

test("roll-and-write scorecard accepts keyboard activation for square board targets", async ({
  page,
}) => {
  await page.goto(
    "/scenario/roll-and-write-scorecard.mark-cell.mobile?mode=test",
  );
  await waitForWorkbenchStablePage(page);
  await expect(
    page.locator('[data-dreamboard-workbench="scenario"]'),
  ).toHaveAttribute("data-dreamboard-scenario-status", "ready");

  const attrs = BROWSER_INTERACTION_ATTRIBUTES;
  const target = page.locator(
    [
      `[${attrs.protocol}="${DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION}"]`,
      `[${attrs.role}="actuator"]`,
      `[${attrs.actuatorId}="board:space:cell-1-0"]`,
    ].join(""),
  );
  await expect(target).toHaveAttribute("role", "button");
  await expect(target).toHaveAttribute("tabindex", "0");

  await target.focus();
  await page.keyboard.press("Enter");

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
