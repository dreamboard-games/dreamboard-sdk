import { readFileSync } from "node:fs";
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

const defaultSmokeScenarioIds = [
  "hearts.dealt-hand.desktop",
  "roll-and-write-scorecard.mark-cell.mobile",
] as const;

interface FixtureIndexEntry {
  readonly id: string;
  readonly file: string;
}

interface FixtureIndex {
  readonly fixtures: readonly FixtureIndexEntry[];
}

interface FixtureSelectionData {
  readonly environment?: { readonly viewportTags?: readonly string[] };
}

test.beforeEach(async ({ page }) => {
  await installDeterministicWorkbenchEnvironment(page);
});

function generatedRoot(): string {
  const value = process.env.DREAMBOARD_WORKBENCH_GENERATED_ROOT;
  if (!value || !path.isAbsolute(value)) {
    throw new Error(
      "DREAMBOARD_WORKBENCH_GENERATED_ROOT must point at a materialized Workbench.",
    );
  }
  return value;
}

function fixtureIndex(): FixtureIndex {
  return JSON.parse(
    readFileSync(
      path.join(generatedRoot(), "fixtures/reference-games/index.json"),
      "utf8",
    ),
  ) as FixtureIndex;
}

function selectedScenarioIds(index: FixtureIndex): readonly string[] {
  if (process.env.UI_SCENARIO_ALL === "1") {
    return index.fixtures.map(({ id }) => id);
  }
  if (process.env.UI_SCENARIO_IDS) {
    const ids = JSON.parse(process.env.UI_SCENARIO_IDS) as unknown;
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((id) => typeof id !== "string")
    ) {
      throw new Error("UI_SCENARIO_IDS must be a non-empty JSON string array.");
    }
    return ids as string[];
  }
  return defaultSmokeScenarioIds;
}

function projectsForScenario(entry: FixtureIndexEntry): readonly string[] {
  const fixture = JSON.parse(
    readFileSync(
      path.join(generatedRoot(), "fixtures/reference-games", entry.file),
      "utf8",
    ),
  ) as FixtureSelectionData;
  const tags = new Set(fixture.environment?.viewportTags ?? []);
  return tags.has("phone") || tags.has("touch") || entry.id.endsWith(".mobile")
    ? ["chromium-touch-phone", "webkit-phone"]
    : ["chromium-desktop"];
}

const index = fixtureIndex();
const entryById = new Map(index.fixtures.map((entry) => [entry.id, entry]));

for (const scenarioId of selectedScenarioIds(index)) {
  const entry = entryById.get(scenarioId);
  if (!entry) {
    throw new Error(`Unknown UI scenario '${scenarioId}'.`);
  }
  const projects = projectsForScenario(entry);
  test(`${scenarioId} executes its authored browser replay`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !projects.includes(testInfo.project.name),
      `${scenarioId} targets ${projects.join(", ")}`,
    );
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

    const initial = await page.evaluate(() => {
      const bridge = window.__dreamboardUIFixture;
      if (!bridge) throw new Error("UI fixture test bridge is not installed.");
      return {
        projectionDigest: bridge.getProjectionDigest(),
        expected: bridge.getExpected(),
        replay: bridge.getReplaySteps(),
      };
    });
    expect(initial.projectionDigest).toBe(
      initial.expected.initialProjectionDigest,
    );
    expect(initial.replay.length).toBeGreaterThan(0);
    assertValidSemanticSnapshot(await readPageBrowserInteractionSnapshot(page));

    const steps = [];
    for (const step of initial.replay as readonly WorkbenchScenarioReplayStep[]) {
      steps.push(await executeFixtureStep(page, step));
    }
    await page.evaluate(() => window.__dreamboardUIFixture?.assertConsumed());

    const finalSnapshot = await readPageBrowserInteractionSnapshot(page);
    assertValidSemanticSnapshot(finalSnapshot);
    const measured = await page.evaluate(() => {
      const bridge = window.__dreamboardUIFixture;
      if (!bridge) throw new Error("UI fixture test bridge is not installed.");
      return {
        scenarioId: bridge.getScenarioId(),
        projectionDigest: bridge.getProjectionDigest(),
        hostEvents: bridge.getHostEvents(),
        expected: bridge.getExpected(),
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
      };
    });
    expect(measured.scenarioId).toBe(scenarioId);
    expect(measured.projectionDigest).toBe(
      measured.expected.finalProjectionDigest,
    );
    expect(
      digestUIFixtureJson({
        digestVersion: "runtime-browser-interaction@2",
        snapshot: finalSnapshot,
      }),
    ).toBe(measured.expected.finalSemanticDigest);
    if (initial.replay.some((step) => "resolve" in step)) {
      expect(steps.at(-1)?.submissionDigest).toBe(
        measured.expected.submissionDigest,
      );
    }
    expect(measured.hostEvents.length).toBeGreaterThan(0);
    expect(measured.reducedMotion).toBe(true);

    await expectNoHorizontalOverflow(page);
    await expectAllEnabledActuatorsInViewport(page);
    if (testInfo.project.name.includes("phone")) {
      await expectMinimumTouchTargetSize(page, { width: 44, height: 44 });
    }
    await expectBasicAccessibilityInvariants(page);
    await injectAxe(page);
    await checkA11y(page, '[data-dreamboard-workbench="scenario"]', {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });
}
