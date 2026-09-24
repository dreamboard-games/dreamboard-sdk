import "./tokens.css";
import { Card, type CardProps } from "./card";
const suits = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" } as const;
export type PlayingCardProps = Omit<CardProps, "children"> & {
  rank: string;
  suit: keyof typeof suits;
};
export function PlayingCard({ rank, suit, ...props }: PlayingCardProps) {
  return (
    <Card
      role="img"
      aria-label={`${rank} of ${suit}`}
      {...props}
      data-suit={suit}
    >
      <span className="db-card-corner" aria-hidden="true">
        {rank}
        <br />
        {suits[suit]}
      </span>
      <span className="db-card-suit" aria-hidden="true">
        {suits[suit]}
      </span>
      <span className="db-card-corner db-card-corner-bottom" aria-hidden="true">
        {rank}
        <br />
        {suits[suit]}
      </span>
    </Card>
  );
}
