import type { ViewCard } from "@dreamboard-games/sdk/ui";
import type {
  CardId,
  CardProperties,
  CardType,
} from "../../shared/manifest-contract";

export type MarketCardView = ViewCard<CardId, CardType, CardProperties>;

export const PRIMARY_BUTTON_CLASS =
  "rounded-lg border-2 border-[#40251b] bg-[#b83a2d] px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_#40251b] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45";

export const BADGE_CLASS =
  "rounded-full border border-[#40251b]/30 bg-[#fff4cf] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#6a3527]";

const FAMILY_PRESENTATION = {
  lantern: {
    label: "Lantern",
    icon: "🏮",
    scoring: "2 each",
    className: "border-[#9d332b] bg-[#ffe4d6]",
  },
  "tea-cup": {
    label: "Tea Cup",
    icon: "🍵",
    scoring: "5 per pair",
    className: "border-[#47734b] bg-[#e5f4d7]",
  },
  "festival-banner": {
    label: "Festival Banner",
    icon: "🎏",
    scoring: "9 per trio",
    className: "border-[#405f92] bg-[#e4edff]",
  },
} as const;

export function MarketCardContent({ card }: { card: MarketCardView }) {
  const family = FAMILY_PRESENTATION[card.properties.family];
  return (
    <div
      className={`flex h-full flex-col items-center justify-between rounded-xl border-2 p-2 text-[#40251b] ${family.className}`}
      data-market-family={card.properties.family}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.12em]">
        {family.label}
      </span>
      <span className="text-3xl" aria-hidden="true">
        {family.icon}
      </span>
      <span className="text-[10px] font-bold text-[#68483b]">
        {family.scoring}
      </span>
    </div>
  );
}

export function MarketCardTile({
  card,
  compact = false,
}: {
  card: MarketCardView;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "h-[82px] w-[60px]" : "h-[104px] w-[74px]"} shrink-0 overflow-hidden rounded-xl shadow-[3px_3px_0_#40251b]`}
    >
      <MarketCardContent card={card} />
    </div>
  );
}

export function CardCollection({
  cards,
  emptyLabel = "No cards yet",
  compact = false,
}: {
  cards: readonly MarketCardView[];
  emptyLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex min-h-[92px] flex-wrap content-start gap-2">
      {cards.length > 0 ? (
        cards.map((card) => (
          <MarketCardTile key={card.id} card={card} compact={compact} />
        ))
      ) : (
        <span className="self-center text-sm italic text-[#896d60]">
          {emptyLabel}
        </span>
      )}
    </div>
  );
}
