import type { Locator, Page } from "@playwright/test";
import {
  BROWSER_INTERACTION_ATTRIBUTES,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
  normalizeBrowserInteractionRecords,
  type BrowserInteractionSnapshot,
} from "@dreamboard-games/sdk/browser-interaction";
import type {
  ReplayActuatorReference,
  ReplayDragTargetReference,
  ReplayExecutionInstruction,
  ReplayPointerTargetReference,
  ReplayStepMeasurement,
  WorkbenchScenarioReplayStep,
} from "../../src/replay/replay-plan.js";
import type { ReplayRunnerAdapter } from "../../src/replay/replay-runner.js";

interface Point {
  readonly x: number;
  readonly y: number;
}

export function createPlaywrightReplayAdapter(page: Page): ReplayRunnerAdapter {
  return {
    readSnapshot: () => readPageBrowserInteractionSnapshot(page),
    validate: (instruction) => validatePlaywrightInstruction(page, instruction),
    execute: (instruction) => executePlaywrightInstruction(page, instruction),
    flush: () => settleFixtureHost(page),
    waitForExpectedState: (step) => waitForExpectedFixtureState(page, step),
    measure: () => measurePlaywrightReplayState(page),
  };
}

export async function readPageBrowserInteractionSnapshot(
  page: Page,
): Promise<BrowserInteractionSnapshot> {
  const records = await page.evaluate(
    ({ attrs, version }) => {
      const selector = [
        `[${attrs.protocol}="${version}"][${attrs.role}="interaction"]`,
        `[${attrs.protocol}="${version}"][${attrs.role}="actuator"]`,
        `[${attrs.protocol}="${version}"][${attrs.role}="pointer-target"]`,
      ].join(",");
      return [...document.querySelectorAll(selector)].map((element) => ({
        attributes: Object.fromEntries(
          [...element.attributes].map((attribute) => [
            attribute.name,
            attribute.value,
          ]),
        ),
      }));
    },
    {
      attrs: BROWSER_INTERACTION_ATTRIBUTES,
      version: DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    },
  );
  return normalizeBrowserInteractionRecords(records);
}

export async function waitForWorkbenchStablePage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  });
}

async function validatePlaywrightInstruction(
  page: Page,
  instruction: ReplayExecutionInstruction,
): Promise<void> {
  await page.evaluate(
    (interactionId) =>
      window.__dreamboardUIFixture?.validateInteraction(interactionId),
    instruction.source.interactionId,
  );
}

async function executePlaywrightInstruction(
  page: Page,
  instruction: ReplayExecutionInstruction,
): Promise<void> {
  switch (instruction.execute.kind) {
    case "activate":
      await activateResolvedActuator(page, instruction.source);
      break;
    case "fill":
      await fillResolvedActuator(
        page,
        instruction.source,
        instruction.execute.value,
      );
      break;
    case "drag": {
      if (!instruction.target) {
        throw new Error(
          `Replay step '${instruction.stepId}' is missing a drag target.`,
        );
      }
      await dragResolvedActuator(page, instruction.source, instruction.target);
      break;
    }
    default: {
      const _exhaustive: never = instruction.execute;
      return _exhaustive;
    }
  }
}

async function settleFixtureHost(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const bridge = window.__dreamboardUIFixture;
    if (!bridge) return;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await bridge.flush();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  });
}

async function waitForExpectedFixtureState(
  page: Page,
  step: WorkbenchScenarioReplayStep,
): Promise<void> {
  const frameId = step.expect.frameId;
  const projectionDigest = step.expect.projectionDigest;
  if (!frameId && !projectionDigest) return;
  await page.waitForFunction(
    (expected) => {
      const bridge = window.__dreamboardUIFixture;
      if (!bridge) return false;
      return (
        (!expected.frameId || bridge.getFrameId() === expected.frameId) &&
        (!expected.projectionDigest ||
          bridge.getProjectionDigest() === expected.projectionDigest)
      );
    },
    { frameId, projectionDigest },
  );
}

async function measurePlaywrightReplayState(
  page: Page,
): Promise<ReplayStepMeasurement> {
  return page.evaluate(() => {
    const bridge = window.__dreamboardUIFixture;
    const activeElement = document.activeElement;
    const focusedInteractionKey =
      activeElement instanceof Element
        ? (activeElement
            .closest("[data-dreamboard-interaction-key]")
            ?.getAttribute("data-dreamboard-interaction-key") ?? undefined)
        : undefined;
    const hostEvents = bridge?.getHostEvents() ?? [];
    const validation = [...hostEvents]
      .reverse()
      .find((event) => event.kind === "validate-received");
    const submission = [...hostEvents]
      .reverse()
      .find((event) => event.kind === "submit-received");
    return {
      frameId: bridge?.getFrameId(),
      projectionDigest: bridge?.getProjectionDigest(),
      scenarioId: bridge?.getScenarioId(),
      focusedInteractionKey,
      validationState: validation?.result,
      submissionState: submission?.result,
    };
  });
}

async function activateResolvedActuator(
  page: Page,
  reference: ReplayActuatorReference,
): Promise<void> {
  const locator = await resolvedActuatorLocator(page, reference);
  if (reference.actuator.actuatorKind === "keyboard") {
    await locator.focus();
    await page.keyboard.press("Enter");
    return;
  }
  const touchCapable = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (touchCapable) {
    await locator.click();
    return;
  }
  await locator.click();
}

