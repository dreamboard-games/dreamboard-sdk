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
import { GameProvider, useDropArea, useGame } from "../typecheck/game";
import { DrawPile } from "../items/draw-pile";
import { hostHandGame } from "./host-hand-game";
import { Hand } from "../items/hand";
import { Card, CardBack } from "../items/card";
import { BoardTargets } from "../items/board-targets";
import { InteractionForm } from "../items/interaction-form";
import { playerBoardGame, genericBoardGame } from "./player-board-game";
import { cardDropGame } from "./card-drop-game";
import { resourceGame, manyValueGame, numberStepGame } from "./resource-game";
import { Inspector } from "../items/inspector";
/** An area that runs `interaction` with whichever card is dropped on it. */
function DropZone({
  interaction,
  destination,
}: {
  interaction: string;
  destination?: string;
}) {
  const area = useDropArea({
    interaction,
    ...(destination ? { params: { destination } } : {}),
  });
  return (
    <section
      {...area.props}
      aria-label={`Drop for ${interaction}${destination ? ` ${destination}` : ""}`}
      className="my-3 grid min-h-24 place-items-center rounded-xl border-2 border-dashed data-drop-over:bg-muted data-[drop-target=true]:border-solid"
    >
      Drop a card: {interaction}
    </section>
  );
}
function ScenarioModel({
  compactBoards = false,
  dropZones = [],
}: {
  compactBoards?: boolean;
  dropZones?: readonly string[];
}) {
  const model = useGame((game) => game);
  return (
    <main style={{ width: "min(900px, 90vw)" }}>
      <output data-testid="scenario-drafts" hidden>
        {JSON.stringify(model.state.drafts)}
      </output>
      <output data-testid="scenario-drag" hidden>
        {JSON.stringify(model.drag.active)}
      </output>
      <h2>{model.phase.current}</h2>
      {model.boards.getAll().map((board) =>
        board.data.layout === "generic" ? (
          <section key={board.id} aria-label={board.id}>
            {board.spaces.getAll().map((space) => (
              <button
                key={space.id}
                {...space.getTargetProps()}
                aria-pressed={space.getIsSelected()}
              >
                {board.id}: {space.id}
              </button>
            ))}
          </section>
        ) : (
          <div
            key={board.id}
            style={
              compactBoards
                ? { width: 180, display: "inline-block" }
                : undefined
            }
          >
            <BoardTargets boardId={board.id} hexSize={40} />
          </div>
        ),
      )}
      {dropZones.map((interaction) => (
        <DropZone key={interaction} interaction={interaction} />
      ))}
      {dropZones.length > 0 &&
        ["left", "right"].map((destination) => (
          <DropZone
            key={destination}
            interaction="play.move"
            destination={destination}
          />
        ))}
      {model.me && model.interactions.find("play.draw") && (
        <DrawPile
          zoneId="deck"
          hostId="table"
          destinationZoneId="hand"
          destinationHostId={model.me.id}
          interaction="play.draw"
          params={{ source: "deck", destination: model.me.id }}
          label="Deck"
        />
      )}
      {model.zones
        .getAll()
        .filter((zone) => !zone.getIsEmpty())
        .map((zone) => (
          <Hand
            key={JSON.stringify([zone.id, zone.hostId])}
            zoneId={zone.id}
            hostId={zone.hostId}
            renderCard={(card, state) =>
              card.hidden ? <CardBack /> : <Card state={state}>{card.id}</Card>
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
  hostHands: () => localSource(hostHandGame, { players: 2, seed: 1 }),
  cardDrop: () => localSource(cardDropGame, { players: 2, seed: 1 }),
  genericBoards: () => localSource(genericBoardGame, { players: 2, seed: 1 }),
  playerBoards: () => localSource(playerBoardGame, { players: 2, seed: 1 }),
  hearts: () => localSource(hearts, { players: 4, seed: 1, as: "player-1" }),
  hex: () =>
    scenarioSource(hex, bandits, { at: "ready-to-move", as: "player-1" }),
  "hex-setup": () => localSource(hex, { players: 3, seed: 1 }),
  manyValues: () => localSource(manyValueGame, { players: 2, seed: 1 }),
  numberSteps: () => localSource(numberStepGame, { players: 2, seed: 1 }),
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
function OwnedScenario({
  created,
  compactBoards,
  dropZones,
}: {
  created: CreatedSource;
  compactBoards: boolean;
  dropZones: readonly string[];
}) {
  useLayoutEffect(() => {
    created.adopted = true;
  }, [created]);
  return (
    <GameProvider source={created.source}>
      <ScenarioModel compactBoards={compactBoards} dropZones={dropZones} />
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
  return source ? (
    <OwnedScenario
      created={source}
      compactBoards={kind === "cardDrop"}
      dropZones={kind === "cardDrop" ? ["play.discard"] : []}
    />
  ) : (
    <p>Loading scenario…</p>
  );
}
function Scenario({ kind }: { kind: keyof typeof fixtures }) {
  return <ScenarioLoader key={kind} kind={kind} />;
}
const meta = { title: "Actual scenarios", component: Scenario } satisfies Meta<
  typeof Scenario
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const HostHands: Story = { args: { kind: "hostHands" } };
export const HeartsPassing: Story = { args: { kind: "hearts" } };
export const HexBanditsCheckpoint: Story = { args: { kind: "hex" } };

export const ResourcePartialDraft: Story = { args: { kind: "resources" } };
export const NumberSteppers: Story = { args: { kind: "numberSteps" } };

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

export const PlayerBoardTargets: Story = { args: { kind: "playerBoards" } };

export const GenericBoardSpaces: Story = { args: { kind: "genericBoards" } };

export const CardDragDrop: Story = { args: { kind: "cardDrop" } };

export const ManyValueEditors: Story = { args: { kind: "manyValues" } };
