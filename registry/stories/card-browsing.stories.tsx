import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { compileManifest, createGame } from "@dreamboard-games/sdk/reducer";
import { localSource } from "@dreamboard-games/sdk/testing";
import type { CommandSource } from "@dreamboard-games/sdk";
import { z } from "zod";
import { GameProvider, type GameCard } from "../typecheck/game";
import { CardRow } from "../items/card-row";
import { Hand } from "../items/hand";
import { CardControl } from "../items/card-control";
import { Card, type CardState } from "../items/card";
import "./card-browsing.css";

function createBrowsingGame(count: number) {
  const model = createGame({
    manifest: compileManifest({
      players: { minPlayers: 1, maxPlayers: 1 },
      zones: [
        {
          id: "table",
          name: "Expedition",
          scope: "shared",
          visibility: "public",
        },
      ],
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({}),
          defaultHome: { type: "zone", zoneId: "table" },
          cards: Array.from({ length: count }, (_, i) => ({
            id: `card-${i + 1}`,
            name: [
              "Ember guardian",
              "Moonlit scout",
              "River keeper",
              "Dawn weaver",
            ][i % 4],
            cardType: "card",
            count: 1,
            properties: {},
          })),
        },
      ],
    }),
    phases: { play: z.object({}) },
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  return model.assemble({
    initial: { public: () => ({}) },
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx, q }) {
          tx.setActivePlayers(q.player.order());
        },
        interactions: {
          place: play.interaction({
            inputs: {
              card: play.inputs.card({ from: ["table"] }),
              to: play.inputs.position({ zones: ["table"] }),
            },
            reduce({ tx, input }) {
              tx.moveComponentToPosition({
                componentId: input.params.card,
                at: input.params.to,
              });
            },
          }),
        },
      }),
    },
    view: model.view(() => ({})),
  });
}
function face(card: GameCard, state: CardState) {
  return (
    <Card state={state} className="browsing-story-card">
      <span className="browsing-story-cost">2 · ALLY</span>
      <strong>{card.view?.name}</strong>
      <div className="browsing-story-art" aria-hidden>
        ✦
      </div>
      <p>Protect a friendly character from the next 3 damage this turn.</p>
      <footer>{card.id.replace("card-", "")} / EXPEDITION</footer>
    </Card>
  );
}
function BrowsingDemo({
  kind = "row",
  position = "middle",
  count = 8,
}: {
  kind?: "row" | "hand";
  position?: "top" | "middle" | "bottom";
  count?: number;
}) {
  const [source, setSource] = useState<CommandSource | null>(null);
  useEffect(() => {
    let active = true;
    let owned: Awaited<ReturnType<typeof localSource>> | undefined;
    void localSource(createBrowsingGame(count), { players: 1, seed: 1 }).then(
      (value) => {
        if (!active) return value.dispose();
        owned = value;
        setSource(value);
      },
    );
    return () => {
      active = false;
      owned?.dispose();
    };
  }, [count]);
  return (
    <main className="db-table browsing-story">
      <header>
        <span>EXPEDITION</span>
        <h1>{kind === "row" ? "Your expedition" : "Your hand"}</h1>
      </header>
      {source && (
        <GameProvider source={source}>
          <section
            className="browsing-story-zone"
            data-position={position}
            data-testid="browsing-zone"
          >
            <h2>
              {kind === "row" ? "Table" : "Hand"} · {count} cards
            </h2>
            {kind === "row" ? (
              <CardRow
                zoneId="table"
                hostId="table"
                label="Expedition"
                data-testid="browsing-row"
                reorder={{ interaction: "play.place" }}
                renderCard={(card) => (
                  <CardControl
                    cardId={card.id}
                    drag={{ interaction: "play.place" }}
                    renderCard={face}
                  />
                )}
              />
            ) : (
              <Hand
                zoneId="table"
                hostId="table"
                label="Expedition"
                renderCard={face}
                reorder={{ interaction: "play.place" }}
              />
            )}
          </section>
        </GameProvider>
      )}
    </main>
  );
}
const meta = {
  title: "Registry/Card browsing",
  component: BrowsingDemo,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BrowsingDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RowTop: Story = { args: { position: "top" } };
export const RowMiddle: Story = { args: { position: "middle" } };
export const RowBottom: Story = { args: { position: "bottom" } };
export const HandTop: Story = { args: { kind: "hand", position: "top" } };
export const HandMiddle: Story = { args: { kind: "hand", position: "middle" } };
export const HandBottom: Story = { args: { kind: "hand", position: "bottom" } };
export const CrowdedRow: Story = { args: { count: 24 } };
export const CrowdedHand: Story = { args: { kind: "hand", count: 24 } };
