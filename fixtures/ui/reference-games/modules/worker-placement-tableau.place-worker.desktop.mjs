import React from "react";
import { PluginRuntime } from "@dreamboard-games/sdk/runtime";

export const uiContractFingerprint =
  "sha256:7ead99900f9c41b0e5e8c1e9a0d06223712524b492e96f690dffacb0cfda0d2d";

export function Root() {
  return React.createElement(
    "section",
    {
      "data-dreamboard-ui-fixture":
        "worker-placement-tableau.place-worker.desktop",
      "data-dreamboard-reference-game": "worker-placement-tableau",
      "data-dreamboard-runtime": PluginRuntime
        ? "external-sdk-runtime"
        : "missing-runtime",
    },
    "Worker Placement Tableau",
  );
}
