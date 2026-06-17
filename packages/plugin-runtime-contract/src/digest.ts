import type { PluginGameplayFrame } from "./frame.js";
import {
  type ActionSetVersionInput,
  type ValidateInteractionCommand,
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
    digestVersion: "plugin-action-set@3",
    gameVersion: input.gameVersion,
    availableInteractions: input.availableInteractions,
  });
}

export function digestPluginGameplayFrame(frame: PluginGameplayFrame): string {
  return digestPluginRuntimeJson({
    digestVersion: "plugin-gameplay-frame@3",
    frame,
  });
}

export function digestPluginCommandRequest(
  command: ValidateInteractionCommand | SubmitInteractionCommand,
): string {
  return digestPluginRuntimeJson({
    digestVersion: "plugin-command-request@3",
    command,
  });
}
