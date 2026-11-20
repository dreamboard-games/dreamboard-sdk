import type { ReducerBundleContract } from "../../shared/worker-contract";
import type { ReducerDiagnosticsSink } from "../diagnostics";
import type { InteractionDiagnosticsMode } from "./trusted/interaction-types";

import type { BotStrategy } from "./bot-strategies";

export type ReducerBundleOptions<Game = unknown> = {
  botStrategies?: readonly BotStrategy<Game>[];
  diagnostics?: ReducerDiagnosticsSink | InteractionDiagnosticsMode;
  descriptorDiagnostics?: InteractionDiagnosticsMode;
};
export type ReducerBundle = ReducerBundleContract;
