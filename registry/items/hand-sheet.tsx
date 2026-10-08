import { Drawer } from "@base-ui/react/drawer";
import type { GameCard as Card, CardId } from "@game";
import type { ReactNode } from "react";
import type { CardState } from "./card";
import { CardControl } from "./card-control";
import "./tokens.css";

export interface HandSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  ids: readonly CardId[];
  label: string;
  choosing: boolean;
  renderCard(card: Card, state: CardState): ReactNode;
  renderPreview?(card: Card): ReactNode;
  getCardLabel?(card: Card): string;
}

/**
 * Every card of a crowded hand at a readable size, in hand order. A card
 * opens its actions as it does in the hand; choosing one closes the sheet so
 * the table shows the rest of the move. Cards an action picks several of
 * toggle and keep it open. Swipe down, Escape or Done closes it.
 */
export function HandSheet({
  open,
  onOpenChange,
  ids,
  label,
  choosing,
  renderCard,
  renderPreview,
  getCardLabel,
}: HandSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop className="db-hand-sheet-backdrop" />
        <Drawer.Viewport className="db-hand-sheet-viewport">
          <Drawer.Popup className="db-hand-sheet">
            <div className="db-hand-sheet-handle" aria-hidden />
            <div className="db-hand-sheet-header">
              <Drawer.Title className="db-hand-sheet-title">
                {label} · {ids.length}
              </Drawer.Title>
              <Drawer.Close className="db-inspect-close">Done</Drawer.Close>
            </div>
            <Drawer.Content className="db-hand-sheet-cards">
              {ids.map((id) => (
                <CardControl
                  key={id}
                  cardId={id}
                  drag={false}
                  choosing={choosing}
                  renderCard={renderCard}
                  renderPreview={renderPreview}
                  getCardLabel={getCardLabel}
                  onAction={() => onOpenChange(false)}
                />
              ))}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
