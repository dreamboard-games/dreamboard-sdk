import { expect, test } from "@playwright/test";
import {
  executeFixtureStep,
  installDeterministicWorkbenchEnvironment,
  waitForWorkbenchStablePage,
  type WorkbenchSemanticReplayStep,
} from "./driver/semantic-browser-driver.js";

interface RuntimeVisualBaseline {
  readonly name: string;
  readonly scenarioId: string;
  readonly project: string;
  readonly replaySteps: number;
  readonly snapshotName: string;
  readonly stageWidth?: number;
}

const baselines: readonly RuntimeVisualBaseline[] = [
  {
    name: "hearts sealed pass",
    scenarioId: "hearts.sealed-pass.mobile",
    project: "chromium-touch-phone",
    replaySteps: 0,
    snapshotName: "hearts-sealed-pass.png",
  },
  {
    name: "Stormtrail growing network",
    scenarioId: "hex-network-trading.growing-network.desktop",
    project: "chromium-desktop",
    replaySteps: 0,
    snapshotName: "stormtrail-growing-network.png",
    stageWidth: 820,
  },
  {
    name: "Mosaic first craft",
    scenarioId: "worker-placement-tableau.first-craft.desktop",
    project: "chromium-desktop",
    replaySteps: 0,
    snapshotName: "mosaic-first-craft.png",
    stageWidth: 820,
  },
  {
    name: "prompt choice validation surface",
    scenarioId: "ui-scenarios.prompts-choice.desktop",
    project: "chromium-desktop",
    replaySteps: 0,
    snapshotName: "prompt-choice-validation.png",
    stageWidth: 820,
  },
  {
    name: "board slot targeting surface",
    scenarioId: "ui-scenarios.boards-slot.desktop",
    project: "chromium-desktop",
    replaySteps: 0,
    snapshotName: "board-slot-targeting.png",
    stageWidth: 820,
  },
];

test.skip(
  process.platform !== "darwin",
  "Runtime visual baselines are authored against Darwin snapshots.",
);

test.beforeEach(async ({ page }) => {
  await installDeterministicWorkbenchEnvironment(page);
});

for (const baseline of baselines) {
  test(`${baseline.name} runtime visual baseline`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== baseline.project,
      `baseline is pinned to ${baseline.project}`,
    );

    await page.goto(`/scenario/${baseline.scenarioId}?mode=test`);
    if (baseline.stageWidth) {
      await page.addStyleTag({
        content: `.scenario-view--test .fixture-stage { --fixture-stage-test-width: ${baseline.stageWidth}px; min-height: auto; }`,
      });
    }
    await waitForWorkbenchStablePage(page);

    const scenario = page.locator('[data-dreamboard-workbench="scenario"]');
    const runtimeSurface = scenario.locator(
      '[data-reference-game="reference-game"]',
    );
    await expect(scenario).toHaveAttribute(
      "data-dreamboard-scenario-status",
      "ready",
    );
    await expect(runtimeSurface).toBeVisible();
    const nestedSurface = runtimeSurface
      .locator(
        '[data-reference-game]:not([data-reference-game="reference-game"])',
      )
      .first();
    const visualSurface =
      (await nestedSurface.count()) > 0
        ? nestedSurface
        : runtimeSurface.locator(":scope > *").first();
    await expect(visualSurface).toBeVisible();

    const replay = (await page.evaluate(() => {
      const bridge = window.__dreamboardUIFixture;
      if (!bridge) throw new Error("UI fixture test bridge is not installed.");
      return bridge.getReplaySteps();
    })) as readonly WorkbenchSemanticReplayStep[];

    for (const step of replay.slice(0, baseline.replaySteps)) {
      await executeFixtureStep(page, step);
    }
    await waitForWorkbenchStablePage(page);

    await expect(visualSurface).toHaveScreenshot(baseline.snapshotName, {
      animations: "disabled",
      caret: "hide",
    });
  });
}
