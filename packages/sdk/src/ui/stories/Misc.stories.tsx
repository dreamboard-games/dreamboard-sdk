import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ToastProvider, ToastActions } from "../components/Toast.js";
import { DiceRoller } from "../components/DiceRoller.js";
import { GameSkeleton } from "../components/GameSkeleton.js";
import { ErrorBoundary } from "../components/ErrorBoundary.js";
import { ThemedButton } from "../components/ThemedButton.js";

const meta: Meta = {
  title: "Misc",
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

function ErrorBoundaryResetStory() {
  const [crash, setCrash] = useState(true);
  function MaybeBoom() {
    if (crash) throw new Error("Boom");
    return <p>Recovered.</p>;
  }
  return (
    <div className="sb-stage">
      <ThemedButton onClick={() => setCrash((c) => !c)}>
        {crash ? "Recover" : "Crash again"}
      </ThemedButton>
      <ErrorBoundary key={String(crash)}>
        <MaybeBoom />
      </ErrorBoundary>
    </div>
  );
}

export const ToastNotifications: Story = {
  render: () => (
    <ToastProvider>
      <ToastActions>
        {(actions) => (
          <div className="sb-stage sb-stage--row" style={{ gap: 8 }}>
            <ThemedButton onClick={() => actions.success("Saved")}>
              Success
            </ThemedButton>
            <ThemedButton
              onClick={() => actions.info("Heads up")}
              variant="secondary"
            >
              Info
            </ThemedButton>
            <ThemedButton
              onClick={() => actions.warning("Careful")}
              variant="warning"
            >
              Warning
            </ThemedButton>
            <ThemedButton
              onClick={() => actions.error("Something failed")}
              variant="danger"
            >
              Error
            </ThemedButton>
          </div>
        )}
      </ToastActions>
    </ToastProvider>
  ),
};

export const Dice: Story = {
  render: () => <DiceRoller values={[3, 5]} />,
};

export const DiceUnrolled: Story = {
  render: () => <DiceRoller diceCount={2} />,
};

export const Skeleton: Story = {
  name: "GameSkeleton",
  render: () => <GameSkeleton />,
};

export const ErrorBoundaryFallback: Story = {
  name: "ErrorBoundary fallback",
  render: () => {
    function Boom() {
      throw new Error("Plugin crashed during render");
    }
    return (
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
  },
};

export const ErrorBoundaryReset: Story = {
  name: "ErrorBoundary recovery",
  render: () => <ErrorBoundaryResetStory />,
};
