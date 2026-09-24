import { PlayingCard } from "../components/dreamboard/playing-card";
import type { PlayingCardView } from "./cards";

export function TrickArea({ trick }: { trick: readonly PlayingCardView[] }) {
  return (
    <section aria-label="Current trick" className="grid justify-center gap-3">
      <h2 className="text-center">Current trick · {trick.length}/4</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {[0, 1, 2, 3].map((index) => {
          const card = trick[index];
          return card ? (
            <PlayingCard
              key={card.id}
              rank={card.properties.rank}
              suit={card.properties.suit}
            />
          ) : (
            <div
              key={index}
              aria-hidden="true"
              className="h-24 w-16 rounded-xl border-2 border-dashed border-slate-300"
            />
          );
        })}
      </div>
    </section>
  );
}
