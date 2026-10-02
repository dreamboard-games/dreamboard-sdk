import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
export type SeatNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type SeatProps = ComponentProps<"section"> & {
  /** Marks the seat `data-player`, so cards to and from this player move from here. */
  playerId: string;
  name: string;
  seat: SeatNumber;
  /** Whose turn it is: draws the turn ring. */
  active?: boolean;
  you?: boolean;
  /** Cards this player holds face down. */
  cards?: number;
  score?: ReactNode;
  lastAction?: string;
  /** An image or emoji; the name's initials otherwise. */
  avatar?: ReactNode;
};
/**
 * One player at the table: avatar, name, held cards, score, turn ring and
 * last action. Children, such as the player's public cards, go below.
 */
export function Seat({
  playerId,
  name,
  seat,
  active = false,
  you = false,
  cards,
  score,
  lastAction,
  avatar,
  className = "",
  children,
  ...props
}: SeatProps) {
  return (
    <section
      aria-label={you ? `${name} (you)` : name}
      {...props}
      data-player={playerId}
      data-seat={seat}
      data-active={active || undefined}
      className={`db-seat ${className}`}
    >
      <span className="db-seat-avatar" aria-hidden="true">
        {avatar ??
          name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase()}
      </span>
      <p className="db-seat-name">
        {name}
        {you && <span className="db-seat-you"> · You</span>}
        {active && (
          <span className="sr-only">{you ? "your turn" : "their turn"}</span>
        )}
      </p>
      {score !== undefined && <span className="db-seat-score">{score}</span>}
      {cards !== undefined && (
        <span className="db-seat-cards">
          <span className="db-seat-backs" aria-hidden="true">
            {Array.from({ length: Math.min(cards, 3) }, (_, index) => (
              <span key={index} />
            ))}
          </span>
          {cards}
          <span className="sr-only"> {cards === 1 ? "card" : "cards"}</span>
        </span>
      )}
      {lastAction && (
        // A new action remounts, so it fades in.
        <p key={lastAction} className="db-seat-action">
          {lastAction}
        </p>
      )}
      {children && <div className="db-seat-more">{children}</div>}
    </section>
  );
}
