import {
  BROWSER_INTERACTION_ATTRIBUTES,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
} from "./constants.js";
import { normalizeBrowserInteractionRecords } from "./normalize.js";
import type { BrowserInteractionSnapshot } from "./types.js";

export function readBrowserInteractionSnapshot(
  root: ParentNode,
): BrowserInteractionSnapshot {
  const protocol = BROWSER_INTERACTION_ATTRIBUTES.protocol;
  const role = BROWSER_INTERACTION_ATTRIBUTES.role;
  const selector = [
    `[${protocol}="${DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION}"][${role}="interaction"]`,
    `[${protocol}="${DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION}"][${role}="actuator"]`,
  ].join(",");
  const records = [...root.querySelectorAll(selector)].map((element) => ({
    attributes: Object.fromEntries(
      [...element.attributes].map((attribute) => [
        attribute.name,
        attribute.value,
      ]),
    ),
  }));
  return normalizeBrowserInteractionRecords(records);
}
