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
    <ul aria-label="Players" {...props} className={`db-players ${className}`}>
      {players.map((player) => (
        <li key={player.id} data-seat={player.seat}>
          <span className="db-seat-mark" aria-hidden="true" />
          <span>
            <strong>{player.name}</strong>
            {player.status && <small>{player.status}</small>}
          </span>
          {player.detail && (
            <span className="db-player-detail">{player.detail}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
