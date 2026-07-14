import { expect, test } from "@playwright/test";

import { VISUAL_BASELINES } from "../.storybook/visual-baselines.js";
import { deterministicViewportProjects } from "../test-support/deterministic-browser.js";

const projectNames = new Set(
  deterministicViewportProjects.map((project) => project.name),
);
const baselineStoryIds = [
  ...new Set(VISUAL_BASELINES.map((item) => item.storyId)),
];
const unknownViewports = VISUAL_BASELINES.flatMap((baseline) =>
  baseline.viewports
    .filter((viewport) => !projectNames.has(viewport))
    .map((viewport) => `${baseline.storyId}: ${viewport}`),
);

if (unknownViewports.length > 0) {
  throw new Error(
    `VISUAL_BASELINES references unknown Playwright projects:\n${unknownViewports.join(
      "\n",
    )}`,
  );
}

async function fetchStoryIds(
  request: Parameters<typeof test.beforeAll>[0]["request"],
) {
  for (const indexPath of ["/index.json", "/stories.json"]) {
    const response = await request.get(indexPath);
    if (!response.ok()) {
      continue;
    }
    const body = (await response.json()) as {
      entries?: Record<string, unknown>;
      stories?: Record<string, unknown>;
    };
    return new Set(Object.keys(body.entries ?? body.stories ?? {}));
  }
  throw new Error("Storybook did not expose /index.json or /stories.json.");
}

async function waitForStableLayout(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

test.beforeAll(async ({ request }) => {
  const storyIds = await fetchStoryIds(request);
  const missing = baselineStoryIds.filter((storyId) => !storyIds.has(storyId));
  if (missing.length > 0) {
    throw new Error(
      `VISUAL_BASELINES references unknown Storybook stories:\n${missing.join(
        "\n",
      )}`,
    );
  }
});

for (const baseline of VISUAL_BASELINES) {
  for (const viewport of baseline.viewports) {
    test(`${baseline.storyId} @ ${viewport}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== viewport);

      const url = `/iframe.html?id=${encodeURIComponent(
        baseline.storyId,
      )}&viewMode=story&globals=reducedMotion:force`;

      await page.goto(url);
      await page.locator("#storybook-root").waitFor();
      await waitForStableLayout(page);

      await expect(page.locator("#storybook-root")).toHaveScreenshot(
        `${baseline.storyId}.png`,
      );
    });
  }
}
