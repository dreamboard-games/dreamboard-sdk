import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import { CardFace, type CardFaceProps } from "../components/Card.js";
import type { ViewCard } from "@dreamboard-games/sdk-types";

const baseCard: ViewCard = {
  id: "spark",
  cardType: "spell",
  name: "Spark",
  properties: {
    icon: "✨",
    title: "Spark",
    subtitle: "Quick spell",
    effect: "Deal 1 damage to any target.",
    cost: "1 mana",
  },
};

const meta: Meta<typeof CardFace> = {
  title: "Cards/CardFace",
  component: CardFace,
  args: { card: baseCard },
  parameters: {
    // `centered` clips the eligible/selected hard-offset shadow on the
    // bottom-right edge. `padded` gives the accent shadow + outline room.
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          padding: 24,
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CardFace>;

function InteractiveControlledCardFace(args: CardFaceProps) {
  const [selected, setSelected] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setSelected((s) => !s)}
      data-testid="select-toggle"
      style={{
        background: "transparent",
        border: 0,
        padding: 0,
        cursor: "pointer",
      }}
    >
      <CardFace {...args} selected={selected} eligible />
    </button>
  );
}

export const DefaultContent: Story = {};

export const AuthoredContent: Story = {
  args: {
    renderContent: (card) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: 8,
          textAlign: "center",
        }}
      >
        <strong>{card.name}</strong>
        <em>Custom-rendered slot</em>
      </div>
    ),
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="sb-stage sb-stage--row" style={{ alignItems: "flex-end" }}>
      <CardFace {...args} size="sm" />
      <CardFace {...args} size="md" />
      <CardFace {...args} size="lg" />
    </div>
  ),
};

export const FaceDown: Story = { args: { faceDown: true } };

export const Eligible: Story = { args: { eligible: true } };
export const Selected: Story = { args: { selected: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { invalid: true } };
export const Submitted: Story = { args: { submitted: true } };
export const Previewing: Story = { args: { previewing: true } };

export const IntentProgress: Story = {
  args: {
    eligible: true,
    intentProgress: 0.6,
  },
};

export const IntentProgressFull: Story = {
  args: { eligible: true, previewing: true, intentProgress: 1 },
};

export const InteractiveControlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A controlled story that locally tracks selection — verifies that emitted intent does not require a runtime adapter.",
      },
    },
  },
  render: (args) => <InteractiveControlledCardFace {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId("select-toggle");
    const card = button.querySelector("[data-dreamboard-card-face]");
    expect(card).toBeTruthy();
    expect(card?.getAttribute("data-selected")).toBeNull();
    await userEvent.click(button);
    expect(card?.getAttribute("data-selected")).toBe("true");
    await userEvent.click(button);
    expect(card?.getAttribute("data-selected")).toBeNull();
  },
};

export const StateAttributesPresent: Story = {
  name: "Visual state attributes — invariant",
  args: {
    eligible: true,
    selected: true,
    invalid: true,
    submitted: true,
    previewing: true,
    intentProgress: 0.5,
  },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector("[data-dreamboard-card-face]");
    expect(card).toBeTruthy();
    expect(card?.getAttribute("data-eligible")).toBe("true");
    expect(card?.getAttribute("data-selected")).toBe("true");
    expect(card?.getAttribute("data-invalid")).toBe("true");
    expect(card?.getAttribute("data-submitted")).toBe("true");
    expect(card?.getAttribute("data-previewing")).toBe("true");
    expect(card?.getAttribute("data-intent-progress")).toBe("0.5");
  },
};
