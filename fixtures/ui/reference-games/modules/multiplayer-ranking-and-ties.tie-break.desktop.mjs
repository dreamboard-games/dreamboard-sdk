import * as React from "react";
import * as DreamboardRuntime from "@dreamboard-games/sdk/runtime/primitives";
import * as PluginRuntimeContract from "@dreamboard-games/plugin-runtime-contract";
import * as ui from "../../../../examples/reference-games/multiplayer-ranking-and-ties/ui/App.tsx";

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
  "sha256:e1958518ae8ec6f9809a19f1c2e10011174575df0bcde0afd523a9c6ca6b9751";
