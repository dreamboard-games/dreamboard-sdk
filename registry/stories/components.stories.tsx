import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBack } from "../items/card";
import { PlayingCard } from "../items/playing-card";
import { ImageCard } from "../items/image-card";
import { Pile } from "../items/pile";
import { SquareGrid } from "../items/square-grid";
import { Seat } from "../items/seat";
import { Resources } from "../items/resources";
import { Dice } from "../items/dice";
import { EventLog } from "../items/event-log";
import { Results } from "../items/results";
import { MoveNotices, showMoveNotice } from "../items/move-notice";

const meta = {
  title: "Pure components",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Tokens: Story = {
  render: () => (
    <div className="story-panel">
      <div className="story-swatches">
        {([1, 2, 3, 4, 5, 6] as const).map((seat) => (
          <span key={seat} data-seat={seat}>
            Seat {seat}
          </span>
        ))}
      </div>
      <p>Seat colors supplement visible names and numbers.</p>
    </div>
  ),
};
export const Cards: Story = {
  render: () => (
    <div className="story-row story-table">
      <Card>Voyager</Card>
      <Card state="eligible">Eligible</Card>
      <Card state="selected">Selected</Card>
      <Card state="dimmed">Dimmed</Card>
      <CardBack />
    </div>
  ),
};
export const PlayingCards: Story = {
  render: () => (
    <div className="story-row story-table">
      {(["hearts", "diamonds", "clubs", "spades"] as const).map((suit) => (
        <PlayingCard key={suit} rank="Q" suit={suit} />
      ))}
    </div>
  ),
};
const face = (fill: string, label: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 350"><rect width="250" height="350" rx="14" fill="${fill}"/><text x="125" y="185" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">${label}</text></svg>`,
  )}`;
export const ImageCards: Story = {
  render: () => (
    <div className="story-row story-table">
      <ImageCard src={face("#7552a2", "Fireball")} alt="Fireball" />
      <ImageCard
        src={face("#28734e", "Knight")}
        alt="Knight"
        state="selected"
      />
      <CardBack image={face("#192b35", "Back")} data-testid="back-art" />
    </div>
  ),
};
function SelectableCardExample() {
  const [selected, setSelected] = useState(false);
  return (
    <div className="story-row">
      <button
        className="story-action"
        aria-label="Select ace of hearts"
        aria-pressed={selected}
        onClick={() => setSelected(!selected)}
      >
        <PlayingCard
          rank="A"
          suit="hearts"
          state={selected ? "selected" : "eligible"}
        />
      </button>
      <p>{selected ? "Ace selected" : "Choose a card"}</p>
    </div>
  );
}
export const ComposedSelection: Story = {
  render: () => <SelectableCardExample />,
};
export const Piles: Story = {
  render: () => (
    <div className="story-row story-table">
      <Pile label="Draw pile" count={18}>
        <CardBack />
      </Pile>
      <Pile label="Discard" count={3}>
        <PlayingCard rank="7" suit="clubs" />
      </Pile>
      <Pile label="Tricks" count={0} />
    </div>
  ),
};
export const SquareBoard: Story = {
  render: () => (
    <div className="story-panel">
      <SquareGrid
        label="Checkerboard"
        viewBox="0 0 240 240"
        cellSize={60}
        cells={Array.from({ length: 16 }, (_, i) => ({
          id: String(i),
          x: (i % 4) * 60,
          y: Math.floor(i / 4) * 60,
          fill: ((i % 4) + Math.floor(i / 4)) % 2 === 0 ? "#c4d9dd" : "#718f9a",
        }))}
      >
        <circle
          cx="90"
          cy="90"
          r="19"
          fill="var(--seat-2)"
          stroke="white"
          strokeWidth="3"
        />
      </SquareGrid>
    </div>
  ),
};
export const Seats: Story = {
  render: () => (
    <div className="story-panel story-table grid gap-4">
      <Seat
        playerId="ada"
        name="Ada Lovelace"
        seat={1}
        you
        active
        score="12 pts"
        lastAction="Played the queen of hearts"
      />
      <Seat
        playerId="lin"
        name="Lin"
        seat={2}
        cards={7}
        score="9 pts"
        lastAction="Drew a card"
      />
      <Seat playerId="sam" name="Sam" seat={3} cards={1} score="9 pts" />
    </div>
  ),
};
function NoticeExample() {
  useEffect(() => {
    showMoveNotice("Lin played the 7 of clubs", { seat: 2 });
  }, []);
  return (
    <div className="story-panel story-table">
      <MoveNotices />
      <Button
        className="min-h-11"
        onClick={() => showMoveNotice("Sam drew a card", { seat: 3 })}
      >
        Sam draws
      </Button>
    </div>
  );
}
export const MoveNotice: Story = { render: () => <NoticeExample /> };
export const ResourceCounts: Story = {
  render: () => (
    <div className="story-panel">
      <Resources
        resources={[
          { id: "wood", label: "Wood", count: 4, icon: "◆" },
          { id: "brick", label: "Brick", count: 2, icon: "▰" },
          { id: "grain", label: "Grain", count: 0, icon: "◈" },
        ]}
      />
    </div>
  ),
};
export const DiceResults: Story = {
  render: () => (
    <Dice
      dice={[
        { id: "first", label: "First die", value: 4 },
        { id: "second", label: "Second die", value: 2 },
        { id: "special", label: "Weather die", value: "☀" },
      ]}
    />
  ),
};
export const History: Story = {
  render: () => (
    <div className="story-panel">
      <EventLog
        events={[
          {
            id: "one",
            summary: "Ada played the queen of hearts.",
            detail: "Trick 3",
          },
          { id: "two", summary: "Lin collected the trick.", detail: "4 cards" },
        ]}
      />
      <EventLog events={[]} aria-label="Empty history" />
    </div>
  ),
};
export const GameResults: Story = {
  render: () => (
    <div className="story-panel">
      <Results
        scoreLabel="Points"
        standings={[
          { id: "ada", rank: 1, name: "Ada", score: 24 },
          { id: "lin", rank: 1, name: "Lin", score: 24 },
          { id: "sam", rank: 3, name: "Sam", score: 18 },
        ]}
      >
        <Button className="min-h-11">Play again</Button>
      </Results>
    </div>
  ),
};

export const ConsumerComposition: Story = {
  render: () => (
    <div className="story-panel">
      <div style={{ width: 180 }}>
        <Card
          data-testid="utility-card"
          className="w-full rounded-none shadow-none"
        >
          Owned styles
        </Card>
      </div>
      <SquareGrid
        label="Custom square overlays"
        viewBox="0 0 180 100"
        cellSize={60}
        cells={[{ id: "square", x: 5, y: 5, label: "Square" }]}
      >
        <rect
          data-testid="square-overlay"
          x={95}
          y={5}
          width={60}
          height={60}
          fill="orange"
          stroke="purple"
          strokeWidth={7}
        />
        <text
          data-testid="square-label"
          x={95}
          y={95}
          fill="red"
          fontFamily="monospace"
          fontSize={18}
          pointerEvents="all"
        >
          Overlay
        </text>
      </SquareGrid>
    </div>
  ),
};
