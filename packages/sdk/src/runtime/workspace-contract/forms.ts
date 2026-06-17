import type { ReactElement, ReactNode } from "react";
import { createElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/components.js";
import type {
  InteractionDialogProps,
  InteractionFormPrimitiveProps,
  InteractionStateProps,
  InteractionSubmitProps,
  InteractionTriggerProps,
} from "../primitives/index.js";
import { createFormInputSlot } from "./slots.js";
import type {
  WorkspaceContractContext,
  WorkspaceInteractionFormDescriptor,
  WorkspaceInteractionFormsDescriptor,
} from "./types.js";

export interface WorkspaceInteractionFormDialogProps extends Omit<
  InteractionDialogProps,
  "children"
> {
  title: ReactNode;
  description?: ReactNode;
  trigger?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
}

/**
 * Builds the interaction-form surface pieces and the `Interaction` namespace
 * for one workspace contract. Called once per `createWorkspaceUIContract`
 * invocation so `InteractionRoutes` keeps a stable component identity.
 */
export function createInteractionForms<Card>(
  ctx: WorkspaceContractContext<Card>,
) {
  const { options, baseUI, runtimeInteraction, withInteractionRoot } = ctx;

  function InteractionRoutes({
    routes,
    fallback,
    includeUnavailable,
  }: {
    routes: Record<
      string,
      {
        collect: Record<string, unknown>;
      }
    >;
    fallback?: ReactNode;
    includeUnavailable?: boolean | null;
  }): ReactElement {
    return createElement(runtimeInteraction.Routes, {
      routes,
      fallback,
      includeUnavailable,
    });
  }

  function GeneratedFormDialog({
    title,
    description,
    trigger,
    children,
    contentClassName,
    overlayClassName,
    showCloseButton,
    defaultOpen,
    onStateChange,
  }: WorkspaceInteractionFormDialogProps) {
    return createElement(baseUI.Interaction.Dialog, {
      defaultOpen,
      onStateChange,
      children: (state) =>
        createElement(
          Dialog,
          { open: state.open, onOpenChange: state.setOpen },
          trigger
            ? createElement(DialogTrigger, {
                asChild: true,
                children: trigger,
              })
            : null,
          createElement(
            DialogContent,
            {
              className: contentClassName,
              overlayClassName,
              showCloseButton,
            },
            createElement(
              DialogHeader,
              null,
              createElement(DialogTitle, null, title),
              description
                ? createElement(DialogDescription, null, description)
                : null,
            ),
            children,
          ),
        ),
    });
  }

  function useInteractionFormSurface(interaction: string) {
    const validInputs = options.formInputKeysForInteraction(interaction);
    const slot = Object.fromEntries(
      [...validInputs].map((input) => [
        input,
        createFormInputSlot(ctx, input, interaction),
      ]),
    );
    return {
      Root: ({ children }: { children?: ReactNode }) =>
        withInteractionRoot(interaction, children),
      Form: (props: InteractionFormPrimitiveProps) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.Form, props),
        ),
      Dialog: (props: WorkspaceInteractionFormDialogProps) =>
        withInteractionRoot(
          interaction,
          createElement(GeneratedFormDialog, props),
        ),
      State: (props: InteractionStateProps) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.State, props),
        ),
      Arm: (props: InteractionTriggerProps) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.Trigger, props),
        ),
      Submit: (props: InteractionSubmitProps) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.Submit, props),
        ),
      Field: ({ input, ...props }: { input: string; children?: ReactNode }) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.Field, {
            ...props,
            input: input as never,
          }),
        ),
      slot,
    };
  }

  const Interaction = {
    State: baseUI.Interaction.State,
    Dialog: baseUI.Interaction.Dialog,
    useForm: useInteractionFormSurface,
    form<const Interaction extends string>(
      interaction: Interaction,
    ): WorkspaceInteractionFormDescriptor<Interaction> {
      return { kind: "form", interaction };
    },
    forms<const Interactions extends Readonly<Record<string, string>>>(
      interactions: Interactions,
    ): WorkspaceInteractionFormsDescriptor<Interactions> {
      return { kind: "forms", interactions };
    },
    Routes: InteractionRoutes,
  };

  return { Interaction, useInteractionFormSurface };
}
