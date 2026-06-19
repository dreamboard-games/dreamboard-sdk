import React, { type ReactNode } from "react";
import type { ViewCard } from "@dreamboard-games/sdk/ui";
import {
  literals,
  type CardId,
  type CardType,
} from "../../shared/manifest-contract";

// ── Card metadata ────────────────────────────────────────────────────────────
// Static authoring metadata for every card type. The reducer projects card
// `properties` (cost / coins / vp); the label/effect/icon/kind copy lives here
// so the UI can render a readable face without re-deriving it per card.

export const CARD_LABEL = {
  doodle: "Doodle",
  sketch: "Sketch",
  inkwork: "Inkwork",
  idea: "Idea",
  concept: "Concept",
  masterpiece: "Masterpiece",
  smudge: "Smudge",
  brainstorm: "Brainstorm",
  studio: "Studio",
  gallery: "Gallery",
  "open-mic": "Open Mic",
  critic: "Critic",
  eraser: "Eraser",
  sketchpad: "Sketchpad",
  "studio-visit": "Studio Visit",
} as const satisfies Record<CardType, string>;

const CARD_EFFECT = {
  doodle: "+$1",
  sketch: "+$2",
  inkwork: "+$3",
  idea: "1 VP",
  concept: "3 VP",
  masterpiece: "6 VP",
  smudge: "−1 VP",
  brainstorm: "+3 cards",
  studio: "+1 card, +2 actions",
  gallery: "+1 card, action, buy & $1",
  "open-mic": "+2 actions, +1 buy, +$2",
  critic: "+2 cards; foes gain a Smudge",
  eraser: "Trash up to 4 cards",
  sketchpad: "Discard any, draw that many",
  "studio-visit": "Gain a card costing ≤ $4",
} as const satisfies Record<CardType, string>;

const CARD_ICON: Record<CardType, string> = {
  doodle: "✏️",
  sketch: "🖊️",
  inkwork: "🖋️",
  idea: "💡",
  concept: "🎨",
  masterpiece: "🖼️",
  smudge: "💢",
  brainstorm: "🧠",
  studio: "🏛️",
  gallery: "🎭",
  "open-mic": "🎤",
  critic: "👁️",
  eraser: "🧽",
  sketchpad: "📝",
  "studio-visit": "🚪",
};

export type CardKind = "action" | "treasure" | "victory" | "curse";

const CARD_KIND = {
  doodle: "treasure",
  sketch: "treasure",
  inkwork: "treasure",
  idea: "victory",
  concept: "victory",
  masterpiece: "victory",
  smudge: "curse",
  brainstorm: "action",
  studio: "action",
  gallery: "action",
  "open-mic": "action",
  critic: "action",
  eraser: "action",
  sketchpad: "action",
  "studio-visit": "action",
} as const satisfies Record<CardType, CardKind>;

// Category accent bar across the top of the card. Restrained, paper-friendly
// tints — the SDK CardFace shell owns the emphasis rings, so these stay calm.
const KIND_BAR: Record<CardKind, string> = {
  action: "bg-[#cdb89a]",
  treasure: "bg-[#e8c25a]",
  victory: "bg-[#8fb3e0]",
  curse: "bg-[#d98a8a]",
};

const KIND_LABEL: Record<CardKind, string> = {
  action: "Action",
  treasure: "Treasure",
  victory: "Victory",
  curse: "Curse",
};

type SketchViewCard = ViewCard<CardId, CardType>;

export function cardKindOf(card: SketchViewCard): CardKind {
  if ("coins" in card.properties) return "treasure";
  if (card.cardType === "smudge") return "curse";
  if ("vp" in card.properties) return "victory";
  return CARD_KIND[card.cardType] ?? "action";
}

export function cardCostOf(card: SketchViewCard): number {
  return typeof card.properties.cost === "number" ? card.properties.cost : 0;
}

/**
 * Build a lightweight display card from just a card id. The player view
 * summarises the in-play / discard zones as id lists; this hydrates them enough
 * for `SketchCardContent` (kind is recovered from the card type) without a full
 * zone surface. Cost is not shown for these, so empty properties are fine.
 */
export function viewCardFromId(cardId: CardId): SketchViewCard {
  const cardType = literals.cardTypeByCardId[cardId];
  return {
    id: cardId,
    cardType,
    name: CARD_LABEL[cardType] ?? cardType,
    properties: {},
  };
}

/** Cost-badge emphasis when the card is shown in a supply pile. */
export type CostTone = "affordable" | "unaffordable" | "neutral";

const COST_TONE_CLASS: Record<CostTone, string> = {
  affordable: "border-emerald-300 bg-emerald-50 text-emerald-700",
  unaffordable: "border-rose-200 bg-rose-50 text-rose-400",
  neutral: "border-[#2d2d2d]/15 bg-[#f4efe6] text-[#5b5347]",
};

/**
 * Inner content for the SDK `CardFace`. Top-down layout — category accent bar,
 * icon, name, effect, then an optional cost badge pinned to the bottom — so the
 * icon always sits at the top and faces line up across the hand and supply.
 */
export function SketchCardContent({
  card,
  costTone,
}: {
  card: SketchViewCard;
  /** Show a cost badge (supply piles). Omit in hand, where cost is irrelevant. */
  costTone?: CostTone;
}): ReactNode {
  const type = card.cardType;
  const kind = cardKindOf(card);
  const cost = cardCostOf(card);

  return (
    <div className="relative flex h-full flex-col items-center gap-0.5 px-1.5 pb-1.5 pt-2.5 text-center">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1.5 ${KIND_BAR[kind]}`}
      />
      <span aria-hidden="true" className="text-[26px] leading-none">
        {CARD_ICON[type]}
      </span>
      <span className="line-clamp-2 text-[11px] font-bold leading-tight text-[#2d2d2d]">
        {CARD_LABEL[type] ?? type}
      </span>
      <span className="line-clamp-3 text-[9px] leading-snug text-slate-500">
        {CARD_EFFECT[type] ?? ""}
      </span>
      {costTone ? (
        <span
          className={`mt-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${COST_TONE_CLASS[costTone]}`}
        >
          ${cost}
        </span>
      ) : (
        <span className="mt-auto text-[8px] font-semibold uppercase tracking-wider text-slate-400">
          {KIND_LABEL[kind]}
        </span>
      )}
    </div>
  );
}
