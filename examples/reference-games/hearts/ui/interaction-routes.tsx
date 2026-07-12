import {
  Interaction,
  type HandSurface,
} from "../shared/generated/ui-contract";

export const PRIMARY_BUTTON =
  "rounded-xl border-2 border-slate-900 bg-rose-500 px-5 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#111] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export function HeartsInteractionRoutes({
  handSurface,
}: {
  handSurface: HandSurface<readonly ["hand"]>;
}) {
  const canonicalRoutes = {
    "passing.submit": {
      collect: { cardIds: handSurface.slot.card },
    },
    "playing.playCard": {
      collect: { cardId: handSurface.slot.card },
    },
  } as const;

  return (
    <Interaction.Routes routes={canonicalRoutes} />
  );
}
