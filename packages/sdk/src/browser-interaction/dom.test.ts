import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  BROWSER_INTERACTION_ATTRIBUTES,
  createGameplayActuatorAttributes,
  createGameplayInteractionRootAttributes,
  readBrowserInteractionSnapshot,
} from "./index.js";

beforeEach(() => {
  GlobalRegistrator.register({ url: "https://plugin.dreamboard.test" });
});

afterEach(() => {
  GlobalRegistrator.unregister();
});

test("reads only current-protocol interaction records from the DOM", () => {
  const interaction = document.createElement("section");
  setAttributes(
    interaction,
    createGameplayInteractionRootAttributes({
      scopeId: "runtime",
      interactionKey: "turn.submit",
      interactionId: "submit",
      readiness: "ready",
    }),
  );

  const actuator = document.createElement("button");
  setAttributes(
    actuator,
    createGameplayActuatorAttributes({
      scopeId: "runtime",
      interactionKey: "turn.submit",
      interactionId: "submit",
      intent: "submit",
      actuatorKind: "click",
      actuatorId: "submit-button",
    }),
  );
  interaction.append(actuator);

  const stale = document.createElement("button");
  setAttributes(stale, {
    ...createGameplayActuatorAttributes({
      scopeId: "runtime",
      interactionKey: "turn.submit",
      interactionId: "submit",
      intent: "submit",
      actuatorKind: "click",
    }),
    [BROWSER_INTERACTION_ATTRIBUTES.protocol]: "1.0.0",
  });

  document.body.append(interaction, stale);

  const snapshot = readBrowserInteractionSnapshot(document);
  expect(snapshot.diagnostics).toEqual([]);
  expect(snapshot.surfaces).toHaveLength(1);
  const surface = snapshot.surfaces[0];
  expect(surface?.surface).toBe("gameplay");
  if (!surface || !("interactions" in surface)) {
    throw new Error("Expected a semantic gameplay surface.");
  }
  expect(surface.interactions).toHaveLength(1);
  expect(surface.interactions[0]?.actuators).toHaveLength(1);
  expect(surface.interactions[0]?.actuators[0]?.actuatorId).toBe(
    "submit-button",
  );
});

function setAttributes(
  element: Element,
  attributes: Readonly<Record<string, string | boolean>>,
): void {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
}
