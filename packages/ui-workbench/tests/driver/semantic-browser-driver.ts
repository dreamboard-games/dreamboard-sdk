import type { Page } from "@playwright/test";
import {
  assertValidSemanticSnapshot,
  SemanticResolutionError,
  type WorkbenchReplayStepEvidence,
  type WorkbenchSemanticReplayStep,
} from "../../src/replay/replay-plan.js";
import { runReplayStep } from "../../src/replay/replay-runner.js";
import {
  createPlaywrightReplayAdapter,
  readPageBrowserInteractionSnapshot,
  waitForWorkbenchStablePage,
} from "./playwright-adapter.js";

export async function executeFixtureStep(
  page: Page,
  step: WorkbenchSemanticReplayStep,
): Promise<WorkbenchReplayStepEvidence> {
  return runReplayStep(createPlaywrightReplayAdapter(page), step);
}

export async function installDeterministicWorkbenchEnvironment(
  page: Page,
): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const allowed =
      url.protocol === "blob:" ||
      url.protocol === "data:" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "localhost";
    if (allowed) {
      await route.continue();
      return;
    }
    await route.abort("blockedbyclient");
  });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

export {
  assertValidSemanticSnapshot,
  readPageBrowserInteractionSnapshot,
  SemanticResolutionError,
  waitForWorkbenchStablePage,
  type WorkbenchReplayStepEvidence,
  type WorkbenchSemanticReplayStep,
};
