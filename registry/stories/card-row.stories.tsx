import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { compileManifest, createGame } from "@dreamboard-games/sdk/reducer";
import { localSource } from "@dreamboard-games/sdk/testing";
import type { CommandSource } from "@dreamboard-games/sdk";
import { z } from "zod";
import { GameProvider, useGame, type GameCard } from "../typecheck/game";
import { DropArea } from "../items/drop-area";
import { Button } from "@/components/ui/button";
import { CardRow } from "../items/card-row";
import { CardControl } from "../items/card-control";
import { Card, type CardState } from "../items/card";

const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    zones: ["table", "supply", "empty"].map((id) => ({
      id,
      name: id,
      scope: "shared" as const,
      visibility: "public" as const,
    })),
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: z.object({}),
        defaultHome: { type: "zone", zoneId: "table" },
        cards: ["one", "two", "three", "four"].map((id) => ({
          id,
          name: id,
          cardType: "card",
          count: 1,
          properties: {},
        })),
      },
    ],
  }),
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const play = model.phase("play");
const game = model.assemble({
  initial: { public: () => ({}) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, q }) {
        tx.setActivePlayers(q.player.order());
        tx.moveComponentToZone({
          componentId: "four",
          to: { zoneId: "supply" },
        });
      },
      interactions: {
        append: play.interaction({
          inputs: {
            card: play.inputs.card({ from: ["table", "supply", "empty"] }),
            destination: play.inputs.form.choice({
              defaultValue: "table",
              choices: ["table", "supply", "empty"].map((value) => ({
                value,
                label: value,
              })),
            }),
          },
          reduce({ tx, input }) {
            tx.moveComponentToZone({
              componentId: input.params.card,
              to: { zoneId: input.params.destination },
            });
          },
        }),
        place: play.interaction({
          inputs: {
            card: play.inputs.card({ from: ["table", "supply", "empty"] }),
            to: play.inputs.position({ zones: ["table", "supply", "empty"] }),
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
function face(card: GameCard, state: CardState) {
  return <Card state={state}>{card.view?.name}</Card>;
}
function Rows() {
  const [wholeZone, setWholeZone] = useState(false);
  const authority = useGame((game) =>
    JSON.stringify(
      game.zones
        .getAll()
        .map((zone) => [zone.id, zone.getCards().map((card) => card.id)]),
    ),
  );
  return (
    <main className="db-table grid grid-cols-2 min-h-dvh content-start gap-3 p-4">
      <output hidden data-testid="row-authority">
        {authority}
      </output>
      <Button className="col-span-2" onClick={() => setWholeZone(!wholeZone)}>
        Toggle whole-zone moves
      </Button>
      {["table", "supply", "empty"].map((zoneId) => (
        <DropArea
          key={zoneId}
          className={zoneId === "table" ? "col-span-2 min-w-0" : "min-w-0"}
          label={`${zoneId} drop area`}
          binding={{
            interaction: "play.append",
            params: { destination: zoneId },
          }}
        >
          <h2>{zoneId}</h2>
          <CardRow
            zoneId={zoneId}
            hostId="table"
            aria-label={zoneId}
            data-testid={zoneId}
            reorder={{ interaction: "play.place" }}
            renderCard={(card) => (
              <CardControl
                cardId={card.id}
                drag={
                  wholeZone
                    ? { interaction: "play.append" }
                    : { interaction: "play.place" }
                }
                renderCard={face}
              />
            )}
          />
        </DropArea>
      ))}
    </main>
  );
}
function ReorderingRows() {
  const [source, setSource] = useState<CommandSource | null>(null);
  useEffect(() => {
    let active = true;
    let owned: Awaited<ReturnType<typeof localSource>> | undefined;
    void localSource(game, { players: 1, seed: 1 }).then((value) => {
      if (!active) return value.dispose();
      owned = value;
      setSource(value);
    });
    return () => {
      active = false;
      owned?.dispose();
    };
  }, []);
  return source ? (
    <GameProvider source={source}>
      <Rows />
    </GameProvider>
  ) : (
    <p>Loading…</p>
  );
}
const meta = {
  title: "Registry/Card row",
  component: ReorderingRows,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ReorderingRows>;
export default meta;
export const OrderedPositions: StoryObj<typeof meta> = {};
