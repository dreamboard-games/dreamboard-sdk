import { CardFace } from "@dreamboard-games/sdk/ui";
import { renderPlayingCardContent, type PlayingCardView } from "./cards";

export function TrickArea({ trick }: { trick: readonly PlayingCardView[] }) {
  const slots = [0, 1, 2, 3];
  const played = trick.length;
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Current trick{played > 0 ? ` · ${played}/4` : ""}
      </span>
      <div className="flex items-end justify-center gap-2 sm:gap-3">
        {slots.map((i) => {
          const card = trick[i];
          if (!card) {
            return (
              <div
                key={i}
                className="h-24 w-16 rounded-xl border-2 border-dashed border-slate-300 bg-white/40 sm:h-28 sm:w-20"
              />
            );
          }
          return (
            <CardFace
              key={card.id}
              card={card}
              size="sm"
              renderContent={renderPlayingCardContent}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Game UI ──────────────────────────────────────────────────────────────
