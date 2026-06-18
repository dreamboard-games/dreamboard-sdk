import { CardFace, type ViewCard } from "@dreamboard-games/sdk/ui";
import type {
  CardId,
  CardProperties,
  CardType,
} from "../../shared/manifest-contract";

export type SushiCardView = ViewCard<CardId, CardType, CardProperties>;

export const ACTION_BUTTON_CLASS =
  "rounded-lg border-2 border-[#2d2d2d] bg-white px-4 py-2 text-sm font-bold text-[#2d2d2d] shadow-[4px_4px_0_0_#2d2d2d] disabled:opacity-50";

export const PRIMARY_BUTTON_CLASS =
  "rounded-lg border-2 border-[#2d2d2d] bg-[#ff4d4d] px-4 py-2 text-sm font-bold text-white shadow-[4px_4px_0_0_#2d2d2d] disabled:opacity-50";

export const STAMP_CLASS =
  "rounded-full border-2 border-[#2d2d2d] bg-[#fff9c4] px-3 py-1 text-xs font-bold uppercase text-[#2d2d2d]";

const CATEGORY_LABEL: Record<string, string> = {
  nigiri: "Nigiri",
  wasabi: "Wasabi",
  tempura: "Tempura",
  sashimi: "Sashimi",
  dumpling: "Dumpling",
  maki: "Maki",
  pudding: "Pudding",
  chopsticks: "Chopsticks",
};

const CATEGORY_COLOR: Record<string, string> = {
  nigiri: "bg-orange-100",
  wasabi: "bg-lime-100",
  tempura: "bg-amber-100",
  sashimi: "bg-rose-100",
  dumpling: "bg-violet-100",
  maki: "bg-emerald-100",
  pudding: "bg-pink-100",
  chopsticks: "bg-sky-100",
};

function cardSubtitle(card: SushiCardView): string {
  const category = card.properties.category;
  if (category === "nigiri" && "nigiriPoints" in card.properties) {
    return `${card.properties.nigiriPoints} pt`;
  }
  if (category === "maki" && "makiIcons" in card.properties) {
    return `${card.properties.makiIcons} maki`;
  }
  return CATEGORY_LABEL[category] ?? category;
}

export function SushiCardContent({ card }: { card: SushiCardView }) {
  const category = card.properties.category;
  const bg = CATEGORY_COLOR[category] ?? "bg-white";
  return (
    <div
      className={`flex h-full flex-col items-center justify-between rounded-lg border-2 border-[#2d2d2d] p-1.5 ${bg}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#2d2d2d]">
        {CATEGORY_LABEL[category] ?? category}
      </span>
      <span className="text-center text-xs font-bold text-[#2d2d2d]">
        {card.name}
      </span>
      <span className="text-[10px] text-[#2d5da1]">{cardSubtitle(card)}</span>
    </div>
  );
}

export function SushiCardTile({ card }: { card: SushiCardView }) {
  return (
    <div className="h-[88px] w-[64px] overflow-hidden shadow-[4px_4px_0_0_#2d2d2d]">
      <SushiCardContent card={card} />
    </div>
  );
}

export function HiddenCardTile() {
  return (
    <div className="h-[88px] w-[64px] overflow-hidden rounded-lg border-2 border-[#2d2d2d] bg-[#2d5da1] shadow-[4px_4px_0_0_#2d2d2d]">
      <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-wide text-white">
        Sushi
      </div>
    </div>
  );
}

export function PlayedRow({
  cards,
  label,
}: {
  cards: readonly SushiCardView[];
  label: string;
}) {
  return (
    <section className="flex flex-col items-center gap-1 rounded-xl border-2 border-[#2d2d2d] bg-[#fdfbf7] px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#2d2d2d]">
        {label}
      </span>
      <div className="flex min-h-[92px] flex-wrap justify-center gap-1">
        {cards.length === 0 ? (
          <span className="text-xs italic text-slate-500">-</span>
        ) : (
          cards.map((card) => <SushiCardTile key={card.id} card={card} />)
        )}
      </div>
    </section>
  );
}

export function OpponentPlayedCards({
  name,
  played,
  pudding,
}: {
  name: string;
  played: readonly SushiCardView[];
  pudding: readonly SushiCardView[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="text-sm font-semibold">{name}</span>
      <div className="mt-2 flex flex-wrap gap-1">
        {played.map((card) => (
          <CardFace
            key={card.id}
            card={card}
            size="sm"
            renderContent={() => <SushiCardContent card={card} />}
          />
        ))}
      </div>
      {pudding.length > 0 ? (
        <span className="mt-1 block text-xs text-pink-700">
          {pudding.length} pudding
        </span>
      ) : null}
    </section>
  );
}
