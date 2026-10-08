import {
  useCardGesture,
  useDragOverlay,
  useGame,
  type CardDrag,
  type CardId,
  type GameCard,
} from "@game";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CardActions, getCardActions } from "./card-actions";
import { CardPreview } from "./card-preview";
import type { CardState } from "./card";

export interface CardControlProps {
  cardId: CardId;
  drag: CardDrag;
  /** Shows the face without its own gestures, menu or preview, as in a hand too crowded to aim at. */
  inert?: boolean;
  renderCard(card: GameCard, state: CardState): ReactNode;
  /**
   * Draws the inspected face. Leave out table markers such as damage or
   * exhaustion; defaults to the idle card.
   */
  renderPreview?(card: GameCard): ReactNode;
  getCardLabel?(card: GameCard): string;
  choosing?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  /** Reports the action menu opening and closing, so a hand can hold the card still. */
  onMenuChange?(open: boolean): void;
  /** An action was chosen from the menu, as when a sheet should get out of the way. */
  onAction?(): void;
  /** A hand can position the control and animate its arrival. */
  children?(slot: {
    raised: boolean;
    hovered: boolean;
    anchor: HTMLElement | null;
    control: ReactNode;
  }): ReactNode;
}

/** The menu opener owns activation; card.select runs only when an action is chosen. */
export function CardControl({
  cardId,
  drag,
  inert = false,
  renderCard,
  renderPreview = (card) => renderCard(card, "idle"),
  getCardLabel,
  choosing = false,
  disabled = false,
  style,
  className = "db-hand-card",
  onMenuChange,
  onAction,
  children,
}: CardControlProps) {
  const card = useGame((game) => game.cards.find(cardId));
  const gesture = useCardGesture(cardId, { drag });
  const overlay = useDragOverlay();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(0);
  const dragging = overlay !== null;
  const perspective = useGame((game) => game.snapshot?.me);
  useEffect(() => {
    setOpen(false);
    setInspecting(false);
  }, [perspective]);
  useEffect(() => {
    if (dragging) {
      setOpen(false);
      setInspecting(false);
    }
  }, [dragging]);
  const menu = open && !dragging;
  useEffect(() => {
    if (!menu) return;
    onMenuChange?.(true);
    return () => onMenuChange?.(false);
  }, [menu, onMenuChange]);
  if (!card) return null;
  const selected = card.getIsSelected();
  const raised = selected || (open && card.getIsEligible());
  const state: CardState = raised
    ? "selected"
    : card.getIsEligible()
      ? "eligible"
      : choosing
        ? "dimmed"
        : "idle";
  const control = inert ? (
    <div ref={setAnchor} className={className} data-card={card.id} aria-hidden>
      {renderCard(card, state)}
    </div>
  ) : (
    <button
      {...gesture.props}
      ref={setAnchor}
      type="button"
      className={className}
      disabled={disabled}
      style={{
        ...gesture.props.style,
        ...style,
        ...(overlay?.cardId === cardId ? { visibility: "hidden" } : {}),
      }}
      data-value={card.id}
      data-card={card.id}
      data-action="select"
      data-hovered={(gesture.isActive && !dragging) || undefined}
      data-disabled={String(!card.getCanSelect())}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-pressed={selected}
      aria-label={
        getCardLabel?.(card) ??
        (card.hidden ? "Face-down card" : String(card.id))
      }
      data-shake={shake ? (shake % 2 ? "a" : "b") : undefined}
      onClick={() => {
        const actions = getCardActions(card);
        const pick = actions.length === 1 ? actions[0] : null;
        if (
          pick
            ?.getInputs()
            .some(
              (input) =>
                input.domainType === "cardTarget" &&
                input.selectionMode !== "single",
            )
        ) {
          card.select({ interaction: pick.key });
          return;
        }
        setOpen(actions.length ? !open : true);
        if (!actions.length) setShake((value) => value + 1);
      }}
    >
      {renderCard(card, state)}
    </button>
  );
  return (
    <>
      {children
        ? children({
            raised,
            hovered: gesture.isActive && !dragging,
            anchor,
            control,
          })
        : control}
      {open && !inert && !dragging && anchor && (
        <CardActions
          cardId={cardId}
          anchor={anchor}
          onAction={onAction}
          onClose={() => setOpen(false)}
          onInspect={
            card.hidden
              ? undefined
              : () => {
                  setOpen(false);
                  setInspecting(true);
                }
          }
        />
      )}
      {(inspecting || gesture.inspecting) && !inert && !card.hidden && (
        <CardPreview
          via={inspecting ? "action" : gesture.inspecting!}
          anchor={anchor}
          onClose={() => setInspecting(false)}
        >
          {renderPreview(card)}
        </CardPreview>
      )}
    </>
  );
}
