import type { Meta, StoryObj } from "@storybook/react-vite";
import { Coins, TreePine, Gem, Mountain, Zap, Droplet } from "lucide-react";
import {
  ResourceCounter,
  type ResourceDisplayConfig,
} from "../components/ResourceCounter.js";
import {
  CostDisplay,
  type ResourceDefinition,
} from "../components/CostDisplay.js";
import { PhaseIndicator } from "../components/PhaseIndicator.js";
import { GameEndDisplay } from "../components/GameEndDisplay.js";

// `ResourceDisplayConfig.icon` accepts either a component or a ReactNode.
// Pass JSX so the component-vs-forwardRef detection in `renderResourceIcon`
// stays out of the picture for stories.
const fantasy: ResourceDisplayConfig[] = [
  { type: "gold", label: "Gold", icon: <Coins aria-hidden /> },
  { type: "wood", label: "Wood", icon: <TreePine aria-hidden /> },
  { type: "gems", label: "Gems", icon: <Gem aria-hidden /> },
];

const scifi: ResourceDisplayConfig[] = [
  { type: "minerals", label: "Minerals", icon: <Mountain aria-hidden /> },
  { type: "energy", label: "Energy", icon: <Zap aria-hidden /> },
  { type: "water", label: "Water", icon: <Droplet aria-hidden /> },
];

const meta: Meta = {
  title: "Resource & Status",
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

export const ResourceCompact: Story = {
  name: "ResourceCounter — compact",
  render: () => (
    <ResourceCounter.Root
      resources={fantasy}
      counts={{ gold: 5, wood: 3, gems: 1 }}
      className="sb-stage sb-stage--row"
    >
      <ResourceCounter.Item className="inline-flex items-center gap-2 rounded-md border px-3 py-2 font-bold">
        {() => (
          <>
            <ResourceCounter.Icon className="h-5 w-5" />
            <ResourceCounter.Count className="tabular-nums" />
            <ResourceCounter.Label className="text-xs" />
          </>
        )}
      </ResourceCounter.Item>
    </ResourceCounter.Root>
  ),
};

export const ResourceZeroHidden: Story = {
  name: "ResourceCounter — zero hidden",
  render: () => (
    <ResourceCounter.Root
      resources={scifi}
      counts={{ minerals: 4, energy: 0, water: 3 }}
      zero="hide"
      className="sb-stage sb-stage--row"
    >
      <ResourceCounter.Item className="inline-flex items-center gap-2 rounded-md border px-3 py-2 font-bold">
        {() => (
          <>
            <ResourceCounter.Icon className="h-5 w-5" />
            <ResourceCounter.Count className="tabular-nums" />
            <ResourceCounter.Label className="text-xs" />
          </>
        )}
      </ResourceCounter.Item>
    </ResourceCounter.Root>
  ),
};

const costDefs: ResourceDefinition[] = [
  { type: "gold", label: "Gold", icon: Coins, color: "text-yellow-400" },
  { type: "wood", label: "Wood", icon: TreePine, color: "text-amber-600" },
];

export const Cost: Story = {
  name: "CostDisplay",
  render: () => (
    <div className="sb-stage" style={{ gap: 12 }}>
      <CostDisplay cost={{ gold: 3, wood: 2 }} resourceDefs={costDefs} />
      <CostDisplay
        cost={{ gold: 3, wood: 2 }}
        currentResources={{ gold: 5, wood: 1 }}
        resourceDefs={costDefs}
      />
    </div>
  ),
};

export const ActiveSelfPhase: Story = {
  name: "PhaseIndicator — active vs waiting",
  render: () => (
    <div className="sb-stage">
      <PhaseIndicator
        currentPhase="rollDice"
        phaseLabels={{ rollDice: "Roll dice" }}
        isMyTurn
      />
      <PhaseIndicator
        currentPhase="rollDice"
        phaseLabels={{ rollDice: "Roll dice" }}
        activePlayerNames={["Player 3"]}
      />
      <PhaseIndicator currentPhase="endTurn" variant="bar" isMyTurn />
      <PhaseIndicator currentPhase="endTurn" variant="minimal" />
    </div>
  ),
};

export const Winner: Story = {
  name: "GameEndDisplay — winner",
  render: () => (
    <GameEndDisplay
      isGameOver
      scores={[
        { playerId: "p1", name: "Sage", score: 10, isWinner: true },
        { playerId: "p2", name: "Mor", score: 7 },
        { playerId: "p3", name: "Iri", score: 5 },
      ]}
    />
  ),
};
