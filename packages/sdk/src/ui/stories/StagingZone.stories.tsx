import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { useMemo } from "react";
import type { ViewCard } from "@dreamboard-games/sdk-types";
import { CardFace } from "../components/Card.js";
import {
  StagingZone,
  type StagingZoneProps,
} from "../components/StagingZone.js";

function makeCards(count: number): ViewCard[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    cardType: "spell",
    name: `Card ${i + 1}`,
    properties: { title: `Card ${i + 1}`, subtitle: "Spell" },
  }));
}

interface StageProps extends Partial<StagingZoneProps> {
  staged?: number;
  slotCount?: number;
}

function Stage({ staged = 2, slotCount = 3, onRemove }: StageProps) {
  const cards = useMemo(() => makeCards(staged), [staged]);
  return (
    <div className="sb-stage" style={{ minHeight: 220 }}>
      <StagingZone
        cards={cards}
        slotCount={slotCount}
        size="sm"
        label="Passing to Player 2"
        renderCard={(card) => <CardFace card={card} size="sm" />}
        onRemove={onRemove}
      />
    </div>
  );
}

const meta: Meta<typeof Stage> = {
  title: "Hand/StagingZone",
  component: Stage,
};
export default meta;
type Story = StoryObj<typeof Stage>;

export const Empty: Story = {
  name: "Empty (always-visible slots)",
  args: { staged: 0, slotCount: 3 },
  play: async ({ canvasElement }) => {
    const empties = canvasElement.querySelectorAll(
      '[data-dreamboard-staging-slot="empty"]',
    );
    expect(empties.length).toBe(3);
  },
};

export const Partial: Story = { args: { staged: 2, slotCount: 3 } };

export const Full: Story = { args: { staged: 3, slotCount: 3 } };

export const RemovesOnClick: Story = {
  name: "Tapping a staged card removes it",
  args: { staged: 3, slotCount: 3, onRemove: fn() },
  play: async ({ canvasElement, args }) => {
    const filled = canvasElement.querySelectorAll<HTMLButtonElement>(
      '[data-dreamboard-staging-slot="filled"]',
    );
    expect(filled.length).toBe(3);
    await userEvent.click(filled[0]!);
    expect(args.onRemove).toHaveBeenCalledTimes(1);
    expect(args.onRemove).toHaveBeenCalledWith("c0");
  },
};
