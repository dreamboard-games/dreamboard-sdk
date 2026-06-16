import React from "react";
import { PluginRuntime } from "@dreamboard-games/sdk/runtime";

export const uiContractFingerprint =
  "sha256:34261b5e5baf50f3182af47fb98be647599a5b95a064cdf5b99140f53866428a";

export function Root() {
  return React.createElement(
    "section",
    {
      "data-dreamboard-ui-fixture": "hex-network-trading.place-route.desktop",
      "data-dreamboard-reference-game": "hex-network-trading",
      "data-dreamboard-runtime": PluginRuntime
        ? "external-sdk-runtime"
        : "missing-runtime",
    },
    "Hex Network Trading",
  );
}
