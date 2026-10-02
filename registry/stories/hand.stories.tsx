import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import { z } from "zod";
import { localSource } from "@dreamboard-games/sdk/testing";
import type { CommandSource } from "@dreamboard-games/sdk";
import { Button } from "@/components/ui/button";
import { GameProvider, useGame } from "../typecheck/game";
import { Hand } from "../items/hand";
import { CardBack, type CardState } from "../items/card";
import { PlayingCard } from "../items/playing-card";
import { DrawPile } from "../items/draw-pile";
import { CardTable } from "../items/card-table";
import { DropArea } from "../items/drop-area";
import { Seat, type SeatNumber } from "../items/seat";
import { TurnBanner } from "../items/turn-banner";
import { handGame } from "./hand-game";
type HandSource = CommandSource & { switchSeat(playerId: string): void };
interface CreatedHandSource {
  value: HandSource;
  adopted: boolean;
  settleDraw(accepted: boolean): void;
}
type Model = Parameters<Parameters<typeof useGame>[0]>[0];
type GameCard = NonNullable<ReturnType<Model["cards"]["get"]>>;
const face = z.object({
  suit: z.enum(["hearts", "diamonds", "clubs", "spades"]),
  rank: z.string(),
});
const faceOf = (card: GameCard) =>
  card.hidden ? null : face.parse(card.view.properties);
// Module scope keeps the hand's cards memoized through a drag.
function renderCard(card: GameCard, state: CardState) {
  const shown = faceOf(card);
  return shown ? <PlayingCard {...shown} state={state} /> : <CardBack />;
}
function cardLabel(card: GameCard) {
  const shown = faceOf(card);
  return shown ? `${shown.rank} of ${shown.suit}` : "Face-down card";
}
const tableCards = { "--card-w": "var(--card-w-table)" } as CSSProperties;
const handCounts = z.object({ handCounts: z.record(z.string(), z.number()) });

function Seats({ mine }: { mine: boolean }) {
  const players = useGame((game) => game.players.getAll());
  const active = useGame((game) => game.turn.activePlayerIds);
  const view = useGame((game) => game.view);
  const counts = handCounts.safeParse(view).data?.handCounts ?? {};
  return players
    .filter((player) => player.isMe === mine)
    .map((player) => (
      <Seat
        key={player.id}
        playerId={player.id}
        name={player.name}
        seat={(player.index + 1) as SeatNumber}
        you={player.isMe}
        active={active.includes(player.id)}
        cards={player.isMe ? undefined : counts[player.id]}
        className="min-w-36"
      />
    ));
}

/** Cards on the table share their hand slot's `layoutId`, so Motion carries them across. */
function Area({
  zoneId,
  label,
  interaction,
  top,
}: {
  zoneId: "table" | "discard";
  label: string;
  interaction: string;
  top?: boolean;
}) {
  const cards = useGame((game) => game.zones.find(zoneId)?.getCards() ?? []);
  const shown = top ? cards.slice(-1) : cards;
  return (
    <DropArea
      binding={{ interaction }}
      label={label}
      data-zone={zoneId}
      className="grid min-h-36 min-w-28 content-center justify-items-center gap-2 p-3"
    >
      <div className="flex flex-wrap justify-center gap-2" style={tableCards}>
        {shown.map((card) => {
          const shownFace = faceOf(card);
          return shownFace ? (
            <PlayingCard key={card.id} layoutId={card.id} {...shownFace} />
          ) : null;
        })}
      </div>
      <span className="text-sm">
        {label} · {cards.length}
      </span>
    </DropArea>
  );
}

