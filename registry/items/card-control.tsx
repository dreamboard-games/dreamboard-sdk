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
  renderCard(card: GameCard, state: CardState): ReactNode;
  getCardLabel?(card: GameCard): string;
  choosing?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  /** Reports the action menu opening and closing, so a hand can hold the card still. */
  onMenuChange?(open: boolean): void;
  /** A hand can position the control and animate its arrival. */
  children?(slot: {
    raised: boolean;
    hovered: boolean;
    anchor: HTMLButtonElement | null;
    control: ReactNode;
  }): ReactNode;
}

/** The menu opener owns activation; card.select runs only when an action is chosen. */
export function CardControl({
  cardId,
  drag,
  renderCard,
  getCardLabel,
  choosing = false,
  disabled = false,
  style,
  className = "db-hand-card",
  onMenuChange,
  children,
}: CardControlProps) {
  const card = useGame((game) => game.cards.find(cardId));
  const gesture = useCardGesture(cardId, { drag });
  const overlay = useDragOverlay();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
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
  const control = (
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
      {open && !dragging && anchor && (
        <CardActions
          cardId={cardId}
          anchor={anchor}
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
      {(inspecting || gesture.inspecting) && !card.hidden && (
        <CardPreview
          via={inspecting ? "action" : gesture.inspecting!}
          anchor={anchor}
          onClose={() => setInspecting(false)}
        >
          {renderCard(card, "idle")}
        </CardPreview>
      )}
    </>
  );
}
