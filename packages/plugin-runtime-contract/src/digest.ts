import type { PluginGameplayFrame } from "./frame.js";
import {
  type ActionSetVersionInput,
  type SubmitInteractionCommand,
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
    digestVersion: "plugin-action-set@4",
    version: input.version,
    availableInteractions: input.availableInteractions,
  });
}

export function digestPluginGameplayFrame(frame: PluginGameplayFrame): string {
  return digestPluginRuntimeJson({
    digestVersion: "plugin-gameplay-frame@4",
    frame,
  });
}

export function digestPluginCommandRequest(
  command: SubmitInteractionCommand,
): string {
  return digestPluginRuntimeJson({
    digestVersion: "plugin-command-request@4",
    command,
  });
}