function Table({ onSwitchSeat }: { onSwitchSeat(): void }) {
  const endTurn = useGame((game) => game.interactions.find("play.endTurn"));
  const zones = useGame((game) =>
    JSON.stringify(
      game.zones
        .getAll()
        .map((zone) => [zone.id, zone.getCards().map((card) => card.id)]),
    ),
  );
  return (
    <main className="db-table flex min-h-dvh flex-col justify-between gap-3 p-3">
      <output data-testid="table-cards" hidden>
        {zones}
      </output>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <Seats mine={false} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="min-h-11" onClick={onSwitchSeat}>
            Switch seat
          </Button>
          {endTurn && (
            <Button className="min-h-11" {...endTurn.getSubmitProps()}>
              End turn
            </Button>
          )}
        </div>
      </header>
      <p className="m-0 text-sm">
        Tap a card for its actions, hold or hover to look closer, or drag it up.
      </p>
      <div className="flex flex-wrap items-start justify-center gap-4">
        <div className="grid justify-items-center gap-2" style={tableCards}>
          <DrawPile
            zoneId="deck"
            interaction="play.draw"
            destinationZoneId="hand"
            label="Deck"
          />
        </div>
        <Area zoneId="table" label="Table" interaction="play.play" />
        <Area zoneId="discard" label="Discard" interaction="play.discard" top />
      </div>
      <div className="grid gap-2">
        <Seats mine />
        <Hand
          zoneId="hand"
          label="Your hand"
          renderCard={renderCard}
          getCardLabel={cardLabel}
        />
      </div>
      <TurnBanner />
    </main>
  );
}

function OwnedSource({
  source,
  manualDraw,
}: {
  source: CreatedHandSource;
  manualDraw: boolean;
}) {
  useLayoutEffect(() => {
    source.adopted = true;
  }, [source]);
  const [seat, setSeat] = useState("player-1");
  return (
    <GameProvider source={source.value}>
      <CardTable>
        {manualDraw && (
          <div className="flex gap-2">
            <Button onClick={() => source.settleDraw(true)}>
              Confirm draw
            </Button>
            <Button onClick={() => source.settleDraw(false)}>
              Reject draw
            </Button>
          </div>
        )}
        <Table
          onSwitchSeat={() => {
            const next = seat === "player-1" ? "player-2" : "player-1";
            source.value.switchSeat(next);
            setSeat(next);
          }}
        />
      </CardTable>
    </GameProvider>
  );
}
function HandTable({ manualDraw = false }: { manualDraw?: boolean }) {
  const [source, setSource] = useState<CreatedHandSource | null>(null);
  useEffect(() => {
    let active = true;
    let created: CreatedHandSource | undefined;
    void localSource(handGame, { players: 2, seed: 3 }).then((value) => {
      if (!active) return value.dispose();
      let settle: ((accepted: boolean) => void) | null = null;
      const wrapped: HandSource = {
        store: value.store,
        switchSeat(playerId) {
          settle?.(false);
          value.switchSeat(playerId);
        },
        cancel: (id) => value.cancel(id),
        dispose() {
          settle?.(false);
          value.dispose();
        },
        async submit(id, params) {
          if (manualDraw && id === "draw") {
            const accepted = await new Promise<boolean>((resolve) => {
              settle = resolve;
            });
            settle = null;
            if (!accepted)
              return {
                accepted: false,
                errorCode: "DRAW_REJECTED",
                message: "The draw was rejected.",
              };
          }
          return value.submit(id, params);
        },
      };
      created = {
        value: wrapped,
        adopted: false,
        settleDraw(accepted) {
          settle?.(accepted);
        },
      };
      setSource(created);
    });
    return () => {
      active = false;
      // The provider owns the source once it commits.
      if (created && !created.adopted) created.value.dispose();
    };
  }, [manualDraw]);
  return source ? (
    <OwnedSource source={source} manualDraw={manualDraw} />
  ) : (
    <p>Loading…</p>
  );
}
const meta = {
  title: "Game feel/Hand",
  component: HandTable,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HandTable>;
export default meta;
export const FannedHand: StoryObj<typeof meta> = {};

export const PendingDraw: StoryObj<typeof meta> = {
  args: { manualDraw: true },
};
