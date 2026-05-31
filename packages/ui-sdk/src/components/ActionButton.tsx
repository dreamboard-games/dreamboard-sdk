import type {
  ButtonHTMLAttributes,
  ElementType,
  MouseEvent,
  ReactNode,
} from "react";
import type { ButtonSize, ButtonVariant } from "../theme/derive.js";
import type { InteractionVisualState } from "../types/visual-state.js";
import { CostDisplay, type ResourceDefinition } from "./CostDisplay.js";
import { ThemedButton } from "./ThemedButton.js";

export interface ActionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    InteractionVisualState {
  label?: ReactNode;
  description?: ReactNode;
  icon?: ElementType<{ className?: string }>;
  cost?: Record<string, number>;
  currentResources?: Record<string, number>;
  resourceDefs?: ResourceDefinition[];
  available?: boolean;
  disabledReason?: string;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

export function ActionButton({
  label,
  description,
  icon,
  cost,
  currentResources,
  resourceDefs,
  available = true,
  disabledReason,
  loading = false,
  disabled,
  eligible,
  selected,
  invalid,
  submitted,
  previewing,
  intentProgress,
  title,
  variant = "secondary",
  size = "md",
  children,
  onClick,
  ...rest
}: ActionButtonProps) {
  const isDisabled = disabled || loading || !available;
  const Icon = icon;
  const resolvedTitle = title ?? (!available ? disabledReason : undefined);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return;
    onClick?.(event);
  }

  return (
    <ThemedButton
      type="button"
      variant={variant}
      size={size}
      disabled={isDisabled}
      eligible={eligible ?? (available && !isDisabled ? undefined : undefined)}
      selected={selected}
      invalid={invalid}
      submitted={submitted}
      previewing={previewing}
      intentProgress={intentProgress}
      loading={loading}
      title={resolvedTitle}
      onClick={handleClick}
      {...rest}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      <span className="inline-flex min-w-0 flex-col items-start gap-0.5">
        <span>{children ?? label ?? "Action"}</span>
        {description ? (
          <span className="text-xs font-normal opacity-75">{description}</span>
        ) : null}
        {cost && resourceDefs ? (
          <CostDisplay
            cost={cost}
            currentResources={currentResources}
            resourceDefs={resourceDefs}
          />
        ) : null}
      </span>
      {loading ? <span aria-hidden="true">...</span> : null}
    </ThemedButton>
  );
}
