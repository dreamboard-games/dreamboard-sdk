import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useLayoutEffect, useState } from "react";
import { compileManifest, createGame } from "@dreamboard-games/sdk/reducer";
import { localSource, createTestSource } from "@dreamboard-games/sdk/testing";
import type { CommandSource } from "@dreamboard-games/sdk";
import { z } from "zod";
import { GameProvider, useGame, type GameCard } from "../typecheck/game";
import { DropArea } from "../items/drop-area";
import { CardControl } from "../items/card-control";
import { Card, CardBack, type CardState } from "../items/card";
import { CardPile } from "../items/card-pile";
import { Button } from "@/components/ui/button";

const zones = [
  { id: "source", name: "Source", scope: "shared", visibility: "public" },
  { id: "table", name: "Table", scope: "shared", visibility: "public" },
  { id: "deck", name: "Deck", scope: "shared", visibility: "hidden" },
] as const;
const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 2, maxPlayers: 2 },
    zones: [...zones],
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: z.object({}),
        cards: [
          {
            id: "card",
            name: "Card",
            cardType: "card",
            count: 5,
            properties: {},
          },
        ],
        defaultHome: { type: "zone", zoneId: "deck" },
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
        const playerId = q.player.order()[0];
        tx.deal({
          from: { zoneId: "deck" },
          to: { zoneId: "source" },
          count: 3,
        });
        tx.deal({
          from: { zoneId: "deck" },
          to: { zoneId: "table" },
          count: 1,
        });
        tx.setActivePlayers([playerId]);
      },
      interactions: {
        move: play.interaction({
          commit: { mode: "manual" },
          inputs: {
            card: play.inputs.card({ from: ["source", "table", "deck"] }),
            to: play.inputs.position({ zones: ["source", "table", "deck"] }),
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
  return card.hidden ? (
    <CardBack />
  ) : (
    <Card state={state}>
      <strong>Moving card</strong>
      <span>{card.id}</span>
    </Card>
  );
}
function Zone({ definition }: { definition: (typeof zones)[number] }) {
  return (
    <DropArea
      binding={{
        interaction: "play.move",
        position: { zoneId: definition.id, hostId: "table", index: 0 },
      }}
      zone={{ zoneId: definition.id, hostId: "table" }}
      visibility={definition.visibility}
      label={definition.name}
      data-testid={definition.id}
      className="p-3"
    >
      <CardPile
        zoneId={definition.id}
        hostId="table"
        label={definition.name}
        renderCard={(card, arriving) => (
          <CardControl
            cardId={card.id}
            disabled={arriving}
            drag={{ interaction: "play.move" }}
            renderCard={face}
          />
        )}
        renderFace={(card) => face(card, "idle")}
      />
    </DropArea>
  );
}
function Authority() {
  const state = useGame((game) =>
    JSON.stringify({
      version: game.snapshot?.version,
      zones: game.zones
        .getAll()
        .map((zone) => [zone.id, zone.getCards().map((card) => card.id)]),
    }),
  );
  return (
    <output hidden data-testid="authority">
      {state}
    </output>
  );
}
interface ControlledSource {
  value: CommandSource;
  finish(accepted: boolean): void;
  adopted: boolean;
}
function Owned({ source }: { source: ControlledSource }) {
  useLayoutEffect(() => {
    source.adopted = true;
  }, [source]);
  return (
    <GameProvider source={source.value}>
      <main className="db-table flex min-h-dvh flex-col gap-3 p-3 [--card-w-pile:90px]">
        <div className="flex gap-2">
          <Button onClick={() => source.finish(true)}>Confirm move</Button>
          <Button onClick={() => source.finish(false)}>Reject move</Button>
        </div>
        <Authority />
        <div className="flex flex-wrap justify-center gap-3">
          {zones.map((zone) => (
            <Zone key={zone.id} definition={zone} />
          ))}
        </div>
      </main>
    </GameProvider>
  );
}
function PileGestures() {
  const [source, setSource] = useState<ControlledSource | null>(null);
  useEffect(() => {
    let active = true;
    let owned: ControlledSource | undefined;
    void localSource(game, { players: 2, seed: 1 }).then((value) => {
      if (!active) return value.dispose();
      // The test transport holds responses through the production ACK/frame lifecycle.
      const controlled = createTestSource(value.store.get().snapshot!);
      owned = {
        adopted: false,
        async finish(accepted) {
          const submission = controlled.submissions.at(-1);
          if (!submission) return;
          if (!accepted) {
            submission.resolve({
              accepted: false,
              errorCode: "REJECTED",
              message: "Move rejected",
            });
            return;
          }
          const result = await value.submit(
            submission.interactionId,
            submission.params!,
          );
          controlled.emit(value.store.get().snapshot!);
          submission.resolve(result);
        },
        value: {
          ...controlled,
          dispose() {
            controlled.dispose();
            value.dispose();
          },
        },
      };
      setSource(owned);
    });
    return () => {
      active = false;
      if (owned && !owned.adopted) owned.value.dispose();
    };
  }, []);
  return source ? <Owned source={source} /> : <p>Loading…</p>;
}
const meta = {
  title: "Registry/Card pile",
  component: PileGestures,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PileGestures>;
export default meta;
export const PickupAndLanding: StoryObj<typeof meta> = {};
