import {
  Fragment,
  createContext,
  useContext,
  useMemo,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useSeatInbox } from "../hooks/useSeatInbox.js";
import type { PromptKey, PromptOptionKey } from "../ui-contract.js";
import type {
  InteractionDescriptor,
  InteractionContextOption,
} from "../types/plugin-state.js";
import { interactionInputKeys } from "../utils/interaction-inputs.js";
import { interactionLabel } from "../utils/interaction-labels.js";
import { isInteractionAvailable } from "../utils/interaction-status.js";
import {
  InteractionDescription,
  InteractionLabel,
  InteractionRoot,
  useInteractionPrimitiveContext,
  type InteractionPartProps,
  type InteractionRootProps,
} from "./interaction.js";
import {
  composeEventHandlers,
  renderPrimitive,
  type PrimitiveCommonProps,
} from "./primitive-props.js";
import {
  submitInteractionParams,
  type InteractionSubmitCallbacks,
} from "./interaction-submit.js";
import {
  useDialogLifecycle,
  type DialogLifecycleState,
} from "./dialog-lifecycle.js";
import { useGameActionError } from "./game.js";

export type PromptRootProps<Prompt extends string = PromptKey> =
  InteractionRootProps<Prompt>;

export function PromptRoot<Prompt extends string = PromptKey>(
  props: PromptRootProps<Prompt>,
) {
  return <InteractionRoot {...props} />;
}

export function PromptTitle(props: InteractionPartProps) {
  const { descriptor } = useInteractionPrimitiveContext();
  const context =
    descriptor?.kind === "prompt" ? descriptor.context : undefined;
  return (
    <InteractionLabel {...props}>
      {props.children ??
        context?.title ??
        (descriptor ? interactionLabel(descriptor) : undefined)}
    </InteractionLabel>
  );
}

export function PromptMessage(props: InteractionPartProps) {
  const { descriptor } = useInteractionPrimitiveContext();
  const context =
    descriptor?.kind === "prompt" ? descriptor.context : undefined;
  const message =
    props.children ??
    (typeof context?.payload?.message === "string"
      ? context.payload.message
      : undefined);
  if (!message) return null;
  return <InteractionDescription {...props}>{message}</InteractionDescription>;
}

export type PromptOptionProps<Option extends string = PromptOptionKey> =
  PrimitiveCommonProps &
    ButtonHTMLAttributes<HTMLButtonElement> & {
      value: Option;
      disableWhenUnavailable?: boolean;
      onSubmitError?: InteractionSubmitCallbacks["onSubmitError"];
      onSubmitSuccess?: InteractionSubmitCallbacks["onSubmitSuccess"];
    };

export function PromptOption<Option extends string = PromptOptionKey>({
  value,
  disabled,
  disableWhenUnavailable = false,
  onClick,
  onSubmitError,
  onSubmitSuccess,
  children,
  ...props
}: PromptOptionProps<Option>) {
  const { descriptor, handle } = useInteractionPrimitiveContext();
  const gameActionError = useGameActionError();
  const context =
    descriptor?.kind === "prompt" ? descriptor.context : undefined;
  const option = context?.options?.find((candidate) => candidate.id === value);
  const inputKey = descriptor ? interactionInputKeys(descriptor)[0] : undefined;
  const choice = descriptor?.inputs.find(
    (input) => input.key === inputKey,
  )?.domain;
  const optionChoice =
    choice?.type === "choice"
      ? choice.choices?.find((candidate) => candidate.value === value)
      : undefined;
  const isDisabled =
    disabled ??
    (!handle ||
      !inputKey ||
      handle.status !== "open" ||
      optionChoice?.disabled === true ||
      (disableWhenUnavailable && !isInteractionAvailable(descriptor)));
  return renderPrimitive("button", {
    type: "button",
    ...props,
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    "data-dreamboard-prompt-option": "",
    "data-option-value": value,
    "data-disabled": isDisabled || undefined,
    "data-available": isInteractionAvailable(descriptor),
    "data-disabled-reason": optionChoice?.disabledReason,
    title: props.title ?? optionChoice?.disabledReason,
    onClick: composeEventHandlers(onClick, () => {
      if (!handle || !inputKey || isDisabled) return;
      void submitInteractionParams(
        handle,
        { [inputKey]: value },
        {
          onSubmitSuccess,
          onSubmitError: onSubmitError ?? gameActionError ?? undefined,
        },
        { unhandledError: "log" },
      );
    }),
    children: children ?? option?.label ?? value,
  });
}

