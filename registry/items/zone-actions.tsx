import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";
import "./tokens.css";
import "./zone-actions.css";

export interface ZoneActionsProps {
  label: string;
  /** Authored controls; use Popover.Close to close after choosing an action. */
  children: ReactNode;
  /** Layout classes for the title button. */
  className?: string;
}

/** Put directly inside a data-zone-actions-root element to highlight its zone. */
export function ZoneActions({
  label,
  children,
  className = "",
}: ZoneActionsProps) {
  return (
    <Popover.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Popover.Trigger
              render={
                <button
                  type="button"
                  className={`db-zone-actions-title ${className}`}
                  aria-label={`${label} actions`}
                />
              }
            />
          }
        >
          {label}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6} className="z-50">
            <Tooltip.Popup className="db-zone-actions-tooltip">
              {label} actions
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Popover.Portal>
        <Popover.Positioner
          side="top"
          sideOffset={8}
          collisionPadding={8}
          className="z-50"
        >
          <Popover.Popup
            initialFocus
            className="db-card-actions"
            aria-label={`${label} actions`}
          >
            <Popover.Arrow className="db-card-action-arrow" />
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
