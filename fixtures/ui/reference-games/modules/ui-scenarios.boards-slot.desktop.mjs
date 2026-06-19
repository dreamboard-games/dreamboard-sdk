import * as React from "react";
import * as DreamboardRuntime from "@dreamboard-games/sdk/runtime/primitives";
import * as PluginRuntimeContract from "@dreamboard-games/plugin-runtime-contract";
import * as ui from "../../../../examples/ui-scenarios/src/ui.mjs";

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
  "sha256:97044fe969a8a46c6ca098412ad9572d23a13977964d048039ac77f771143105";
