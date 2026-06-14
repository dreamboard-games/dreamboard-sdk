import type {
  InteractionHandle,
  InteractionParamsShape,
} from "../hooks/useInteractionHandle.js";
import type { PluginRuntimeDiagnosticHandler } from "../api/createPluginRuntimeAPI.js";

type UnhandledInteractionError = "throw" | "log" | "ignore";

interface RunInteractionActionOptions<Result> {
  onSuccess?: (result: Result) => void;
  onError?: (error: unknown) => void;
  unhandledError?: UnhandledInteractionError;
  onDiagnostic?: PluginRuntimeDiagnosticHandler;
}

export interface InteractionSubmitCallbacks {
  onSubmitSuccess?: () => void;
  onSubmitError?: (error: unknown) => void;
}

export async function runInteractionAction<Result>(
  action: () => Promise<Result>,
  {
    onSuccess,
    onError,
    unhandledError = "throw",
    onDiagnostic,
  }: RunInteractionActionOptions<Result> = {},
): Promise<void> {
  try {
    const result = await action();
    onSuccess?.(result);
  } catch (error) {
    if (onError) {
      onError(error);
      return;
    }
    if (unhandledError === "log") {
      const message = error instanceof Error ? error.message : String(error);
      if (onDiagnostic) {
        onDiagnostic({
          type: "runtimeLog",
          level: "error",
          message,
          details: [error],
        });
      } else {
        console.error(error);
      }
      return;
    }
    if (unhandledError === "ignore") {
      return;
    }
    throw error;
  }
}

export function submitInteractionDraft<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(
  handle: InteractionHandle<Params, DefaultedKeys>,
  callbacks: InteractionSubmitCallbacks = {},
  options: { unhandledError?: UnhandledInteractionError } = {},
): Promise<void> {
  return runInteractionAction(() => handle.submitDraft(), {
    onSuccess: callbacks.onSubmitSuccess,
    onError: callbacks.onSubmitError,
    unhandledError: options.unhandledError,
  });
}

export function submitInteraction<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(
  handle: InteractionHandle<Params, DefaultedKeys>,
  callbacks: InteractionSubmitCallbacks = {},
  options: { unhandledError?: UnhandledInteractionError } = {},
): Promise<void> {
  return runInteractionAction(() => handle.submit(), {
    onSuccess: callbacks.onSubmitSuccess,
    onError: callbacks.onSubmitError,
    unhandledError: options.unhandledError,
  });
}

export function submitInteractionParams<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(
  handle: InteractionHandle<Params, DefaultedKeys>,
  params: Params,
  callbacks: InteractionSubmitCallbacks = {},
  options: { unhandledError?: UnhandledInteractionError } = {},
): Promise<void> {
  return runInteractionAction(() => handle.submit(params), {
    onSuccess: callbacks.onSubmitSuccess,
    onError: callbacks.onSubmitError,
    unhandledError: options.unhandledError,
  });
}
