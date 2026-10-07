import { Popover } from "@base-ui/react/popover";
import { Button } from "@/components/ui/button";
import {
  useGame,
  useShortcutHints,
  type GameCard as Card,
  type CardId,
} from "@game";
import "./tokens.css";

/** The interactions this card can start now, in the game's order. */
export function getCardActions(card: Card) {
  return card
    .getInteractions()
    .filter((route) => card.getCanSelect({ interaction: route.key }));
}
/** Why a card has no action: its interaction's reason, or a plain fallback. */
export function getCardUnavailableReason(card: Card) {
  return (
    card
      .getInteractions()
      .map((route) => route.getUnavailableReason())
      .find((reason) => reason !== null) ?? "You can't play this card now."
  );
}

export interface CardActionsProps {
  cardId: CardId;
  /** The card's own control; the menu opens above it and returns focus to it. */
  anchor: HTMLElement;
  onClose(): void;
  onInspect?(): void;
}
/**
 * A menu of the card's available actions above the card, the first one
 * primary. Choosing one selects the card for that interaction, which submits
 * it when the interaction commits on its own. A card without an action shows
 * why instead.
 */
export function CardActions({
  cardId,
  anchor,
  onClose,
  onInspect,
}: CardActionsProps) {
  const hints = useShortcutHints({ kind: "card", value: cardId });
  const card = useGame((game) => game.cards.find(cardId));
  if (!card) return null;
  const actions = getCardActions(card);
  return (
    <Popover.Root
      open
      onOpenChange={(open, details) => {
        // Pressing the card again toggles the menu through the card itself.
        if (
          !open &&
          !(
            details.reason === "outside-press" &&
            details.event.target instanceof Node &&
            anchor.contains(details.event.target)
          )
        )
          onClose();
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          side="top"
          sideOffset={10}
          collisionPadding={8}
          className="z-50"
        >
          <Popover.Popup
            finalFocus={() => anchor}
            aria-label="Card actions"
            className="db-card-actions"
          >
            <Popover.Arrow className="db-card-action-arrow" />
            {actions.length ? (
              actions.map((route, index) => (
                <Button
                  key={route.key}
                  type="button"
                  variant={index ? "outline" : "default"}
                  className="min-h-11 px-4"
                  data-action="card-action"
                  data-interaction={route.key}
                  onClick={() => {
                    card.select({ interaction: route.key });
                    onClose();
                  }}
                >
                  {route.label}
                  {hints
                    .filter((hint) => hint.interaction === route.key)
                    .map((hint) => (
                      <kbd key={hint.label} className="ml-2 text-xs opacity-70">
                        {hint.keys.join(" / ")}
                      </kbd>
                    ))}
                </Button>
              ))
            ) : (
              <p role="status" className="m-0 px-2 py-1 text-sm">
                {getCardUnavailableReason(card)}
              </p>
            )}
            {onInspect && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 px-4"
                onClick={onInspect}
              >
                Inspect card
              </Button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
