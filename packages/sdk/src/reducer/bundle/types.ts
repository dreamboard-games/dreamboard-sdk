import type { ReducerBundleContract } from "../../shared/worker-contract";
import type { ReducerDiagnosticsSink } from "../diagnostics";
import type { InteractionDiagnosticsMode } from "./trusted/interaction-types";

export type ReducerBundleOptions = {
  diagnostics?: ReducerDiagnosticsSink | InteractionDiagnosticsMode;
  descriptorDiagnostics?: InteractionDiagnosticsMode;
};
export type ReducerBundle = ReducerBundleContract;
