import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useLayoutEffect, useState } from "react";
import { localSource, scenarioSource } from "@dreamboard-games/sdk/testing";
import type { CommandSource } from "@dreamboard-games/sdk";
import hearts from "../../examples/reference-games/hearts/app/game";
import hex from "../../examples/reference-games/hex-network-trading/app/game";
import bandits from "../../examples/reference-games/hex-network-trading/test/scenarios/bandits.scenario";
import heartsComplete from "../../examples/reference-games/hearts/test/scenarios/complete-game.scenario";
import setup from "../../examples/reference-games/hex-network-trading/test/scenarios/topology-and-setup.scenario";
import discard from "../../examples/reference-games/hex-network-trading/test/scenarios/discard-barrier.scenario";
import production from "../../examples/reference-games/hex-network-trading/test/scenarios/production.scenario";
import hexComplete from "../../examples/reference-games/hex-network-trading/test/scenarios/complete-game.scenario";
import depot from "../../examples/reference-games/hex-network-trading/test/scenarios/depot-trades.scenario";
import trade from "../../examples/reference-games/hex-network-trading/test/scenarios/bilateral-trade.scenario";
import { GameProvider, useGame } from "../typecheck/game";
import { Hand } from "../items/hand";
import { Card, CardBack } from "../items/card";
import { BoardTargets } from "../items/board-targets";
import { InteractionForm } from "../items/interaction-form";
import { resourceGame } from "./resource-game";
import { Inspector } from "../items/inspector";
function ScenarioModel() {
  const model = useGame((game) => game);
  return (
    <main style={{ width: "min(900px, 90vw)" }}>
      <h2>{model.phase.current}</h2>
      {model.boards.getAll().map((board) => (
        <BoardTargets key={board.id} boardId={board.id} hexSize={40} />
      ))}
      {model.zones
        .getAll()
        .filter((zone) => !zone.getIsEmpty())
        .map((zone) => (
          <Hand
            key={zone.id}
            zoneId={zone.id}
            renderCard={(card) =>
              card.hidden ? <CardBack /> : <Card>{card.id}</Card>
            }
          />
        ))}
      {model.interactions.list().map((interaction) => (
        <InteractionForm key={interaction.key} interaction={interaction.key} />
      ))}
      <Inspector />
      <output data-testid="scenario-view" hidden>
        {JSON.stringify(model.view)}
      </output>
    </main>
  );
}
const fixtures = {
  hearts: () => localSource(hearts, { players: 4, seed: 1, as: "player-1" }),
  hex: () =>
    scenarioSource(hex, bandits, { at: "ready-to-move", as: "player-1" }),
  "hex-setup": () => localSource(hex, { players: 3, seed: 1 }),
  resources: () => localSource(resourceGame, { players: 2, seed: 1 }),
  HeartsOpening: () =>
    scenarioSource(hearts, heartsComplete, { at: "opening", as: "player-1" }),
  HeartsSealedPass: () =>
    scenarioSource(hearts, heartsComplete, {
      at: "sealed-pass",
      as: "player-1",
    }),
  HeartsFirstTrick: () =>
    scenarioSource(hearts, heartsComplete, {
      at: "first-trick",
      as: "player-1",
    }),
  HeartsMidHand: () =>
    scenarioSource(hearts, heartsComplete, { at: "mid-hand", as: "player-1" }),
  HeartsDeveloped: () =>
    scenarioSource(hearts, heartsComplete, { at: "developed", as: "player-1" }),
  HeartsGameOver: () =>
    scenarioSource(hearts, heartsComplete, { at: "game-over", as: "player-1" }),
  HexOpening: () =>
    scenarioSource(hex, setup, { at: "opening", as: "player-1" }),
  HexDiscard: () =>
    scenarioSource(hex, discard, { at: "ready-to-discard", as: "player-1" }),
  HexProduction: () =>
    scenarioSource(hex, production, { at: "produced", as: "player-1" }),
  HexGrowingNetwork: () =>
    scenarioSource(hex, hexComplete, { at: "growing-network", as: "player-1" }),
  HexDeveloped: () =>
    scenarioSource(hex, hexComplete, { at: "developed", as: "player-1" }),
  HexGameOver: () =>
    scenarioSource(hex, hexComplete, { at: "game-over", as: "player-1" }),
  HexDepot: () =>
    scenarioSource(hex, depot, { at: "depot-ready", as: "player-2" }),
  HexTrade: () =>
    scenarioSource(hex, trade, { at: "pending-trade", as: "player-2" }),
} satisfies Record<string, () => Promise<CommandSource>>;
interface CreatedSource {
  source: CommandSource;
  adopted: boolean;
}
function OwnedScenario({ created }: { created: CreatedSource }) {
  useLayoutEffect(() => {
    created.adopted = true;
  }, [created]);
  return (
    <GameProvider source={created.source}>
      <ScenarioModel />
    </GameProvider>
  );
}
function ScenarioLoader({ kind }: { kind: keyof typeof fixtures }) {
  const [source, setSource] = useState<CreatedSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let created: CreatedSource | undefined;
    // Abandoned async creation owns disposal until the provider takes ownership.
    void fixtures[kind]()
      .then((value) => {
        if (active) {
          created = { source: value, adopted: false };
          setSource(created);
        } else value.dispose();
      })
      .catch((error) => {
        if (active) setError(String(error));
      });
    return () => {
      active = false;
      // A created source may still be waiting for React to commit its provider.
      if (created && !created.adopted) created.source.dispose();
    };
  }, [kind]);
  if (error) return <p role="alert">{error}</p>;
  return source ? <OwnedScenario created={source} /> : <p>Loading scenario…</p>;
}
function Scenario({ kind }: { kind: keyof typeof fixtures }) {
  return <ScenarioLoader key={kind} kind={kind} />;
}
const meta = { title: "Actual scenarios", component: Scenario } satisfies Meta<
  typeof Scenario
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const HeartsPassing: Story = { args: { kind: "hearts" } };
export const HexBanditsCheckpoint: Story = { args: { kind: "hex" } };

export const ResourcePartialDraft: Story = { args: { kind: "resources" } };

export const HexSetupTargets: Story = { args: { kind: "hex-setup" } };

export const HeartsOpening: Story = { args: { kind: "HeartsOpening" } };

export const HeartsSealedPass: Story = { args: { kind: "HeartsSealedPass" } };

export const HeartsFirstTrick: Story = { args: { kind: "HeartsFirstTrick" } };

export const HeartsMidHand: Story = { args: { kind: "HeartsMidHand" } };

export const HeartsDeveloped: Story = { args: { kind: "HeartsDeveloped" } };

export const HeartsGameOver: Story = { args: { kind: "HeartsGameOver" } };

export const HexOpening: Story = { args: { kind: "HexOpening" } };

export const HexDiscard: Story = { args: { kind: "HexDiscard" } };

export const HexProduction: Story = { args: { kind: "HexProduction" } };

export const HexGrowingNetwork: Story = { args: { kind: "HexGrowingNetwork" } };

export const HexDeveloped: Story = { args: { kind: "HexDeveloped" } };

export const HexGameOver: Story = { args: { kind: "HexGameOver" } };

export const HexDepot: Story = { args: { kind: "HexDepot" } };

export const HexTrade: Story = { args: { kind: "HexTrade" } };
