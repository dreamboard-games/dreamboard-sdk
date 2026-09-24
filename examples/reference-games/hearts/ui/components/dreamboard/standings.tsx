import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
export type StandingDisplay = {
  id: string;
  rank: number;
  name: string;
  score: ReactNode;
};
export type StandingsProps = ComponentProps<"table"> & {
  standings: readonly StandingDisplay[];
  caption: string;
  scoreLabel?: string;
};
/** Preserve the supplied order and rank, including ties; never infer a winner. */
export function Standings({
  standings,
  caption,
  scoreLabel = "Score",
  className = "",
  ...props
}: StandingsProps) {
  return (
    <table {...props} className={`db-standings ${className}`}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Player</th>
          <th scope="col">{scoreLabel}</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((row) => (
          <tr key={row.id}>
            <td>{row.rank}</td>
            <th scope="row">{row.name}</th>
            <td>{row.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
