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
import { Pile } from "../items/pile";
import { DropArea } from "../items/drop-area";
import { handGame } from "./hand-game";
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

function Table() {
  const deck = useGame((game) => game.zones.find("deck")?.count ?? 0);
  const draw = useGame((game) => game.interactions.find("play.draw"));
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
      <p className="m-0 text-sm">
        Tap a card for its actions, hold or hover to look closer, or drag it up.
      </p>
      <div className="flex flex-wrap items-start justify-center gap-4">
        <div className="grid justify-items-center gap-2" style={tableCards}>
          <Pile label="Deck" count={deck} data-zone="deck">
            <CardBack />
          </Pile>
          {draw && (
            <Button className="min-h-11" {...draw.getSubmitProps()}>
              Draw
            </Button>
          )}
        </div>
        <Area zoneId="table" label="Table" interaction="play.play" />
        <Area zoneId="discard" label="Discard" interaction="play.discard" top />
      </div>
      <Hand
        zoneId="hand"
        label="Your hand"
        renderCard={renderCard}
        getCardLabel={cardLabel}
      />
    </main>
  );
}

function OwnedSource({
  source,
}: {
  source: { value: CommandSource; adopted: boolean };
}) {
  useLayoutEffect(() => {
    source.adopted = true;
  }, [source]);
  return (
    <GameProvider source={source.value}>
      <Table />
    </GameProvider>
  );
}
function HandTable() {
  const [source, setSource] = useState<{
    value: CommandSource;
    adopted: boolean;
  } | null>(null);
  useEffect(() => {
    let active = true;
    let created: { value: CommandSource; adopted: boolean } | undefined;
    void localSource(handGame, { players: 2, seed: 3 }).then((value) => {
      if (!active) return value.dispose();
      created = { value, adopted: false };
      setSource(created);
    });
    return () => {
      active = false;
      // The provider owns the source once it commits.
      if (created && !created.adopted) created.value.dispose();
    };
  }, []);
  return source ? <OwnedSource source={source} /> : <p>Loading…</p>;
}
const meta = {
  title: "Game feel/Hand",
  component: HandTable,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HandTable>;
export default meta;
export const FannedHand: StoryObj<typeof meta> = {};
