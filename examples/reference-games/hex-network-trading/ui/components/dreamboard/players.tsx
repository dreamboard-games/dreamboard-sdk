import { cn } from "cn";
import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
export type PlayerDisplay = {
  id: string;
  name: string;
  seat: 1 | 2 | 3 | 4 | 5 | 6;
  status?: string;
  detail?: ReactNode;
};
export type PlayersProps = ComponentProps<"ul"> & {
  players: readonly PlayerDisplay[];
};
export function Players({ players, className = "", ...props }: PlayersProps) {
  return (
    <ul
      aria-label="Players"
      {...props}
      className={cn("db-players m-0 grid list-none gap-3 p-0", className)}
    >
      {players.map((player) => (
        <li
          className="flex items-center gap-3"
          key={player.id}
          data-seat={player.seat}
        >
          <span
            className="db-seat-mark h-[1.7rem] w-[0.7rem] rounded bg-[var(--seat-color)]"
            aria-hidden="true"
          />
          <span>
            <strong>{player.name}</strong>
            {player.status && (
              <small className="mt-1 block text-muted-foreground">
                {player.status}
              </small>
            )}
          </span>
          {player.detail && (
            <span className="db-player-detail ms-auto tabular-nums">
              {player.detail}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
