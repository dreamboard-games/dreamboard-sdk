import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
import { Standings, type StandingDisplay } from "./standings";
export type ResultsProps = ComponentProps<"section"> & {
  standings: readonly StandingDisplay[];
  /** Names the first-ranked players by default: "Ada wins", "Ada and Lin tie". */
  title?: string;
  caption?: string;
  scoreLabel?: string;
  /** Actions after the game, such as Play again. */
  children?: ReactNode;
};
/** The end of a game: the winner, then every rank with ties, then what to do next. */
export function Results({
  standings,
  title,
  caption = "Final standings",
  scoreLabel,
  children,
  className = "",
  ...props
}: ResultsProps) {
  const winners = standings
    .filter((row) => row.rank === 1)
    .map((row) => row.name);
  const heading =
    title ??
    `${new Intl.ListFormat("en").format(winners)} ${winners.length > 1 ? "tie" : "wins"}`;
  return (
    <section
      aria-label="Results"
      {...props}
      className={`db-results ${className}`}
    >
      <h2 className="db-results-title">{heading}</h2>
      <Standings
        caption={caption}
        scoreLabel={scoreLabel}
        standings={standings}
      />
      {children && <div className="db-results-actions">{children}</div>}
    </section>
  );
}
