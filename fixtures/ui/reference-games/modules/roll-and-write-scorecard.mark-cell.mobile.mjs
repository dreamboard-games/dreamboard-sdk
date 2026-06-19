import * as React from "react";
import * as DreamboardRuntime from "@dreamboard-games/sdk/runtime/primitives";
import * as PluginRuntimeContract from "@dreamboard-games/plugin-runtime-contract";
import * as ui from "../../../../examples/reference-games/roll-and-write-scorecard/ui/App.tsx";

void React;
void DreamboardRuntime;
void PluginRuntimeContract;

const Root = ui.Root ?? ui.default ?? ui.App;
if (!Root) {
  throw new Error(
    "Reference game UI entrypoint must export Root, default, or App.",
  );
}

function ReferenceGameRoot(props) {
  return React.createElement(
    "div",
    { "data-reference-game": "reference-game" },
    React.createElement(Root, props),
  );
}

export { ReferenceGameRoot as Root };
export const uiContractFingerprint =
  "sha256:c0b031381b3538ec372c986755c0e7dc879c888d37db0d103651bb899f7ae3f9";
