import { useId } from "react";
import {
  useGame,
  useDragOverlay,
  useGameShortcuts,
  useShortcutTarget,
  type GamePlayer,
} from "../game";
import { HandDrawer } from "./dreamboard/hand-drawer";
import { PlayingCard } from "./dreamboard/playing-card";
import { CardBack, type CardState } from "./dreamboard/card";
import { Actions } from "./dreamboard/actions";

import type { GameCard as HandCard } from "../game";
// Module scope keeps the fanned cards memoized through a drag.
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
      <HandOrder hostId={me.id} />
      <HandDrawer
        zoneId="hand"
        hostId={me.id}
        label={`Your hand · ${game.view?.hand.length ?? 0} cards`}
        className="hearts-hand"
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

/** Hand order is a local presentation preference, including while waiting. */
function HandOrder({ hostId }: { hostId: GamePlayer["id"] }) {
  const game = useGame();
  const hand = game.zones.get("hand", hostId);
  const mode = game.hand.getSortMode(hand);
  const dragging = useDragOverlay() !== null;
  const name = useId();
  const shortcut = useShortcutTarget({ kind: "zone", zoneId: "hand", hostId });
  useGameShortcuts({
    bindings: [
      {
        kind: "local",
        keys: ["s"],
        label: "Change hand order",
        target: "zone",
        zoneId: "hand",
        getIsAvailable: ({ target }) => target.hostId === hostId && !dragging,
        run: () =>
          game.hand.setSortMode(hand, mode === "suit" ? "rank" : "suit"),
      },
    ],
  });
  return (
    <fieldset disabled={dragging} className="hearts-hand-order">
      <legend>Sort cards</legend>
      <div className="hearts-hand-order-options">
        {game.hand.getSortModes(hand).map((id) => (
          <label key={id}>
            <input
              {...shortcut.props}
              type="radio"
              name={name}
              value={id}
              checked={mode === id}
              onChange={() => game.hand.setSortMode(hand, id)}
            />
            <span>{id === "suit" ? "Suit" : "Rank"}</span>
          </label>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        Press S with a card or sort option focused to change order.
      </p>
    </fieldset>
  );
}
