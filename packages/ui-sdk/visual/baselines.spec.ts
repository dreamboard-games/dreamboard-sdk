import { expect, test } from "playwright/test";
// Playwright Test uses Node-style resolution; import the source file directly
// rather than its `.js` extension so we don't depend on tsconfig path mapping.
import { VISUAL_BASELINES } from "../.storybook/visual-baselines";

const STORYBOOK_BASE = "iframe.html";

for (const baseline of VISUAL_BASELINES) {
  for (const viewport of baseline.viewports) {
    test.describe(`${baseline.storyId} @ ${viewport}`, () => {
      test.use({
        // Project tagging — Playwright's `--project` selector picks up the
        // viewport from the runner config so the same spec runs on every
        // declared device size.
        viewport: undefined as never,
      });

      test(`visual baseline`, async ({ page }, info) => {
        if (info.project.name !== viewport) test.skip();
        await page.goto(
          `${STORYBOOK_BASE}?id=${baseline.storyId}&viewMode=story`,
        );
        await page.waitForFunction(
          () => document.querySelector("#storybook-root") !== null,
        );
        // Defer one frame so the theme provider's CSS variables flush before
        // the screenshot fires.
        await page.waitForTimeout(250);
        await expect(page).toHaveScreenshot(`${baseline.storyId}.png`, {
          fullPage: false,
        });
      });
    });
  }
}
