import { useGame } from "../game";
import { HandDrawer } from "./dreamboard/hand-drawer";
import { PlayingCard } from "./dreamboard/playing-card";
import { Actions } from "./dreamboard/actions";
import { comparePlayingCards } from "./cards";

export function HandRow({ recipientName }: { recipientName: string }) {
  const game = useGame();
  const passing = game.phase.is("passing");
  const play = game.interactions.get("playing.playCard");
  const selected = game.zones.get("hand")?.getSelectedCardIds() ?? [];
  const byId = new Map(game.view?.hand.map((card) => [card.id, card]));
  return (
    <section className="grid gap-3" aria-label="Your cards">
      <HandDrawer
        zoneId="hand"
        label={`Your hand · ${game.view?.hand.length ?? 0} cards`}
        className="hearts-hand"
        sort={(left, right) =>
          comparePlayingCards(left.view ?? {}, right.view ?? {})
        }
        getCardLabel={(card) =>
          card.hidden
            ? "Face-down card"
            : `Select ${byId.get(card.id)?.name ?? card.id}`
        }
        renderCard={(card) => {
          const visible = card.hidden ? undefined : byId.get(card.id);
          return visible ? (
            <PlayingCard
              rank={visible.properties.rank}
              suit={visible.properties.suit}
              state={
                card.getIsSelected()
                  ? "selected"
                  : card.getIsEligible()
                    ? "eligible"
                    : "idle"
              }
            />
          ) : (
            <span>Face-down card</span>
          );
        }}
      />
      {game.phase.is("playing") && (
        <p>
          {play?.getIsAvailable()
            ? "Tap or press Enter on a legal card to play it."
            : "Waiting for the active player."}
        </p>
      )}
      {passing && (
        <>
          <p aria-live="polite">
            Passing to {recipientName}: {selected.length}/3 selected
            {selected.length > 0
              ? ` · ${selected.map((id) => byId.get(id)?.name ?? id).join(", ")}`
              : ""}
          </p>
          {game.interactions.get("passing.submit")?.getIsAvailable() && (
            <Actions
              interaction="passing.submit"
              className="flex flex-wrap gap-3 [&_button]:min-h-11 [&_button]:rounded-xl [&_button]:border-2 [&_button]:border-slate-900 [&_button]:bg-white [&_button]:px-4 [&_button]:py-2 [&_button]:disabled:opacity-50"
            />
          )}
        </>
      )}
    </section>
  );
}
