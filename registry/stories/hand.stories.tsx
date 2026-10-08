import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import { z } from "zod";
import { localSource } from "@dreamboard-games/sdk/testing";
import { handFanPresets, type CommandSource } from "@dreamboard-games/sdk";
import { Button } from "@/components/ui/button";
import { GameProvider, useGame } from "../typecheck/game";
import { CardControl } from "../items/card-control";
import { Hand } from "../items/hand";
import { Card, CardBack, type CardState } from "../items/card";
import { PlayingCard } from "../items/playing-card";
import { DrawPile } from "../items/draw-pile";
import { DropArea } from "../items/drop-area";
import { Seat, type SeatNumber } from "../items/seat";
import { TurnBanner } from "../items/turn-banner";
import { handGame, createHandGame, crowdedHandGame } from "./hand-game";
type HandSource = CommandSource & { switchSeat(playerId: string): void };
interface CreatedHandSource {
  value: HandSource;
  adopted: boolean;
  settleDraw(accepted: boolean): void;
}
import type { GameCard } from "../typecheck/game";
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
function renderTextCard(card: GameCard, state: CardState) {
  return (
    <Card
      state={state}
      style={{
        aspectRatio: "5 / 8",
        height: "calc(var(--card-w) * 8 / 5)",
        overflow: "hidden",
        padding: "calc(var(--card-w) * 0.06)",
        fontSize: "calc(var(--card-w) * 0.06)",
        lineHeight: 1.25,
        gap: "calc(var(--card-w) * 0.03)",
        alignContent: "start",
      }}
    >
      <strong style={{ fontSize: "calc(var(--card-w) * 0.09)" }}>
        Ember guardian
      </strong>
      <span>2 energy · Ally</span>
      <div
        style={{
          width: "100%",
          height: "calc(var(--card-w) * 0.3)",
          background: "linear-gradient(135deg, #edb571, #804f65)",
          borderRadius: "0.2rem",
        }}
      />
      <p style={{ margin: 0 }}>
        Choose a friendly character. Prevent the next 3 damage dealt to it this
        turn.
      </p>
      <p style={{ margin: 0 }}>When this card leaves your hand, draw a card.</p>
      <em>Even a small flame can keep the darkness away.</em>
    </Card>
  );
}
function renderWideCard(card: GameCard, state: CardState) {
  return (
    <Card
      state={state}
      style={{
        aspectRatio: "8 / 5",
        height: "calc(var(--card-w) * 5 / 8)",
        overflow: "hidden",
        padding: "calc(var(--card-w) * 0.06)",
        fontSize: "calc(var(--card-w) * 0.075)",
        lineHeight: 1.25,
      }}
    >
      <strong>Mountain passage</strong>
      <span>Move up to two allies into an adjacent region.</span>
    </Card>
  );
}
function cardLabel(card: GameCard) {
  const shown = faceOf(card);
  return shown ? `${shown.rank} of ${shown.suit}` : "Face-down card";
}
const tableCards = { "--card-w": "var(--card-w-table)" } as CSSProperties;
// A tucked hand shows larger cards, under a third of the window high.
const tuckedCards = {
  "--card-w-hand": "clamp(5rem, min(20vw, 20dvh), 10rem)",
} as CSSProperties;
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
  const cards = useGame(
    (game) => game.zones.find(zoneId, "table")?.getCards() ?? [],
  );
  const shown = top ? cards.slice(-1) : cards;
  const canDrag = useGame(
    (game) =>
      game.zones
        .find(zoneId, "table")
        ?.getCards()
        .some((card) => game.drag.getCanDrag(card.id)) ?? false,
  );
  return (
    <DropArea
      binding={{ interaction }}
      label={label}
      data-zone={zoneId}
      className="grid min-h-36 min-w-28 content-center justify-items-center gap-2 p-3"
    >
      <output hidden data-testid={`${zoneId}-can-drag`}>
        {String(canDrag)}
      </output>
      <div className="flex flex-wrap justify-center gap-2" style={tableCards}>
        {shown.map((card) => (
          <CardControl
            key={card.id}
            cardId={card.id}
            drag={false}
            renderCard={renderCard}
            getCardLabel={cardLabel}
          />
        ))}
      </div>
      <span className="text-sm">
        {label} · {cards.length}
      </span>
    </DropArea>
  );
}

