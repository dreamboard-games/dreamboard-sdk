import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  SlotSystem,
  DefaultSlotItem,
  type SlotDefinition,
} from "../components/board/SlotSystem.js";

type TargetState = "eligible" | "selected" | "claimed" | "disabled";

const slots: SlotDefinition[] = [
  { id: "field", name: "Field", description: "Grow crops", capacity: 1 },
  { id: "forest", name: "Forest", description: "Gather wood", capacity: 1 },
  { id: "mine", name: "Mine", description: "Mine stone", capacity: 1 },
  { id: "market", name: "Market", description: "Trade", capacity: 1 },
];

interface BoardTargetStageProps {
  states: Record<string, TargetState>;
}

function BoardTargetStage({ states }: BoardTargetStageProps) {
  const [selected, setSelected] = useState<string | null>(
    () =>
      Object.entries(states).find(([, state]) => state === "selected")?.[0] ??
      null,
  );
  const occupants = Object.entries(states)
    .filter(([, s]) => s === "claimed")
    .map(([slotId]) => ({
      pieceId: `c-${slotId}`,
      playerId: "p1",
      slotId,
    }));
  return (
    <SlotSystem
      slots={slots}
      occupants={occupants}
      layout="grid"
      renderSlot={(slot) => {
        const target = states[slot.id] ?? "disabled";
        return (
          <DefaultSlotItem
            key={slot.id}
            name={slot.name}
            description={slot.description}
            capacity={slot.capacity}
            occupantCount={target === "claimed" ? 1 : 0}
            isAvailable={target === "eligible" || target === "selected"}
            isHighlighted={target === "eligible"}
            isSelected={selected === slot.id}
            onClick={() => {
              if (target !== "disabled" && target !== "claimed") {
                setSelected((cur) => (cur === slot.id ? null : slot.id));
              }
            }}
          />
        );
      }}
    />
  );
}

const meta: Meta<typeof BoardTargetStage> = {
  title: "Board/Targets",
  component: BoardTargetStage,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof BoardTargetStage>;

export const EligibleTargets: Story = {
  args: {
    states: {
      field: "eligible",
      forest: "eligible",
      mine: "disabled",
      market: "disabled",
    },
  },
};

export const SelectedTarget: Story = {
  args: {
    states: {
      field: "selected",
      forest: "eligible",
      mine: "disabled",
      market: "claimed",
    },
  },
};

export const ClaimedAndDisabled: Story = {
  args: {
    states: {
      field: "claimed",
      forest: "eligible",
      mine: "disabled",
      market: "claimed",
    },
  },
};

export const AllDisabled: Story = {
  args: {
    states: {
      field: "disabled",
      forest: "disabled",
      mine: "disabled",
      market: "disabled",
    },
  },
};
