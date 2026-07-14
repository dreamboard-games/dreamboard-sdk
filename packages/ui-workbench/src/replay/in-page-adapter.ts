import {
  BROWSER_INTERACTION_ATTRIBUTES,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
  readBrowserInteractionSnapshot,
} from "@dreamboard-games/sdk/browser-interaction";
import type { BrowserFixtureHostHarness } from "../runtime/browser-fixture-runtime.js";
import type {
  ReplayActuatorReference,
  ReplayDragTargetReference,
  ReplayExecutionInstruction,
  ReplayPointerTargetReference,
  ReplayStepMeasurement,
} from "./replay-plan.js";
import type { ReplayRunnerAdapter } from "./replay-runner.js";

export function createInPageReplayAdapter(options: {
  readonly harness: BrowserFixtureHostHarness;
}): ReplayRunnerAdapter {
  return {
    readSnapshot: async () => readBrowserInteractionSnapshot(document),
    execute: async (instruction) => executeInPageInstruction(instruction),
    flush: async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await options.harness.flush();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    },
    measure: async () => measureInPageReplayState(options.harness),
  };
}

function executeInPageInstruction(
  instruction: ReplayExecutionInstruction,
): void {
  switch (instruction.execute.kind) {
    case "activate":
      activateElement(resolveActuatorElement(instruction.source));
      return;
    case "fill":
      fillElement(
        resolveActuatorElement(instruction.source),
        instruction.execute.value,
      );
      return;
    case "drag": {
      if (!instruction.target) {
        throw new Error(
          `Replay step '${instruction.stepId}' is missing a drag target.`,
        );
      }
      dragElement(
        resolveActuatorElement(instruction.source),
        resolveTargetElement(instruction.target),
      );
      return;
    }
    default: {
      const _exhaustive: never = instruction.execute;
      return _exhaustive;
    }
  }
}

function measureInPageReplayState(
  harness: BrowserFixtureHostHarness,
): ReplayStepMeasurement {
  const activeElement = document.activeElement;
  const focusedInteractionKey =
    activeElement instanceof Element
      ? (activeElement
          .closest("[data-dreamboard-interaction-key]")
          ?.getAttribute("data-dreamboard-interaction-key") ?? undefined)
      : undefined;
  const hostEvents = harness.getEvents();
  const submission = [...hostEvents]
    .reverse()
    .find((event) => event.kind === "submit-received");
  return {
    frameId: harness.getCurrentFrameId(),
    projectionDigest: projectionDigestForCurrentFrame(harness),
    focusedInteractionKey,
    validationState: undefined,
    submissionState: submission?.result,
  };
}

function projectionDigestForCurrentFrame(
  harness: BrowserFixtureHostHarness,
): string {
  const frameId = harness.getCurrentFrameId();
  const frame = harness.tape.frames.find(
    (candidate) => candidate.id === frameId,
  );
  if (!frame) {
    throw new Error(`Current fixture frame '${frameId}' is missing.`);
  }
  return frame.projectionDigest;
}

function activateElement(element: Element): void {
  if (element instanceof HTMLElement) {
    element.focus();
  }
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLButtonElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLAnchorElement
  ) {
    element.click();
    return;
  }
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
}

function fillElement(element: Element, value: string): void {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.focus();
    setNativeValue(element, value);
    element.dispatchEvent(new InputEvent("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (element instanceof HTMLElement && element.isContentEditable) {
    element.focus();
    element.textContent = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true }));
    return;
  }
  throw new Error("Resolved fill actuator is not editable.");
}

function dragElement(source: Element, target: Element): void {
  const from = centerPoint(source);
  const to = centerPoint(target);
  for (const event of [
    pointerEvent("pointerdown", from),
    pointerEvent("pointermove", to),
    pointerEvent("pointerup", to),
    mouseEvent("mousedown", from),
    mouseEvent("mousemove", to),
    mouseEvent("mouseup", to),
  ]) {
    (event.type.endsWith("down") ? source : target).dispatchEvent(event);
  }
}

function pointerEvent(type: string, point: Point): PointerEvent | MouseEvent {
  if (typeof PointerEvent === "function") {
    return new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: point.x,
      clientY: point.y,
      pointerId: 1,
      pointerType: "mouse",
      buttons: type === "pointerup" ? 0 : 1,
    });
  }
  return mouseEvent(type.replace("pointer", "mouse"), point);
}

function mouseEvent(type: string, point: Point): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    buttons: type === "mouseup" ? 0 : 1,
  });
}

function centerPoint(element: Element): Point {
  const box = element.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) {
    throw new Error("Resolved semantic element is not visible.");
  }
  return {
    x: box.left + box.width / 2,
    y: box.top + box.height / 2,
  };
}

function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const prototype = Object.getPrototypeOf(element) as
    | HTMLInputElement
    | HTMLTextAreaElement;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
}

function resolveTargetElement(target: ReplayDragTargetReference): Element {
  return target.kind === "actuator"
    ? resolveActuatorElement(target)
    : resolvePointerTargetElement(target);
}

function resolveActuatorElement(reference: ReplayActuatorReference): Element {
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
  const idMatch = document.querySelectorAll(idSelector);
  if (idMatch.length === 1) {
    return idMatch[0]!;
  }

  const matches = document.querySelectorAll(baseSelector);
  if (matches.length !== 1) {
    throw new Error(
      `Resolved actuator '${reference.actuator.actuatorId}' matched ${matches.length} elements with exact protocol attributes.`,
    );
  }
  return matches[0]!;
}

function resolvePointerTargetElement(
  reference: ReplayPointerTargetReference,
): Element {
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
  const matches = document.querySelectorAll(selector);
  if (matches.length !== 1) {
    throw new Error(
      `Resolved pointer target '${reference.pointerTarget.targetId}' matched ${matches.length} elements with exact protocol attributes.`,
    );
  }
  return matches[0]!;
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

interface Point {
  readonly x: number;
  readonly y: number;
}
