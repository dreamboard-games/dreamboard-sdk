/** Shows resource costs with affordability indication (green/red). */

import { clsx } from "clsx";
import type { ComponentType } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../internal/ui/tooltip.js";

export interface ResourceDefinition {
  type: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  color?: string;
}

export interface CostDisplayProps {
  /** Cost requirements keyed by resource type */
  cost: Record<string, number>;
  /** Current resources to check affordability */
  currentResources?: Record<string, number>;
  resourceDefs: ResourceDefinition[];
  size?: "sm" | "md";
  layout?: "inline" | "stacked";
  className?: string;
}
export function CostDisplay({
  cost,
  currentResources,
  resourceDefs,
  size = "sm",
  layout = "inline",
  className,
}: CostDisplayProps) {
  const resourceMap = Object.fromEntries(resourceDefs.map((r) => [r.type, r]));

  const sizeClasses = {
    sm: { icon: "w-3 h-3", text: "text-xs", gap: "gap-0.5" },
    md: { icon: "w-4 h-4", text: "text-sm", gap: "gap-1" },
  };

  const styles = sizeClasses[size];

  // Calculate total affordability for aria label
  const canAffordAll =
    !currentResources ||
    Object.entries(cost).every(
      ([type, amount]) => (currentResources[type] ?? 0) >= amount,
    );

  const costEntries = Object.entries(cost).filter(
    ([, amount]) => amount !== undefined && amount > 0,
  );

  if (costEntries.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx(
        "flex",
        styles.gap,
        layout === "stacked" && "flex-col",
        layout === "inline" && "flex-row flex-wrap items-center",
        className,
      )}
      role="list"
      aria-label={`Cost: ${costEntries.map(([type, amount]) => `${amount} ${resourceMap[type]?.label || type}`).join(", ")}${currentResources ? (canAffordAll ? " (affordable)" : " (cannot afford)") : ""}`}
    >
      <TooltipProvider delayDuration={200}>
        {costEntries.map(([type, amount]) => {
          const def = resourceMap[type];
          const have = currentResources?.[type] ?? Infinity;
          const canAfford = have >= amount;
          const Icon = def?.icon;
          const label = def?.label || type;

          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <div
                  className={clsx(
                    "flex cursor-help items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                    styles.gap,
                    styles.text,
                    currentResources && !canAfford && "text-red-400",
                    currentResources && canAfford && "text-green-400",
                    !currentResources && "text-slate-300",
                  )}
                  role="listitem"
                  tabIndex={0}
                >
                  {Icon && <Icon className={styles.icon} aria-hidden="true" />}
                  <span className="font-semibold">{amount}</span>
                  {!Icon && (
                    <span className="text-[10px] opacity-70">
                      {def?.label?.slice(0, 3) || type.slice(0, 3)}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="max-w-xs text-left"
              >
                <p className="font-sans text-sm font-bold">{label}</p>
                <p className="font-sans mt-1 text-xs font-normal opacity-90">
                  {formatCostAvailability({
                    amount,
                    canAfford,
                    have,
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}

/** Second line under the resource name — avoids repeating {@link label} in the tooltip. */
function formatCostAvailability({
  amount,
  canAfford,
  have,
}: {
  amount: number;
  canAfford: boolean;
  have: number;
}) {
  if (!Number.isFinite(have)) {
    return `Cost: ${amount}.`;
  }

  const missing = Math.max(0, amount - have);
  return canAfford
    ? `Cost: ${amount}. You have ${have}.`
    : `Cost: ${amount}. You have ${have}; short by ${missing}.`;
}
