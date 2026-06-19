import * as React from "react";
import * as DreamboardRuntime from "@dreamboard-games/sdk/runtime/primitives";
import * as PluginRuntimeContract from "@dreamboard-games/plugin-runtime-contract";
import * as ui from "../../../../examples/reference-games/hex-network-trading/ui/App.tsx";

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
  "sha256:84b8d495e1f411b6671cbf323ec2f12079af32387e348c23caa0843bd1c28d8f";