export interface PromptOptionRenderItem {
  id: string;
  label?: string;
}

export interface PromptOptionsProps {
  children: (option: PromptOptionRenderItem) => ReactNode;
}

export function PromptOptions({ children }: PromptOptionsProps) {
  const { descriptor } = useInteractionPrimitiveContext();
  const options: readonly InteractionContextOption[] =
    descriptor?.kind === "prompt" ? (descriptor.context.options ?? []) : [];
  return (
    <>
      {options.map((option) => (
        <Fragment key={option.id}>{children(option)}</Fragment>
      ))}
    </>
  );
}

export type PromptDialogState = DialogLifecycleState;

export interface PromptDialogRenderState<Prompt extends string = PromptKey> {
  prompt: Prompt;
  state: PromptDialogState;
  open: boolean;
  minimized: boolean;
  dismissed: boolean;
  setOpen: (open: boolean) => void;
  restore: () => void;
  minimize: () => void;
  dismiss: () => void;
}

export interface PromptDialogProps<Prompt extends string = PromptKey> {
  prompt: Prompt;
  defaultOpen?: boolean;
  onStateChange?: (state: PromptDialogState) => void;
  children: (state: PromptDialogRenderState<Prompt>) => ReactNode;
}

export function PromptDialog<Prompt extends string = PromptKey>({
  prompt,
  defaultOpen = true,
  onStateChange,
  children,
}: PromptDialogProps<Prompt>) {
  const lifecycle = useDialogLifecycle({ defaultOpen, onStateChange });
  const renderState = useMemo<PromptDialogRenderState<Prompt>>(
    () => ({
      prompt,
      ...lifecycle,
    }),
    [lifecycle, prompt],
  );
  return <>{children(renderState)}</>;
}

interface PromptInboxContextValue {
  prompts: readonly InteractionDescriptor[];
}

const PromptInboxContext = createContext<PromptInboxContextValue | null>(null);

function usePromptInboxContext(): PromptInboxContextValue {
  const value = useContext(PromptInboxContext);
  if (!value) {
    throw new Error(
      "PromptInbox primitives must be rendered inside <PromptInbox.Root>.",
    );
  }
  return value;
}

export function PromptInboxRoot({ children }: { children: ReactNode }) {
  const inbox = useSeatInbox();
  return (
    <PromptInboxContext.Provider value={{ prompts: inbox.prompts }}>
      {children}
    </PromptInboxContext.Provider>
  );
}

export function PromptInboxEmpty({ children }: { children?: ReactNode }) {
  const { prompts } = usePromptInboxContext();
  if (prompts.length > 0) return null;
  return <>{children}</>;
}

export interface PromptInboxItemsProps {
  children: (prompt: InteractionDescriptor) => ReactNode;
}

export function PromptInboxItems({ children }: PromptInboxItemsProps) {
  const { prompts } = usePromptInboxContext();
  return <>{prompts.map((prompt) => children(prompt))}</>;
}

export const Prompt = {
  Root: PromptRoot,
  Title: PromptTitle,
  Message: PromptMessage,
  Option: PromptOption,
  Options: PromptOptions,
  Dialog: PromptDialog,
};

export const PromptInbox = {
  Root: PromptInboxRoot,
  Empty: PromptInboxEmpty,
  Items: PromptInboxItems,
};
