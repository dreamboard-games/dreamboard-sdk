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
import { OutcomeDialog } from "../components/OutcomeDialog.js";
import {
  ActionHelp,
  GuidancePanel,
  SetupChecklist,
} from "../components/Guidance.js";

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
  name: "OutcomeDialog — winner",
  render: () => (
    <OutcomeDialog
      outcome={{
        reason: { code: "FINAL_ROUND", message: "Final round complete." },
        standings: [
          {
            playerId: "p1",
            rank: 1,
            result: "win",
            score: 10,
            scoreBreakdown: [{ id: "routes", label: "Routes", value: 8 }],
          },
          {
            playerId: "p2",
            rank: 2,
            result: "loss",
            score: 7,
            tieBreaks: [{ id: "coins", label: "Coins", value: 3 }],
          },
          { playerId: "p3", rank: 3, result: "loss", score: 5 },
        ],
      }}
      playerName={(playerId) =>
        ({ p1: "Sage", p2: "Mor", p3: "Iri" })[playerId] ?? playerId
      }
    />
  ),
};

const setupGuidance = {
  profileId: "standard",
  name: "Standard Cloudline Survey",
  summary: "Prepare one scorecard per player and the seeded dice sequence.",
  steps: [
    {
      id: "prepare-scorecards",
      label: "Prepare player scorecards",
      description: "Give each player a private 4 by 4 survey grid.",
    },
    {
      id: "prepare-dice",
      label: "Prepare dice",
      description: "Use the seeded two-die roll list for all eight rounds.",
    },
  ],
};

export const GuidanceOverview: Story = {
  name: "GuidancePanel — overview",
  render: () => (
    <div className="sb-stage" style={{ maxWidth: 420 }}>
      <GuidancePanel
        phase={{
          id: "markSurvey",
          label: "Mark the survey grid",
          summary: "Resolve the shared dice roll on each player scorecard.",
          objective:
            "Choose an unmarked matching cell, or mark any open cell as failed when no match remains.",
        }}
        actions={[
          {
            label: "Mark cell",
            help: "Choose one highlighted scorecard cell, then submit the pending mark.",
          },
          {
            label: "Roll first",
            unavailableReason:
              "Roll first, then choose a matching unmarked cell.",
          },
        ]}
      />
    </div>
  ),
};

export const SetupChecklistControlled: Story = {
  name: "SetupChecklist — controlled completion",
  render: () => (
    <div className="sb-stage" style={{ maxWidth: 420 }}>
      <SetupChecklist
        guidance={setupGuidance}
        completedStepIds={["prepare-scorecards"]}
      />
    </div>
  ),
};

export const ActionHelpBlocked: Story = {
  name: "ActionHelp — blocked reason",
  render: () => (
    <div className="sb-stage" style={{ maxWidth: 320 }}>
      <ActionHelp
        label="Draft stall"
        help="Choose one face-up stall card from the market."
        unavailableReason="Players draft from the market in seat order."
      />
    </div>
  ),
};

export const GuidancePhoneStack: Story = {
  name: "Guidance — phone stack",
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: () => (
    <div className="sb-stage" style={{ maxWidth: 300 }}>
      <GuidancePanel
        phase={{
          id: "draft",
          label: "Draft a stall",
          summary: "Choose one face-up stall card from the shared market.",
          objective:
            "Build high-prestige guild sets before the second storm cancels the fair.",
        }}
        actions={[
          {
            label: "Draft stall",
            help: "Final ties break by complete guild sets, then coins.",
          },
        ]}
      />
      <SetupChecklist guidance={setupGuidance} completedStepIds={[]} />
    </div>
  ),
};
