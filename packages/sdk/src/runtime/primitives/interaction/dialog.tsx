import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  usePendingInteractionKey,
  usePendingInteractionRevision,
} from "../../context/InteractionDraftContext.js";
import type { InteractionKey } from "../../ui-contract.js";
import {
  useDialogLifecycle,
  type DialogLifecycleState,
} from "../../../ui/primitives/dialog-lifecycle.js";
import { useInteractionPrimitiveContext } from "./context.js";

export type InteractionDialogState = DialogLifecycleState;

export interface InteractionDialogRenderState<
  Interaction extends string = InteractionKey,
> {
  interaction: Interaction;
  state: InteractionDialogState;
  open: boolean;
  minimized: boolean;
  dismissed: boolean;
  setOpen: (open: boolean) => void;
  restore: () => void;
  minimize: () => void;
  dismiss: () => void;
}

export interface InteractionDialogProps<
  Interaction extends string = InteractionKey,
> {
  defaultOpen?: boolean;
  onStateChange?: (state: InteractionDialogState) => void;
  children: (state: InteractionDialogRenderState<Interaction>) => ReactNode;
}

export function InteractionDialog<Interaction extends string = InteractionKey>({
  defaultOpen = false,
  onStateChange,
  children,
}: InteractionDialogProps<Interaction>) {
  const { interaction } = useInteractionPrimitiveContext();
  const pendingInteractionKey = usePendingInteractionKey();
  const pendingInteractionRevision = usePendingInteractionRevision();
  const lifecycle = useDialogLifecycle({ defaultOpen, onStateChange });
  const restoredRevisionRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      pendingInteractionKey === interaction &&
      restoredRevisionRef.current !== pendingInteractionRevision
    ) {
      restoredRevisionRef.current = pendingInteractionRevision;
      lifecycle.restore();
    }
  }, [
    interaction,
    lifecycle,
    pendingInteractionKey,
    pendingInteractionRevision,
  ]);
  const renderState = useMemo<InteractionDialogRenderState<Interaction>>(
    () => ({
      interaction: interaction as Interaction,
      ...lifecycle,
    }),
    [interaction, lifecycle],
  );
  return <>{children(renderState)}</>;
}
