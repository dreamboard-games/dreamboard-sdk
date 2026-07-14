import { expect, test } from "@playwright/test";
import {
  createBrowserInteractionActuatorAttributes,
  createBrowserInteractionPointerTargetAttributes,
  createBrowserInteractionRootAttributes,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
} from "@dreamboard-games/sdk/browser-interaction";
import {
  executeFixtureStep,
  readPageBrowserInteractionSnapshot,
  SemanticResolutionError,
  type WorkbenchSemanticReplayStep,
} from "./semantic-browser-driver.js";
import { ReplayStepExecutionError } from "../../src/replay/replay-runner.js";

const surface = "gameplay";
const scopeId = "runtime";
const interactionKey = "play-card";
const interactionId = "play-card:player-1";

test("semantic driver activates a uniquely resolved actuator by protocol attributes", async ({
  page,
}) => {
  await page.setContent(`
    <main>
      <section ${htmlAttributes(
        createBrowserInteractionRootAttributes({
          surface,
          scopeId,
          interactionKey,
          interactionId,
          descriptorDigest:
            "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          draftDigest:
            "sha256:2222222222222222222222222222222222222222222222222222222222222222",
          readiness: "ready",
        }),
      )}></section>
      <button
        ${htmlAttributes(
          createBrowserInteractionActuatorAttributes({
            surface,
            scopeId,
            interactionKey,
            interactionId,
            descriptorDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            draftDigest:
              "sha256:2222222222222222222222222222222222222222222222222222222222222222",
            intent: "invoke",
            actuatorKind: "click",
            actuatorId: "invoke-submit",
            semanticEffects: [{ kind: "invoke" }],
          }),
        )}
        onclick="window.activationCount = (window.activationCount ?? 0) + 1"
      >Visible copy is not a selector</button>
    </main>
  `);

  const step: WorkbenchSemanticReplayStep = {
    stepId: "activate-submit",
    resolve: {
      surface,
      scopeId,
      interactionKey,
      interactionId,
      intent: "invoke",
      actuatorKind: "click",
    },
    execute: { kind: "activate" },
    expectedIdentity: {
      stepId: "activate-submit",
      surface,
      scopeId,
      interactionKey,
      interactionId,
      actuatorId: "invoke-submit",
      descriptorDigest:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      draftDigest:
        "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    },
    expect: {
      visibleInteractionKeys: [interactionKey],
    },
  };

  await executeFixtureStep(page, step);

  await expect.poll(() => page.evaluate(() => window.activationCount)).toBe(1);
});

test("semantic driver fills a uniquely resolved fill actuator", async ({
  page,
}) => {
  await page.setContent(`
    <main>
      <section ${htmlAttributes(
        createBrowserInteractionRootAttributes({
          surface,
          scopeId,
          interactionKey,
          interactionId,
          readiness: "ready",
        }),
      )}></section>
      <input
        ${htmlAttributes(
          createBrowserInteractionActuatorAttributes({
            surface,
            scopeId,
            interactionKey,
            interactionId,
            intent: "fill",
            inputKey: "amount",
            actuatorKind: "fill",
            actuatorId: "amount-fill",
            acceptedEffectPatterns: [
              {
                kind: "match",
                effectKind: "setScalar",
                fields: { inputKey: "amount" },
                scalar: { field: "value", min: 0, max: 10, integer: true },
              },
            ],
          }),
        )}
      />
    </main>
  `);

  await executeFixtureStep(page, {
    stepId: "fill-amount",
    resolve: {
      surface,
      scopeId,
      interactionKey,
      interactionId,
      intent: "fill",
      inputKey: "amount",
      actuatorKind: "fill",
    },
    execute: { kind: "fill", value: "7" },
    expect: {
      visibleInteractionKeys: [interactionKey],
    },
  });

  await expect(page.locator("input")).toHaveValue("7");
});

test("semantic driver drags from a pointer actuator to a pointer target", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName === "webkit",
    "The WebKit phone lane is layout/tap smoke coverage; touch drag parity is Chromium CDP only.",
  );

  await page.setContent(`
    <main>
      <script>
        window.dragFinished = false;
        document.addEventListener("mouseup", () => { window.dragFinished = true; });
        document.addEventListener("touchend", () => { window.dragFinished = true; }, { passive: true });
      </script>
      <section ${htmlAttributes(
        createBrowserInteractionRootAttributes({
          surface,
          scopeId,
          interactionKey,
          interactionId,
          readiness: "ready",
        }),
      )}></section>
      <div
        ${htmlAttributes(
          createBrowserInteractionActuatorAttributes({
            surface,
            scopeId,
            interactionKey,
            interactionId,
            intent: "select",
            inputKey: "cardId",
            candidateValue: "card-1",
            actuatorKind: "pointer",
            actuatorId: "card-1-pointer",
          }),
        )}
        style="position:absolute;left:20px;top:20px;width:80px;height:80px;background:#aac;"
      ></div>
      <div
        ${htmlAttributes(
          createBrowserInteractionPointerTargetAttributes({
            surface,
            scopeId,
            interactionKey,
            interactionId,
            targetId: "staging-target",
            acceptedEffectPatterns: [
              {
                kind: "match",
                effectKind: "setCandidate",
                fields: { inputKey: "destination", candidateValue: "staging" },
              },
            ],
          }),
        )}
        style="position:absolute;left:240px;top:20px;width:90px;height:90px;background:#aca;"
      ></div>
    </main>
  `);

  await executeFixtureStep(page, {
    stepId: "drag-card",
    resolve: {
      surface,
      scopeId,
      interactionKey,
      interactionId,
      intent: "select",
      inputKey: "cardId",
      candidateValue: "card-1",
      actuatorKind: "pointer",
    },
    execute: {
      kind: "drag",
      target: {
        surface,
        scopeId,
        interactionKey,
        interactionId,
        effect: {
          kind: "setCandidate",
          inputKey: "destination",
          candidateValue: "staging",
          beforeSelected: false,
          afterSelected: true,
        },
      },
    },
    expect: {
      visibleInteractionKeys: [interactionKey],
    },
  });

  await expect.poll(() => page.evaluate(() => window.dragFinished)).toBe(true);
});

