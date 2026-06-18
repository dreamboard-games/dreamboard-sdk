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
      `[${attrs.actuatorId}="board:space:cell-0-1"]`,
    ].join(""),
  );
  await expect(target).toHaveAttribute("role", "button");
  await expect(target).toHaveAttribute("tabindex", "0");

  await target.focus();
  await page.keyboard.press("Enter");

  await expect
    .poll(async () => {
      const snapshot = await readPageBrowserInteractionSnapshot(page);
      assertValidSemanticSnapshot(snapshot);
      const interaction = snapshot.surfaces
        .flatMap((surface) => surface.interactions)
        .find((item) => item.interactionKey === "mark-cell");
      const cellActuator = interaction?.actuators.find(
        (actuator) => actuator.actuatorId === "board:space:cell-0-1",
      );
      const submitActuator = interaction?.actuators.find(
        (actuator) => actuator.actuatorId === "primitive-submit",
      );
      return {
        cellCandidateState: cellActuator?.candidateState,
        submitEnabled: submitActuator?.enabled,
      };
    })
    .toEqual({
      cellCandidateState: "selected",
      submitEnabled: true,
    });
});
