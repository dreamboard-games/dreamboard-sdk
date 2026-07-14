import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { digestUIFixtureJson } from "@dreamboard-games/sdk/testing";
import { checkA11y, injectAxe } from "axe-playwright";
import {
  expectAllEnabledActuatorsInViewport,
  expectBasicAccessibilityInvariants,
  expectMinimumTouchTargetSize,
  expectNoHorizontalOverflow,
} from "./driver/layout-accessibility-assertions.js";
import {
  assertValidSemanticSnapshot,
  executeFixtureStep,
  installDeterministicWorkbenchEnvironment,
  readPageBrowserInteractionSnapshot,
  waitForWorkbenchStablePage,
  type WorkbenchScenarioReplayStep,
} from "./driver/semantic-browser-driver.js";

test.beforeEach(async ({ page }) => {
  await installDeterministicWorkbenchEnvironment(page);
});

interface ScenarioMatrixEntry {
  readonly scenarioId: string;
  readonly project?: string;
  readonly evidencePath?: string;
}

function readScenarioMatrix(): readonly ScenarioMatrixEntry[] {
  const matrixPath = process.env.UI_SCENARIO_MATRIX_PATH;
  if (!matrixPath) {
    return [
      {
        scenarioId: process.env.UI_SCENARIO_ID ?? "hearts.sealed-pass.mobile",
        evidencePath: process.env.UI_SCENARIO_EVIDENCE_PATH,
      },
    ];
  }
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
  if (!Array.isArray(matrix.entries) || matrix.entries.length === 0) {
    throw new Error(`${matrixPath} must contain a non-empty entries array.`);
  }
  return matrix.entries;
}

for (const entry of readScenarioMatrix()) {
  test(`${entry.scenarioId} replays on ${entry.project ?? "selected project"}`, async ({
    page,
  }, testInfo) => {
    test.skip(
      Boolean(entry.project && entry.project !== testInfo.project.name),
      `scenario selected for ${entry.project}`,
    );
    const scenarioId = entry.scenarioId;
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
    await expect(
      scenario.locator("[data-reference-game]").first(),
    ).toBeVisible();
    assertValidSemanticSnapshot(await readPageBrowserInteractionSnapshot(page));

    const replay = await page.evaluate(() => {
      const bridge = window.__dreamboardUIFixture;
      if (!bridge) throw new Error("UI fixture test bridge is not installed.");
      return bridge.getReplaySteps();
    });
    expect(replay.length).toBeGreaterThan(0);

    const screenshotDir = process.env.UI_SCENARIO_SCREENSHOT_DIR;
    const screenshots: string[] = [];
    const steps = [];
    for (const [index, step] of (
      replay as readonly WorkbenchScenarioReplayStep[]
    ).entries()) {
      const evidence = await executeFixtureStep(page, step);
      let screenshotPath: string | undefined;
      if (screenshotDir) {
        await mkdir(screenshotDir, { recursive: true });
        screenshotPath = path.join(
          screenshotDir,
          `${scenarioId}.${testInfo.project.name}.${String(index + 1).padStart(2, "0")}-${step.stepId.replace(/[^a-zA-Z0-9.-]+/g, "-")}.png`,
        );
        await scenario.screenshot({
          path: screenshotPath,
          animations: "disabled",
        });
        screenshots.push(screenshotPath);
      }
      steps.push({ ...evidence, screenshotPath });
    }

    await page.evaluate(() => window.__dreamboardUIFixture?.assertConsumed());
    const finalSnapshot = await readPageBrowserInteractionSnapshot(page);
    assertValidSemanticSnapshot(finalSnapshot);
    const reducedMotion = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(reducedMotion).toBe(true);
    const measured = await page.evaluate(() => {
      const bridge = window.__dreamboardUIFixture;
      if (!bridge) throw new Error("UI fixture test bridge is not installed.");
      return {
        scenarioId: bridge.getScenarioId(),
        frameId: bridge.getFrameId(),
        projectionDigest: bridge.getProjectionDigest(),
        hostEvents: bridge.getHostEvents(),
      };
    });
    const finalStep = steps.at(-1);
    const evidence = {
      schemaVersion: 1,
      kind: "dreamboard-ui-scenario-evidence",
      scenarioId: measured.scenarioId,
      project: testInfo.project.name,
      attempt: testInfo.retry + 1,
      frameId: measured.frameId,
      projectionDigest: measured.projectionDigest,
      semanticDigest: digestUIFixtureJson({
        digestVersion: "runtime-browser-interaction@2",
        snapshot: finalSnapshot,
      }),
      semanticSnapshot: finalSnapshot,
      submissionDigest: finalStep?.submissionDigest,
      hostEvents: measured.hostEvents,
      steps,
      screenshots,
    };

    expect(measured.hostEvents.length).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);
    await expectAllEnabledActuatorsInViewport(page);
    const layoutAssertions = [
      "no-horizontal-overflow",
      "enabled-actuators-in-viewport",
      "basic-accessibility-invariants",
    ];
    if (testInfo.project.name.includes("phone")) {
      await expectMinimumTouchTargetSize(page, { width: 44, height: 44 });
      layoutAssertions.push("minimum-touch-target-size");
    }
    await expectBasicAccessibilityInvariants(page);
    await injectAxe(page);
    await checkA11y(page, '[data-dreamboard-workbench="scenario"]', {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });

    const evidencePath =
      entry.evidencePath ?? process.env.UI_SCENARIO_EVIDENCE_PATH;
    if (evidencePath) {
      await mkdir(path.dirname(evidencePath), { recursive: true });
      await writeFile(
        evidencePath,
        `${JSON.stringify(
          {
            ...evidence,
            proof: {
              reducedMotion: "passed",
              accessibility: {
                axeScan: "passed",
                layoutAssertions,
              },
            },
          },
          null,
          2,
        )}\n`,
      );
    }
  });
}
