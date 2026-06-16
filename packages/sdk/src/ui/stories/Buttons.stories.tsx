import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useState } from "react";
import { Pickaxe, Sword } from "lucide-react";
import { ThemedButton } from "../components/ThemedButton.js";
import { ActionButton } from "../components/ActionButton.js";
import { PrimaryActionButton } from "../components/PrimaryActionButton.js";

interface ButtonStoryArgs {
  handler?: ReturnType<typeof fn>;
}

const meta: Meta<ButtonStoryArgs> = {
  title: "Buttons",
  parameters: {
    layout: "padded",
  },
};
export default meta;

type Story = StoryObj<ButtonStoryArgs>;

export const ThemedVariants: Story = {
  name: "ThemedButton variants",
  render: () => (
    <div className="sb-stage">
      {(
        [
          "primary",
          "secondary",
          "danger",
          "ghost",
          "success",
          "warning",
          "info",
        ] as const
      ).map((variant) => (
        <div
          key={variant}
          className="sb-stage sb-stage--row"
          style={{ gap: 8 }}
        >
          <strong style={{ minWidth: 96 }}>{variant}</strong>
          <ThemedButton variant={variant}>{variant}</ThemedButton>
          <ThemedButton variant={variant} disabled>
            disabled
          </ThemedButton>
          <ThemedButton variant={variant} loading>
            loading
          </ThemedButton>
          <ThemedButton variant={variant} submitted>
            submitted
          </ThemedButton>
        </div>
      ))}
    </div>
  ),
};

export const ThemedSizes: Story = {
  render: () => (
    <div
      className="sb-stage sb-stage--row"
      style={{ gap: 12, alignItems: "center" }}
    >
      <ThemedButton size="sm">Small</ThemedButton>
      <ThemedButton size="md">Medium</ThemedButton>
      <ThemedButton size="lg">Large</ThemedButton>
    </div>
  ),
};

export const KeyboardFocus: Story = {
  name: "Keyboard focus visual",
  render: () => (
    <div className="sb-stage">
      <p>Tab into the button below. The story interaction test forces focus.</p>
      <ThemedButton data-testid="focus-target" variant="primary">
        Focus me
      </ThemedButton>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const target = within(canvasElement).getByTestId("focus-target");
    target.focus();
    expect(document.activeElement).toBe(target);
  },
};

export const ThemedButtonInvokesOnClick: Story = {
  name: "ThemedButton click → onClick once",
  args: { handler: fn() },
  render: ({ handler }) => (
    <ThemedButton onClick={handler}>Click me</ThemedButton>
  ),
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByText("Click me");
    await userEvent.click(button);
    await expect(args.handler).toHaveBeenCalledTimes(1);
  },
};

export const DisabledThemedButtonDoesNotInvoke: Story = {
  name: "Disabled ThemedButton swallows clicks",
  args: { handler: fn() },
  render: ({ handler }) => (
    <ThemedButton disabled onClick={handler}>
      Disabled
    </ThemedButton>
  ),
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByText("Disabled");
    // Storybook 10's userEvent strictly rejects clicks on `pointer-events: none`
    // targets — disable the check so the React-level onClick contract is what's
    // exercised here.
    await userEvent.click(button, { pointerEventsCheck: 0 });
    expect(args.handler).not.toHaveBeenCalled();
  },
};

export const ActionButtonStates: Story = {
  name: "ActionButton states",
  render: () => {
    const [loading, setLoading] = useState(false);
    return (
      <div className="sb-stage">
        <ActionButton
          label="Primary action"
          icon={Pickaxe}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 800);
          }}
          loading={loading}
        />
        <ActionButton
          label="Disabled"
          icon={Sword}
          available={false}
          disabledReason="Not yet"
          onClick={fn()}
        />
        <ActionButton
          label="Secondary"
          icon={Sword}
          variant="secondary"
          onClick={fn()}
        />
        <ActionButton
          label="Danger"
          icon={Sword}
          variant="danger"
          onClick={fn()}
        />
      </div>
    );
  },
};

export const PrimaryActionDock: Story = {
  name: "Primary action — peripheral CTA",
  render: () => {
    const [submitted, setSubmitted] = useState(false);
    return (
      <div className="sb-stage">
        <PrimaryActionButton
          label="Roll dice"
          onAction={() => setSubmitted(true)}
          submitted={submitted}
        />
        <PrimaryActionButton
          label="Unavailable"
          available={false}
          unavailableReason="Wait for your turn"
        />
        <PrimaryActionButton label="Submitted result" submitted />
      </div>
    );
  },
};
