import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useLayoutEffect, useState } from "react";
import { compileManifest, createGame } from "@dreamboard-games/sdk/reducer";
import { localSource, createTestSource } from "@dreamboard-games/sdk/testing";
import type { CommandSource } from "@dreamboard-games/sdk";
import { z } from "zod";
import {
  GameProvider,
  useGame,
  useZonePresentation,
  type GameCard,
} from "../typecheck/game";
import { Hand } from "../items/hand";
import { DropArea } from "../items/drop-area";
import { CardControl } from "../items/card-control";
import { Card, CardBack, type CardState } from "../items/card";
import { Pile } from "../items/pile";
import { Button } from "@/components/ui/button";

const zones = [
  { id: "hand", name: "Hand", scope: "perPlayer", visibility: "ownerOnly" },
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
            count: 3,
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
          to: { zoneId: "hand", hostId: playerId },
          count: 3,
        });
        tx.setActivePlayers([playerId]);
      },
      interactions: {
        move: play.interaction({
          commit: { mode: "manual" },
          inputs: {
            card: play.inputs.card({ from: ["hand", "table", "deck"] }),
            to: play.inputs.position({ zones: ["hand", "table", "deck"] }),
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
  const me = useGame((game) => game.me?.id ?? "player-1");
  const hostId = definition.scope === "perPlayer" ? me : "table";
  const { cards, count } = useZonePresentation(definition.id, hostId);
  return (
    <DropArea
      binding={{
        interaction: "play.move",
        position: { zoneId: definition.id, hostId, index: cards.length },
      }}
      zone={{ zoneId: definition.id, hostId }}
      visibility={definition.visibility}
      label={definition.name}
      data-testid={definition.id}
      className="grid min-h-40 min-w-28 justify-items-center gap-2 p-3"
    >
      {definition.id === "hand" ? (
        <Hand
          zoneId="hand"
          hostId={hostId}
          label="Your hand"
          renderCard={face}
          reorder={{ interaction: "play.move" }}
        />
      ) : definition.id === "deck" ? (
        <Pile count={count} label="Deck">
          {cards.at(-1) ? (
            <CardControl
              cardId={cards.at(-1)!.id}
              drag={{ interaction: "play.move" }}
              renderCard={face}
            />
          ) : (
            <CardBack />
          )}
        </Pile>
      ) : (
        cards.map((card) => (
          <CardControl
            key={card.id}
            cardId={card.id}
            drag={{ interaction: "play.move" }}
            renderCard={face}
          />
        ))
      )}
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
      <main className="db-table flex min-h-dvh flex-col justify-between gap-3 p-3">
        <div className="flex gap-2">
          <Button onClick={() => source.finish(true)}>Confirm move</Button>
          <Button onClick={() => source.finish(false)}>Reject move</Button>
        </div>
        <Authority />
        <div className="flex flex-wrap justify-center gap-3">
          {zones.slice(1).map((zone) => (
            <Zone key={zone.id} definition={zone} />
          ))}
        </div>
        <Zone definition={zones[0]} />
      </main>
    </GameProvider>
  );
}
function PendingLandings() {
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
  title: "Game feel/Card landings",
  component: PendingLandings,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PendingLandings>;
export default meta;
export const PendingDrop: StoryObj<typeof meta> = {};
