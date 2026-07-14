import type { ReactNode } from "react";
import type { ViewCard } from "@dreamboard-games/sdk/ui";
import {
  literals,
  type CardId,
  type CardType,
} from "../../shared/manifest-contract";

export const CARD_LABEL = {
  doodle: "Doodle",
  sketch: "Sketch",
  inkwork: "Inkwork",
  idea: "Idea",
  concept: "Concept",
  masterpiece: "Masterpiece",
  brainstorm: "Brainstorm",
  studio: "Studio",
  gallery: "Gallery",
  eraser: "Eraser",
  "studio-visit": "Studio Visit",
} as const satisfies Record<CardType, string>;

const CARD_EFFECT = {
  doodle: "+1 inspiration",
  sketch: "+2 inspiration",
  inkwork: "+3 inspiration",
  idea: "1 portfolio point",
  concept: "3 portfolio points",
  masterpiece: "6 portfolio points",
  brainstorm: "Draw 3 cards",
  studio: "Draw 1 · +2 actions",
  gallery: "Draw 1 · +1 action, buy & inspiration",
  eraser: "Trash 0–4 hand cards",
  "studio-visit": "Gain a supply card costing 4 or less",
} as const satisfies Record<CardType, string>;

const CARD_MARK = {
  doodle: "✎",
  sketch: "✐",
  inkwork: "✒",
  idea: "◇",
  concept: "◈",
  masterpiece: "◆",
  brainstorm: "☁",
  studio: "⌂",
  gallery: "▣",
  eraser: "▱",
  "studio-visit": "↗",
} as const satisfies Record<CardType, string>;

export type CardKind = "inspiration" | "portfolio" | "technique";

const CARD_KIND = {
  doodle: "inspiration",
  sketch: "inspiration",
  inkwork: "inspiration",
  idea: "portfolio",
  concept: "portfolio",
  masterpiece: "portfolio",
  brainstorm: "technique",
  studio: "technique",
  gallery: "technique",
  eraser: "technique",
  "studio-visit": "technique",
} as const satisfies Record<CardType, CardKind>;

const KIND_CLASS: Record<CardKind, string> = {
  inspiration: "bg-amber-300",
  portfolio: "bg-sky-300",
  technique: "bg-rose-300",
};

type SketchViewCard = ViewCard<CardId, CardType>;

export function cardCostOf(card: SketchViewCard): number {
  return typeof card.properties.cost === "number" ? card.properties.cost : 0;
}

export function viewCardFromId(cardId: CardId): SketchViewCard {
  const cardType = literals.cardTypeByCardId[cardId];
  return {
    id: cardId,
    cardType,
    name: CARD_LABEL[cardType],
    properties: {},
  };
}

export function SketchCardContent({
  card,
  showCost = false,
}: {
  readonly card: SketchViewCard;
  readonly showCost?: boolean;
}): ReactNode {
  const kind = CARD_KIND[card.cardType];
  return (
    <div className="relative flex h-full flex-col items-center gap-1 overflow-hidden px-2 pb-2 pt-3 text-center">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1.5 ${KIND_CLASS[kind]}`}
      />
      <span aria-hidden="true" className="font-serif text-3xl leading-none">
        {CARD_MARK[card.cardType]}
      </span>
      <strong className="text-[11px] leading-tight text-stone-900">
        {CARD_LABEL[card.cardType]}
      </strong>
      <span className="text-[9px] leading-snug text-stone-600">
        {CARD_EFFECT[card.cardType]}
      </span>
      {showCost ? (
        <span className="mt-auto rounded-full border border-stone-400 bg-[#fffdf7] px-2 py-0.5 text-[10px] font-bold text-stone-800">
          cost {cardCostOf(card)}
        </span>
      ) : (
        <span className="mt-auto text-[8px] font-bold uppercase tracking-widest text-stone-600">
          {kind}
        </span>
      )}
    </div>
  );
}