function Table({
  onSwitchSeat,
  appearance,
  drawLifecycle = false,
  tucked = false,
  sorting = false,
}: {
  onSwitchSeat(): void;
  appearance?: "text" | "wide";
  drawLifecycle?: boolean;
  tucked?: boolean;
  sorting?: boolean;
}) {
  const [showPile, setShowPile] = useState(true);
  const hostId = useGame((game) => game.me?.id);
  const endTurn = useGame((game) => game.interactions.find("play.endTurn"));
  const zones = useGame((game) =>
    JSON.stringify(
      game.zones
        .getAll()
        .map((zone) => [zone.id, zone.getCards().map((card) => card.id)]),
    ),
  );
  if (hostId === undefined) return null;
  return (
    <main
      className={`db-table flex min-h-dvh flex-col justify-between gap-3 p-3 ${tucked ? "pb-0" : ""}`}
    >
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
          {drawLifecycle && (
            <Button onClick={() => setShowPile(false)}>Hide deck</Button>
          )}
        </div>
      </header>
      <p className="m-0 text-sm">
        Tap a card for its actions, hold or hover to look closer, or drag it up.
      </p>
      <div className="flex flex-wrap items-start justify-center gap-4">
        <div className="grid justify-items-center gap-2" style={tableCards}>
          {showPile && (
            <DrawPile
              zoneId="deck"
              hostId="table"
              destinationHostId={hostId}
              interaction="play.draw"
              destinationZoneId="hand"
              label="Deck"
            />
          )}
        </div>
        <Area zoneId="table" label="Table" interaction="play.play" />
        <Area zoneId="discard" label="Discard" interaction="play.discard" top />
      </div>
      {/* A tucked hand sits on the bottom edge, which hides part of each card. */}
      <div className="grid gap-2" style={tucked ? tuckedCards : undefined}>
        <Seats mine />
        {sorting && <HandOrder hostId={hostId} />}
        <Hand
          zoneId="hand"
          hostId={hostId}
          label="Your hand"
          options={tucked ? handFanPresets.tucked : undefined}
          renderCard={
            appearance === "text"
              ? renderTextCard
              : appearance === "wide"
                ? renderWideCard
                : renderCard
          }
          getCardLabel={cardLabel}
        />
      </div>
      <TurnBanner />
    </main>
  );
}

/** Authored story controls demonstrate a game selecting its own order. */
function HandOrder({ hostId }: { hostId: GameCard["hostId"] }) {
  const game = useGame();
  const hand = game.zones.get("hand", hostId);
  return (
    <div className="flex gap-2">
      <Button onClick={() => game.interactions.get("play.draw").submit()}>
        Draw card
      </Button>
      {game.hand.getSortModes(hand).map((mode) => (
        <Button
          key={mode}
          variant="outline"
          aria-pressed={game.hand.getSortMode(hand) === mode}
          onClick={() => game.hand.setSortMode(hand, mode)}
        >
          {mode === "dealt" ? "Dealt order" : "Reverse order"}
        </Button>
      ))}
    </div>
  );
}

function OwnedSource({
  source,
  manualDraw,
  appearance,
  drawLifecycle,
  tucked,
  sorting,
}: {
  appearance?: "text" | "wide";
  source: CreatedHandSource;
  manualDraw: boolean;
  drawLifecycle: boolean;
  tucked: boolean;
  sorting: boolean;
}) {
  useLayoutEffect(() => {
    source.adopted = true;
  }, [source]);
  const [seat, setSeat] = useState("player-1");
  return (
    <GameProvider source={source.value}>
      {manualDraw && (
        <div className="flex gap-2">
          <Button onClick={() => source.settleDraw(true)}>Confirm draw</Button>
          <Button onClick={() => source.settleDraw(false)}>Reject draw</Button>
        </div>
      )}
      <Table
        appearance={appearance}
        drawLifecycle={drawLifecycle}
        tucked={tucked}
        sorting={sorting}
        onSwitchSeat={() => {
          const next = seat === "player-1" ? "player-2" : "player-1";
          source.value.switchSeat(next);
          setSeat(next);
        }}
      />
    </GameProvider>
  );
}
function HandTable({
  manualDraw = false,
  emptyHand = false,
  crowded = false,
  appearance,
  drawLifecycle = false,
  tucked = false,
  sorting = false,
}: {
  appearance?: "text" | "wide";
  manualDraw?: boolean;
  emptyHand?: boolean;
  crowded?: boolean;
  drawLifecycle?: boolean;
  tucked?: boolean;
  sorting?: boolean;
}) {
  const [source, setSource] = useState<CreatedHandSource | null>(null);
  useEffect(() => {
    let active = true;
    let created: CreatedHandSource | undefined;
    void localSource(
      emptyHand ? createHandGame(0) : crowded ? crowdedHandGame : handGame,
      {
        players: 2,
        seed: 3,
      },
    ).then((value) => {
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
  }, [manualDraw, emptyHand, crowded]);
  return source ? (
    <OwnedSource
      source={source}
      manualDraw={manualDraw}
      appearance={appearance}
      drawLifecycle={drawLifecycle}
      tucked={tucked}
      sorting={sorting}
    />
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
export const DrawLifecycle: StoryObj<typeof meta> = {
  args: { drawLifecycle: true },
};

export const PendingDraw: StoryObj<typeof meta> = {
  args: { manualDraw: true },
};
export const EmptyHand: StoryObj<typeof meta> = {
  args: { emptyHand: true, manualDraw: true },
};

export const TextHand: StoryObj<typeof meta> = { args: { appearance: "text" } };
export const WideHand: StoryObj<typeof meta> = { args: { appearance: "wide" } };
export const TuckedHand: StoryObj<typeof meta> = {
  args: { appearance: "text", tucked: true },
};
export const TuckedPlayingCards: StoryObj<typeof meta> = {
  args: { tucked: true },
};
export const CrowdedHand: StoryObj<typeof meta> = {
  args: { crowded: true, tucked: true },
};

export const SortingHand: StoryObj<typeof meta> = {
  args: { sorting: true },
};
export const SortingTuckedHand: StoryObj<typeof meta> = {
  args: { sorting: true, tucked: true },
};
