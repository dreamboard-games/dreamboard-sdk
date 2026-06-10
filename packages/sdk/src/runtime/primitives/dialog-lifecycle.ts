import { useCallback, useMemo, useState } from "react";

export type DialogLifecycleState = "open" | "minimized" | "dismissed";

export interface DialogLifecycleValue {
  state: DialogLifecycleState;
  open: boolean;
  minimized: boolean;
  dismissed: boolean;
  setOpen: (open: boolean) => void;
  restore: () => void;
  minimize: () => void;
  dismiss: () => void;
}

export interface DialogLifecycleOptions {
  defaultOpen?: boolean;
  onStateChange?: (state: DialogLifecycleState) => void;
}

export function useDialogLifecycle({
  defaultOpen = true,
  onStateChange,
}: DialogLifecycleOptions): DialogLifecycleValue {
  const [state, setState] = useState<DialogLifecycleState>(
    defaultOpen ? "open" : "minimized",
  );
  const updateState = useCallback(
    (nextState: DialogLifecycleState) => {
      setState(nextState);
      onStateChange?.(nextState);
    },
    [onStateChange],
  );
  const restore = useCallback(() => updateState("open"), [updateState]);
  const minimize = useCallback(() => updateState("minimized"), [updateState]);
  const dismiss = useCallback(() => updateState("dismissed"), [updateState]);
  const setOpen = useCallback(
    (open: boolean) => {
      updateState(open ? "open" : "minimized");
    },
    [updateState],
  );

  return useMemo<DialogLifecycleValue>(
    () => ({
      state,
      open: state === "open",
      minimized: state === "minimized",
      dismissed: state === "dismissed",
      setOpen,
      restore,
      minimize,
      dismiss,
    }),
    [dismiss, minimize, restore, setOpen, state],
  );
}
