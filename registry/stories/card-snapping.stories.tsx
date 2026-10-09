import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { compileManifest, createGame } from "@dreamboard-games/sdk/reducer";
import { localSource } from "@dreamboard-games/sdk/testing";
import type { CommandSource } from "@dreamboard-games/sdk";
import { z } from "zod";
import {
  GameProvider,
  useDragOverlay,
  useGame,
  useZonePresentation,
  type GameCard,
} from "../typecheck/game";
import { Hand } from "../items/hand";
import { DropArea } from "../items/drop-area";
import { CardControl } from "../items/card-control";
import { Card, CardBack, type CardState } from "../items/card";
import { Pile } from "../items/pile";

const zones = [
  { id: "hand", name: "Hand", scope: "perPlayer", visibility: "ownerOnly" },
  { id: "table", name: "Table", scope: "shared", visibility: "public" },
  { id: "discard", name: "Discard", scope: "shared", visibility: "public" },
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
            count: 6,
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
const anywhere = ["hand", "table", "discard", "deck"] as const;
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
        tx.deal({
          from: { zoneId: "deck" },
          to: { zoneId: "table" },
          count: 2,
        });
        tx.setActivePlayers([playerId]);
      },
      interactions: {
        move: play.interaction({
          commit: { mode: "manual" },
          inputs: {
            card: play.inputs.card({ from: [...anywhere] }),
            to: play.inputs.position({ zones: [...anywhere] }),
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
      <strong>Card</strong>
      <span>{card.id.slice(-6)}</span>
    </Card>
  );
}
/** A pile: a card dragged near it snaps onto its top and lands there. */
function PileZone({ zoneId }: { zoneId: "discard" | "deck" }) {
  const definition = zones.find((zone) => zone.id === zoneId)!;
  const { cards, count } = useZonePresentation(zoneId, "table");
  const top = cards.at(-1);
  return (
    <DropArea
      binding={{
        interaction: "play.move",
        position: { zoneId, hostId: "table", index: cards.length },
      }}
      zone={{ zoneId, hostId: "table" }}
      visibility={definition.visibility}
      label={definition.name}
      data-testid={zoneId}
      className="grid justify-items-center p-3"
    >
      <Pile count={count} label={definition.name}>
        {top ? (
          <CardControl
            key={top.id}
            cardId={top.id}
            drag={{ interaction: "play.move" }}
            renderCard={face}
          />
        ) : null}
      </Pile>
    </DropArea>
  );
}

/**
 * A zone on the table. A card held near it is kept inside its edge until
 * pulled clear; over it, a gap at the end shows where the card lands and
 * gives it the size of the cards there.
 */
function TableZone() {
  const { cards } = useZonePresentation("table", "table");
  const overlay = useDragOverlay();
  const target = overlay?.target;
  const landing =
    !overlay?.settling &&
    target?.kind === "position" &&
    target.value.zoneId === "table";
  return (
    <DropArea
      binding={{
        interaction: "play.move",
        position: { zoneId: "table", hostId: "table", index: cards.length },
      }}
      zone={{ zoneId: "table", hostId: "table" }}
      visibility="public"
      label="Table"
      data-testid="table"
      className="flex min-h-44 w-full max-w-xl flex-wrap items-center gap-2 p-3"
    >
      {cards.map((card) => (
        <CardControl
          key={card.id}
          cardId={card.id}
          drag={{ interaction: "play.move" }}
          renderCard={face}
        />
      ))}
      {landing && (
        <div
          className="db-hand-insertion"
          style={{
            position: "static",
            width: "var(--card-w)",
            aspectRatio: "var(--card-aspect)",
          }}
          data-drop-landing="gap"
          data-testid="gap"
        />
      )}
    </DropArea>
  );
}

function Authority() {
  const state = useGame((game) =>
    JSON.stringify(
      Object.fromEntries(
        game.zones
          .getAll()
          .map((zone) => [zone.id, zone.getCards().map((card) => card.id)]),
      ),
    ),
  );
  return (
    <output hidden data-testid="authority">
      {state}
    </output>
  );
}

function Snapping() {
  const [source, setSource] = useState<CommandSource | null>(null);
  useEffect(() => {
    let active = true;
    let owned: CommandSource | undefined;
    void localSource(game, { players: 2, seed: 1 }).then((value) => {
      if (!active) return value.dispose();
      owned = value;
      setSource(value);
    });
    return () => {
      active = false;
      owned?.dispose();
    };
  }, []);
  if (!source) return <p>Loading…</p>;
  return (
    <GameProvider source={source}>
      <main className="db-table flex min-h-dvh flex-col items-center justify-between gap-4 p-3">
        <Authority />
        <div className="flex flex-wrap justify-center gap-4">
          <PileZone zoneId="discard" />
          <PileZone zoneId="deck" />
        </div>
        <TableZone />
        <Me />
      </main>
    </GameProvider>
  );
}
function Me() {
  const me = useGame((game) => game.me?.id ?? "player-1");
  return (
    <Hand
      zoneId="hand"
      hostId={me}
      label="Your hand"
      renderCard={face}
      reorder={{ interaction: "play.move" }}
    />
  );
}

const meta = {
  title: "Game feel/Card snapping",
  component: Snapping,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Snapping>;
export default meta;
/** Piles catch a card and draw it on their top; the table holds it at its edge. */
export const PilesAndZones: StoryObj<typeof meta> = {};
