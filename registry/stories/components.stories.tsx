import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Card, CardBack } from "../items/card";
import { PlayingCard } from "../items/playing-card";
import { Pile } from "../items/pile";
import { HexGrid } from "../items/hex-grid";
import { SquareGrid } from "../items/square-grid";
import { Players } from "../items/players";
import { Resources } from "../items/resources";
import { Dice } from "../items/dice";
import { EventLog } from "../items/event-log";
import { Standings } from "../items/standings";

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
      <Card state="invalid">Invalid</Card>
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
export const HexBoard: Story = {
  render: () => (
    <div className="story-panel">
      <HexGrid
        label="Two hex terrain tiles"
        viewBox="0 0 210 110"
        tiles={[
          {
            id: "forest",
            points: "5,30 45,7 85,30 85,76 45,99 5,76",
            center: { x: 45, y: 53 },
            fill: "#accdb8",
            label: "Forest",
          },
          {
            id: "hills",
            points: "85,30 125,7 165,30 165,76 125,99 85,76",
            center: { x: 125, y: 53 },
            fill: "#e1c5a9",
            label: "Hills",
          },
        ]}
      >
        <circle cx="85" cy="30" r="6" fill="var(--seat-1)" />
      </HexGrid>
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
export const PlayerList: Story = {
  render: () => (
    <div className="story-panel">
      <Players
        players={[
          {
            id: "ada",
            name: "Ada",
            seat: 1,
            status: "Your turn",
            detail: "12 points",
          },
          {
            id: "lin",
            name: "Lin",
            seat: 2,
            status: "Waiting",
            detail: "9 points",
          },
          {
            id: "sam",
            name: "Sam",
            seat: 3,
            status: "Ready",
            detail: "9 points",
          },
        ]}
      />
    </div>
  ),
};
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
export const Results: Story = {
  render: () => (
    <div className="story-panel">
      <Standings
        caption="Final standings"
        standings={[
          { id: "ada", rank: 1, name: "Ada", score: 24 },
          { id: "lin", rank: 2, name: "Lin", score: 18 },
          { id: "sam", rank: 2, name: "Sam", score: 18 },
        ]}
      />
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
      <HexGrid
        label="Custom hex overlays"
        viewBox="0 0 180 100"
        tiles={[
          {
            id: "hex",
            points: "5,30 45,7 85,30 85,76 45,99 5,76",
            center: { x: 45, y: 53 },
            label: "Hex",
          },
        ]}
      >
        <polygon
          data-testid="hex-overlay"
          points="100,10 170,10 170,80"
          fill="orange"
          stroke="purple"
          strokeWidth={7}
        />
        <text
          data-testid="hex-label"
          x={100}
          y={95}
          fill="red"
          fontFamily="monospace"
          fontSize={18}
          pointerEvents="all"
        >
          Overlay
        </text>
      </HexGrid>
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
