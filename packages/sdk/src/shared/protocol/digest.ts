import type { PluginGameplayFrame } from "./frame.js";
import {
  type ActionSetVersionInput,
  type SubmitInteractionCommand,
  type CancelInteractionCommand,
} from "./protocol.js";
import {
  canonicalizePluginRuntimeJson,
  digestPluginRuntimeJson,
  encodeCanonicalPluginRuntimeJson,
} from "./json.js";

export {
  canonicalizePluginRuntimeJson,
  digestPluginRuntimeJson,
  encodeCanonicalPluginRuntimeJson,
};

export function computePluginActionSetVersion(
  input: ActionSetVersionInput,
): string {
  return digestPluginRuntimeJson({
    digestVersion: "plugin-action-set@5",
    version: input.version,
    availableInteractions: input.availableInteractions,
  });
}

export function digestPluginGameplayFrame(frame: PluginGameplayFrame): string {
  return digestPluginRuntimeJson({
    digestVersion: "plugin-gameplay-frame@5",
    frame,
  });
}

export function digestPluginCommandRequest(
  command: SubmitInteractionCommand | CancelInteractionCommand,
): string {
  return digestPluginRuntimeJson({
    digestVersion: "plugin-command-request@5",
    command,
  });
}
