import type { DispatchTraceEntry } from "./core/types";

export type DispatchTraceSummaryEntry =
  | { kind: "acceptedClientInput"; interactionId: string; playerId: string }
  | { kind: "appliedInstruction"; instruction: string }
  | {
      kind: "rngConsumption";
      version: 2;
      operation: string;
      drawIndex: number;
    };

export type ReducerDiagnosticEvent =
  | {
      type: "submitReceived";
      submissionId: string;
      playerId: string;
      interactionId: string;
      phase: string;
    }
  | {
      type: "submitRejected";
      submissionId: string;
      errorCode: string;
      ruleId?: string;
      message?: string;
    }
  | {
      type: "submitAccepted";
      submissionId: string;
      trace: readonly DispatchTraceSummaryEntry[];
    }
  | {
      type: "phaseTransition";
      from: string;
      to: string;
      reason: "effect" | "lifecycle";
    }
  | { type: "authoringWarning"; code: string; message: string }
  | {
      type: "internalError";
      submissionId?: string;
      message: string;
      stack?: string;
    };

export type ReducerDiagnosticsSink = {
  event(event: ReducerDiagnosticEvent): void;
};

export const noopDiagnosticsSink: ReducerDiagnosticsSink = {
  event() {},
};

export type ReducerDiagnosticsEmitter = ReducerDiagnosticsSink & {
  readonly disabled: boolean;
};

function messageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stackFromUnknown(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

export function createReducerDiagnosticsEmitter(
  sink: ReducerDiagnosticsSink | undefined,
): ReducerDiagnosticsEmitter {
  const target = sink ?? noopDiagnosticsSink;
  let disabled = false;
  return {
    get disabled() {
      return disabled;
    },
    event(event) {
      if (disabled) return;
      try {
        target.event(event);
      } catch (error) {
        disabled = true;
        try {
          target.event({
            type: "internalError",
            submissionId:
              "submissionId" in event ? event.submissionId : undefined,
            message: `Reducer diagnostics sink threw: ${messageFromUnknown(
              error,
            )}`,
            stack: stackFromUnknown(error),
          });
        } catch {
          // A diagnostics sink must never break reducer execution.
        }
      }
    },
  };
}

export function summarizeDispatchTrace<State, PlayerId extends string>(
  trace: readonly DispatchTraceEntry<State, PlayerId>[],
): DispatchTraceSummaryEntry[] {
  return trace.map((entry) => {
    switch (entry.type) {
      case "acceptedClientInput":
        return {
          kind: "acceptedClientInput" as const,
          interactionId:
            entry.input.kind === "interaction"
              ? entry.input.interactionId
              : entry.input.kind,
          playerId:
            entry.input.kind === "interaction" ? entry.input.playerId : "",
        };
      case "appliedInstruction":
        return {
          kind: "appliedInstruction" as const,
          instruction: entry.instruction.kind,
        };
      case "rngConsumption":
        return {
          kind: "rngConsumption" as const,
          version: entry.version,
          operation: entry.operation,
          drawIndex: entry.drawIndex,
        };
      default: {
        const _exhaustive: never = entry;
        return _exhaustive;
      }
    }
  });
}