test("semantic driver reports typed resolution failures", async ({ page }) => {
  await page.setContent(`
    <main>
      <section ${htmlAttributes(
        createBrowserInteractionRootAttributes({
          surface,
          scopeId,
          interactionKey,
          interactionId,
          readiness: "ready",
        }),
      )}></section>
      <button ${htmlAttributes(
        createBrowserInteractionActuatorAttributes({
          surface,
          scopeId,
          interactionKey,
          interactionId,
          intent: "invoke",
          actuatorKind: "click",
          actuatorId: "invoke-submit",
        }),
      )}>Only invoke exists</button>
    </main>
  `);

  await expect(async () => {
    try {
      await executeFixtureStep(page, {
        stepId: "missing-submit",
        resolve: {
          surface,
          scopeId,
          interactionKey,
          interactionId,
          intent: "submit",
          actuatorKind: "click",
        },
        execute: { kind: "activate" },
        expect: {},
      });
    } catch (cause) {
      expect(cause).toBeInstanceOf(ReplayStepExecutionError);
      expect((cause as ReplayStepExecutionError).cause).toBeInstanceOf(
        SemanticResolutionError,
      );
      throw cause;
    }
  }).rejects.toThrow(ReplayStepExecutionError);
});

test("semantic snapshot reader normalizes current Workbench protocol records", async ({
  page,
}) => {
  await page.setContent(`
    <section ${htmlAttributes(
      createBrowserInteractionRootAttributes({
        surface,
        scopeId,
        interactionKey,
        interactionId,
        readiness: "ready",
      }),
    )}></section>
  `);

  const snapshot = await readPageBrowserInteractionSnapshot(page);

  expect(snapshot.protocol.version).toBe(
    DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
  );
  expect(snapshot.surfaces).toHaveLength(1);
  expect(snapshot.diagnostics).toEqual([]);
});

function htmlAttributes(attributes: Record<string, string | boolean>): string {
  return Object.entries(attributes)
    .map(([key, value]) => {
      if (value === true) return key;
      if (value === false) return `${key}="false"`;
      return `${key}="${escapeHtml(value)}"`;
    })
    .join(" ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

declare global {
  interface Window {
    activationCount?: number;
    dragFinished?: boolean;
  }
}
