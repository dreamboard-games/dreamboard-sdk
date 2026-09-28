import { cn } from "cn";
import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
export type EventDisplay = { id: string; summary: string; detail?: ReactNode };
export type EventLogProps = ComponentProps<"ol"> & {
  events: readonly EventDisplay[];
  emptyMessage?: string;
};
/** Static history: the caller decides whether newly appended events need announcements. */
export function EventLog({
  events,
  emptyMessage = "No moves yet.",
  className = "",
  ...props
}: EventLogProps) {
  return (
    <ol
      aria-label="Game events"
      {...props}
      className={cn("db-event-log m-0 list-none p-0", className)}
    >
      {events.length === 0 ? (
        <li className="db-empty border-b border-border py-3 text-muted-foreground">
          {emptyMessage}
        </li>
      ) : (
        events.map((event) => (
          <li className="border-b border-border py-3" key={event.id}>
            <span>{event.summary}</span>
            {event.detail && (
              <small className="mt-1 block text-muted-foreground">
                {event.detail}
              </small>
            )}
          </li>
        ))
      )}
    </ol>
  );
}
