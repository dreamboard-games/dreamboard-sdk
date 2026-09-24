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
      className={`db-event-log ${className}`}
    >
      {events.length === 0 ? (
        <li className="db-empty">{emptyMessage}</li>
      ) : (
        events.map((event) => (
          <li key={event.id}>
            <span>{event.summary}</span>
            {event.detail && <small>{event.detail}</small>}
          </li>
        ))
      )}
    </ol>
  );
}
