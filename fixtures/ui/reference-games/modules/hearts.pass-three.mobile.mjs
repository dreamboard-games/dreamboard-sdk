import React from "react";
import { PluginRuntime } from "@dreamboard-games/sdk/runtime";

export const uiContractFingerprint =
  "sha256:d11b8694328d711612c214b6db70e0d9e4e01211941c9d061f136b89515b995a";

export function Root() {
  return React.createElement(
    "section",
    {
      "data-dreamboard-ui-fixture": "hearts.pass-three.mobile",
      "data-dreamboard-reference-game": "hearts",
      "data-dreamboard-runtime": PluginRuntime
        ? "external-sdk-runtime"
        : "missing-runtime",
    },
    "Hearts",
  );
}
