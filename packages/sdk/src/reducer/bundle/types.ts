import type { ReducerBundleContract } from "../../shared/worker-contract";
import type { ReducerDiagnosticsSink } from "../diagnostics";
import type { InteractionDiagnosticsMode } from "./trusted/interaction-types";

import type { DefinedBots } from "./define-bots";

export type ReducerBundleOptions<Game = unknown> = {
  botStrategies?: DefinedBots<Game>;
  diagnostics?: ReducerDiagnosticsSink | InteractionDiagnosticsMode;
  descriptorDiagnostics?: InteractionDiagnosticsMode;
};
export type ReducerBundle = ReducerBundleContract;
