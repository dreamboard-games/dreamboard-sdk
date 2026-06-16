import React from "react";
import { PluginRuntime } from "@dreamboard-games/sdk/runtime";

export const uiContractFingerprint =
  "sha256:4016f48a07fa5246662cf0a7a833868c5ac3f71319d1f40fa74a104a747fd3d7";

export function Root() {
  return React.createElement(
    "section",
    {
      "data-dreamboard-ui-fixture":
        "simultaneous-card-drafting.lock-choice.mobile",
      "data-dreamboard-reference-game": "simultaneous-card-drafting",
      "data-dreamboard-runtime": PluginRuntime
        ? "external-sdk-runtime"
        : "missing-runtime",
    },
    "Simultaneous Card Drafting",
  );
}