async function fillResolvedActuator(
  page: Page,
  reference: ReplayActuatorReference,
  value: string,
): Promise<void> {
  const locator = await resolvedActuatorLocator(page, reference);
  await locator.fill(value);
}

async function dragResolvedActuator(
  page: Page,
  source: ReplayActuatorReference,
  target: ReplayDragTargetReference,
): Promise<void> {
  const sourcePoint = await centerPoint(
    await resolvedActuatorLocator(page, source),
  );
  const targetPoint = await centerPoint(
    await resolvedTargetLocator(page, target),
  );
  const touchCapable = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (!touchCapable) {
    await mouseDrag(page, sourcePoint, targetPoint);
    return;
  }
  const browserName = page.context().browser()?.browserType().name();
  if (browserName !== "chromium") {
    throw new Error(
      `Browser-level touch drag is only implemented for Chromium, not ${browserName ?? "unknown"}.`,
    );
  }
  await touchDrag(page, sourcePoint, targetPoint);
}

async function resolvedTargetLocator(
  page: Page,
  target: ReplayDragTargetReference,
): Promise<Locator> {
  return target.kind === "actuator"
    ? resolvedActuatorLocator(page, target)
    : resolvedPointerTargetLocator(page, target);
}

async function resolvedActuatorLocator(
  page: Page,
  reference: ReplayActuatorReference,
): Promise<Locator> {
  const baseSelector = [
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.protocol,
      DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    ),
    attrEquals(BROWSER_INTERACTION_ATTRIBUTES.role, "actuator"),
    attrEquals(BROWSER_INTERACTION_ATTRIBUTES.surface, reference.surface),
    attrEquals(BROWSER_INTERACTION_ATTRIBUTES.scope, reference.scopeId),
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.interactionKey,
      reference.interactionKey,
    ),
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.interactionId,
      reference.interactionId,
    ),
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.intent,
      reference.actuator.intent,
    ),
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.actuatorKind,
      reference.actuator.actuatorKind,
    ),
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.enabled,
      reference.actuator.enabled ? "true" : "false",
    ),
    optionalAttrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.inputKey,
      reference.actuator.inputKey,
    ),
    optionalAttrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.candidateValue,
      reference.actuator.candidateValueKey,
    ),
  ]
    .filter((part): part is string => Boolean(part))
    .join("");

  const idSelector =
    baseSelector +
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.actuatorId,
      reference.actuator.actuatorId,
    );
  const idLocator = page.locator(idSelector);
  if ((await idLocator.count()) === 1) {
    return idLocator;
  }

  const locator = page.locator(baseSelector);
  const count = await locator.count();
  if (count !== 1) {
    throw new Error(
      `Resolved actuator '${reference.actuator.actuatorId}' matched ${count} elements with exact protocol attributes.`,
    );
  }
  return locator;
}

async function resolvedPointerTargetLocator(
  page: Page,
  reference: ReplayPointerTargetReference,
): Promise<Locator> {
  const attrs = BROWSER_INTERACTION_ATTRIBUTES as Record<
    string,
    string | undefined
  >;
  const pointerTargetId = attrs.pointerTargetId;
  const pointerTargetEnabled = attrs.pointerTargetEnabled;
  if (!pointerTargetId || !pointerTargetEnabled) {
    throw new Error(
      "The active SDK browser-interaction protocol has no pointer-target attributes.",
    );
  }
  const selector = [
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.protocol,
      DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    ),
    attrEquals(BROWSER_INTERACTION_ATTRIBUTES.role, "pointer-target"),
    attrEquals(BROWSER_INTERACTION_ATTRIBUTES.surface, reference.surface),
    attrEquals(BROWSER_INTERACTION_ATTRIBUTES.scope, reference.scopeId),
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.interactionKey,
      reference.interactionKey,
    ),
    attrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.interactionId,
      reference.interactionId,
    ),
    attrEquals(pointerTargetId, reference.pointerTarget.targetId),
    attrEquals(
      pointerTargetEnabled,
      reference.pointerTarget.enabled ? "true" : "false",
    ),
    optionalAttrEquals(
      BROWSER_INTERACTION_ATTRIBUTES.descriptorDigest,
      reference.pointerTarget.descriptorDigest,
    ),
  ]
    .filter((part): part is string => Boolean(part))
    .join("");
  const locator = page.locator(selector);
  const count = await locator.count();
  if (count !== 1) {
    throw new Error(
      `Resolved pointer target '${reference.pointerTarget.targetId}' matched ${count} elements with exact protocol attributes.`,
    );
  }
  return locator;
}

async function centerPoint(locator: Locator): Promise<Point> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Resolved semantic element is not visible.");
  }
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

async function mouseDrag(page: Page, from: Point, to: Point): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

async function touchDrag(page: Page, from: Point, to: Point): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const path = interpolatePoints(from, to, 12);

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y, id: 1 }],
  });
  for (const point of path) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: point.x, y: point.y, id: 1 }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

function interpolatePoints(from: Point, to: Point, steps: number): Point[] {
  return Array.from({ length: steps }, (_, index) => {
    const progress = (index + 1) / steps;
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    };
  });
}

function attrEquals(attribute: string, value: string): string {
  return `[${attribute}="${cssString(value)}"]`;
}

function optionalAttrEquals(attribute: string, value: string | undefined) {
  return value === undefined ? undefined : attrEquals(attribute, value);
}

function cssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
