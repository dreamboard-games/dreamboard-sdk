import { useGame } from "../game";
import { HandDrawer } from "./dreamboard/hand-drawer";
import { PlayingCard } from "./dreamboard/playing-card";
import { CardBack, type CardState } from "./dreamboard/card";
import { Actions } from "./dreamboard/actions";
import { comparePlayingCards } from "./cards";

import type { GameCard as HandCard } from "../game";
// Module scope keeps the fanned cards memoized through a drag.
const sortCards = (left: HandCard, right: HandCard) =>
  comparePlayingCards(left.view ?? {}, right.view ?? {});
const cardLabel = (card: HandCard) =>
  card.hidden ? "Face-down card" : (card.view.name ?? card.id);
function renderCard(card: HandCard, state: CardState) {
  return card.hidden ? (
    <CardBack />
  ) : (
    <PlayingCard
      rank={card.view.properties.rank}
      suit={card.view.properties.suit}
      state={state}
    />
  );
}

export function HandRow({ recipientName }: { recipientName: string }) {
  const game = useGame();
  const me = game.me;
  if (!me) return null;
  const passing = game.phase.is("passing");
  const play = game.interactions.find("playing.playCard");
  const selected = game.zones.find("hand", me.id)?.getSelectedCardIds() ?? [];
  return (
    <section className="grid gap-3" aria-label="Your cards">
      <HandDrawer
        zoneId="hand"
        hostId={me.id}
        label={`Your hand · ${game.view?.hand.length ?? 0} cards`}
        className="hearts-hand"
        sort={sortCards}
        getCardLabel={cardLabel}
        renderCard={renderCard}
      />
      {game.phase.is("playing") && (
        <p>
          {play?.getIsAvailable()
            ? "Tap a legal card and choose Play card, or drag it up."
            : "Waiting for the active player."}
        </p>
      )}
      {passing && (
        <>
          <p aria-live="polite">
            Passing to {recipientName}: {selected.length}/3 selected
            {selected.length > 0
              ? ` · ${selected
                  .map(
                    (id) =>
                      game.view?.hand.find((card) => card.id === id)?.name ??
                      id,
                  )
                  .join(", ")}`
              : ""}
          </p>
          {game.interactions.find("passing.submit")?.getIsAvailable() && (
            <Actions
              interaction="passing.submit"
              className="flex flex-wrap gap-3 [&_button]:min-h-11 [&_button]:rounded-xl [&_button]:border-2 [&_button]:border-slate-900 [&_button]:bg-white [&_button]:text-slate-900 [&_button]:px-4 [&_button]:py-2 [&_button]:disabled:opacity-50"
            />
          )}
        </>
      )}
    </section>
  );
}
