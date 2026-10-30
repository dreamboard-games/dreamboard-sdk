import { Popover } from "@base-ui/react/popover";
import { Button } from "@/components/ui/button";
import {
  useGame,
  useShortcutHints,
  type GameCard as Card,
  type CardId,
} from "@game";
import type { ReactNode } from "react";
import "./tokens.css";

/** The bound game's canonical interaction type. */
export type CardAction = ReturnType<Card["getInteractions"]>[number];

/** Resolve an eligible card-target input, preferring one still awaiting a value. */
export function getCardActionInput(route: CardAction, cardId: CardId) {
  const inputs = route
    .getInputs()
    .filter((input) => input.domainType === "cardTarget")
    .filter((input) => !input.getTargetProps(cardId).disabled);
  return inputs.find((input) => !input.getIsReady()) ?? inputs[0];
}

/** The interactions this card can start now, in the game's order. */
export function getCardActions(card: Card) {
  return card
    .getInteractions()
    .filter((route) => getCardActionInput(route, card.id));
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
  /** Handle selection instead of selecting this card as the interaction input. */
  onChooseAction?(route: CardAction): void;
  /** An action was chosen; the menu then closes. */
  onAction?(): void;
  onClose(): void;
  onInspect?(): void;
  /** More actions after the card's own, such as its pile's. */
  children?: ReactNode;
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
  onChooseAction,
  onAction,
  onClose,
  onInspect,
  children,
}: CardActionsProps) {
  const hints = useShortcutHints({ kind: "card", value: cardId });
  const card = useGame((game) => game.cards.find(cardId));
  if (!card) return null;
  const actions = getCardActions(card);
  function choose(action: CardAction) {
    if (onChooseAction) onChooseAction(action);
    else getCardActionInput(action, cardId)?.getSelectHandler(cardId)();
    onAction?.();
    onClose();
  }
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
            onKeyDown={(event) => {
              if (
                event.defaultPrevented ||
                event.repeat ||
                event.nativeEvent.isComposing ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey
              )
                return;
              const matching = actions.filter(
                (action) =>
                  getCardActionInput(action, cardId) &&
                  hints.some(
                    (hint) =>
                      hint.kind === "interaction" &&
                      hint.interaction === action.key &&
                      hint.keys.includes(event.key),
                  ),
              );
              if (matching.length !== 1) return;
              if (onChooseAction) {
                event.preventDefault();
                choose(matching[0]);
                return;
              }
              const pending = card.game.shortcuts.handle(event.key, {
                kind: "card",
                value: cardId,
              });
              if (!pending) return;
              event.preventDefault();
              onAction?.();
              onClose();
              void pending
                .then((result) => {
                  if (result.kind === "interaction" && !result.result.accepted)
                    card.game
                      .getOptions()
                      .onError?.(
                        new Error(
                          result.result.message ?? result.result.errorCode,
                          { cause: result.result },
                        ),
                      );
                })
                .catch((error) => card.game.getOptions().onError?.(error));
            }}
          >
            <Popover.Arrow className="db-card-action-arrow" />
            {actions.length ? (
              actions.map((action, index) => (
                <Button
                  key={action.key}
                  type="button"
                  variant={index ? "outline" : "default"}
                  className="min-h-11 px-4"
                  disabled={!getCardActionInput(action, cardId)}
                  title={
                    !getCardActionInput(action, cardId)
                      ? (action.getUnavailableReason() ??
                        getCardUnavailableReason(card))
                      : undefined
                  }
                  data-action="card-action"
                  data-interaction={action.key}
                  aria-keyshortcuts={
                    hints
                      .filter(
                        (hint) =>
                          hint.kind === "interaction" &&
                          hint.interaction === action.key,
                      )
                      .flatMap((hint) => hint.keys)
                      .join(" ") || undefined
                  }
                  onClick={() => choose(action)}
                >
                  {action.label}
                  {hints
                    .filter(
                      (hint) =>
                        hint.kind === "interaction" &&
                        hint.interaction === action.key,
                    )
                    .flatMap((hint) => hint.keys)
                    .map((name) => (
                      <kbd
                        key={name}
                        aria-hidden="true"
                        className="db-kbd ml-2"
                      >
                        {name}
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
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
