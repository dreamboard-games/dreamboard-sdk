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
    name: "hearts phone with three selected cards",
    scenarioId: "hearts.pass-three.mobile",
    project: "chromium-touch-phone",
    replaySteps: 3,
    snapshotName: "hearts-phone-three-selected.png",
  },
  {
    name: "hex route drag draft",
    scenarioId: "hex-network-trading.place-route.desktop",
    project: "chromium-desktop",
    replaySteps: 1,
    snapshotName: "hex-route-draft.png",
    stageWidth: 820,
  },
  {
    name: "worker placement form draft",
    scenarioId: "worker-placement-tableau.place-worker.desktop",
    project: "chromium-desktop",
    replaySteps: 1,
    snapshotName: "worker-placement-form-draft.png",
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
        content: `.scenario-view--test .fixture-stage { width: ${baseline.stageWidth}px; min-height: auto; }`,
      });
    }
    await waitForWorkbenchStablePage(page);

    const scenario = page.locator('[data-dreamboard-workbench="scenario"]');
    const runtimeSurface = scenario.locator("[data-reference-game]");
    await expect(scenario).toHaveAttribute(
      "data-dreamboard-scenario-status",
      "ready",
    );
    await expect(runtimeSurface).toBeVisible();
    const visualSurface = runtimeSurface.locator(":scope > *").first();
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
