import {
  useCardGesture,
  useDragOverlay,
  useGame,
  useCardPresentation,
  type CardDrag,
  type CardId,
  type GameCard,
} from "@game";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  CardActions,
  getCardActions,
  getCardActionInput,
  type CardAction,
} from "./card-actions";
import { TouchCardPreview, useCardBrowsingContext } from "./card-browsing";
import { CardPreview } from "./card-preview";
import type { CardState } from "./card";
import {
  CardBack,
  backImageOf,
  cardPickup,
  cardSettle,
  dragCopyScale,
  useSnapTick,
} from "./card";
import { motion } from "motion/react";
import { createPortal } from "react-dom";

export interface CardControlProps {
  cardId: CardId;
  drag: CardDrag;
  renderCard(card: GameCard, state: CardState): ReactNode;
  /**
   * Draws the inspected face. Leave out table markers such as damage or
   * exhaustion; defaults to the idle card.
   */
  renderPreview?(card: GameCard): ReactNode;
  getCardLabel?(card: GameCard): string;
  /** Caller-owned selection, for example a batch-selection toolbar. */
  onChooseAction?(route: CardAction): void;
  selection?: {
    readonly selected: boolean;
    readonly active: boolean;
    toggle(): void;
  };
  choosing?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  /** Reports the action menu opening and closing, so a hand can hold the card still. */
  onMenuChange?(open: boolean): void;
  /** An action was chosen from the menu, as when a sheet should get out of the way. */
  onAction?(): void;
  /** More actions after the card's own in its menu, such as its pile's. */
  moreActions?: ReactNode;
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
  renderCard,
  renderPreview = (card) => renderCard(card, "idle"),
  getCardLabel,
  choosing = false,
  onChooseAction,
  selection,
  disabled = false,
  style,
  className = "db-hand-card",
  onMenuChange,
  onAction,
  moreActions,
  children,
}: CardControlProps) {
  const presentation = useCardPresentation(cardId);
  const card = presentation.card;
  const browsing = useCardBrowsingContext();
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
  const copied = !children && overlay?.cardId === cardId;
  useSnapTick(copied && overlay.fit.snapped);
  const menu = open && !dragging;
  useEffect(() => {
    if (!menu) return;
    onMenuChange?.(true);
    return () => onMenuChange?.(false);
  }, [menu, onMenuChange]);
  if (!card) return null;
  const actions = getCardActions(card);
  const preview = presentation.hidden ? (
    <CardBack image={backImageOf(card)} />
  ) : (
    renderPreview(card)
  );
  const selected = selection?.selected || card.getIsSelected();
  const raised = selected || (open && card.getIsEligible());
  const state: CardState = raised
    ? "selected"
    : card.getIsEligible()
      ? "eligible"
      : choosing
        ? "dimmed"
        : "idle";
  const face =
    presentation.isPending && presentation.hidden ? (
      <CardBack image={backImageOf(card)} />
    ) : (
      renderCard(card, state)
    );
  const control = (
    <button
      {...gesture.props}
      ref={setAnchor}
      type="button"
      className={className}
      disabled={disabled || gesture.isPending}
      data-pending-move={gesture.isPending || undefined}
      style={{
        ...gesture.props.style,
        ...style,
        ...(overlay?.cardIds.includes(cardId) && !presentation.isPending
          ? { visibility: "hidden" }
          : {}),
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
        (presentation.hidden ? "Face-down card" : getCardLabel?.(card)) ??
        (card.hidden ? "Face-down card" : String(card.id))
      }
      data-shake={shake ? (shake % 2 ? "a" : "b") : undefined}
      onClick={(event) => {
        if (selection && (event.shiftKey || selection.active)) {
          selection.toggle();
          return;
        }
        const pick = actions.length === 1 ? actions[0] : null;
        const input = pick ? getCardActionInput(pick, cardId) : undefined;
        if (pick && input?.selectionMode === "many") {
          if (onChooseAction) onChooseAction(pick);
          else input.getSelectHandler(cardId)();
          return;
        }
        setOpen(actions.length ? !open : true);
        if (!actions.length) setShake((value) => value + 1);
      }}
    >
      {face}
    </button>
  );
  return (
    <>
      {children ? (
        children({
          raised,
          hovered: gesture.isActive && !dragging,
          anchor,
          control,
        })
      ) : (
        <motion.div layoutId={card.id} initial={false} transition={cardSettle}>
          {control}
        </motion.div>
      )}
      {copied &&
        (!overlay.settling || !overlay.landing) &&
        anchor &&
        createPortal(
          <motion.div ref={overlay.ref} className="db-drag-overlay">
            <motion.div
              layoutId={card.id}
              initial={false}
              animate={{ scale: dragCopyScale(overlay.fit) }}
              transition={overlay.fit.scale === null ? cardPickup : cardSettle}
            >
              {overlay.fit.concealed ? (
                <CardBack image={backImageOf(card)} />
              ) : (
                renderCard(card, "selected")
              )}
            </motion.div>
          </motion.div>,
          document.body,
        )}
      {open && !dragging && anchor && (
        <CardActions
          cardId={cardId}
          anchor={anchor}
          onChooseAction={onChooseAction}
          onAction={() => {
            onAction?.();
            if (browsing.inSheet) browsing.closeSheet();
          }}
          onClose={() => setOpen(false)}
          onInspect={() => {
            setOpen(false);
            setInspecting(true);
          }}
        >
          {moreActions}
        </CardActions>
      )}
      {browsing.session &&
        anchor &&
        !dragging &&
        (gesture.isActive || gesture.inspecting === "hold") && (
          <TouchCardPreview
            session={browsing.session}
            anchor={anchor}
            cardId={cardId}
          >
            {preview}
          </TouchCardPreview>
        )}
      {(inspecting ||
        (gesture.inspecting && !browsing.session && !browsing.covered)) && (
        <CardPreview
          via={inspecting ? "action" : gesture.inspecting!}
          anchor={anchor}
          onClose={() => setInspecting(false)}
        >
          {preview}
        </CardPreview>
      )}
    </>
  );
}
