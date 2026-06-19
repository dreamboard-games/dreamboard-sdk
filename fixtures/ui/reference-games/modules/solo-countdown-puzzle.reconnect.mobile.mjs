import * as React from "react";
import * as DreamboardRuntime from "@dreamboard-games/sdk/runtime/primitives";
import * as PluginRuntimeContract from "@dreamboard-games/plugin-runtime-contract";
import * as ui from "../../../../examples/reference-games/solo-countdown-puzzle/ui/App.tsx";

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
  "sha256:19b682011e78458729a9eca41cc6efe289188875b8cdff56ac2a99c3bdfc8e00";
