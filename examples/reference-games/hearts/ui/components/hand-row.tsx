import React, { type ReactNode } from "react";
import { CardFace, useIsMobile } from "@dreamboard-games/sdk/ui";
import type { HandSurface } from "../../shared/generated/ui-contract";
import {
  cardLabel,
  comparePlayingCards,
  renderPlayingCardContent,
  type PlayingCardView,
} from "./cards";

export function HandRow({
  handSurface,
  hand,
  mode,
  isMyTurn,
  recipientName,
  passAction,
}: {
  handSurface: HandSurface<readonly ["hand"]>;
  hand: readonly PlayingCardView[];
  mode: "passing" | "playing" | "view";
  isMyTurn: boolean;
  recipientName: string;
  /**
   * Passing commit, rendered inside the hand summary so it stays reachable
   * inside the mobile hand drawer. Provided by the parent during the passing
   * phase only.
   */
  passAction?: ReactNode;
}) {
  // Microcopy directly under the hand. Passing is a simultaneous phase, so its
  // status is driven by the form availability up in the header — not here.
  const helper =
    mode === "playing"
      ? isMyTurn
        ? "Tap a card to play it."
        : "Waiting on the active player."
      : null;

  // When the SDK lifts this primary hand into the fixed bottom tray (mobile),
  // the inline region is empty — so we drop the label/framing/helper instead of
  // showing an empty box. Driven by the SDK's tray signal rather than a
  // hardcoded breakpoint, so it always tracks the real presentation.
  const docked = useIsMobile();

  return (
    <div
      className={`flex w-full flex-col items-center gap-2 ${
        docked ? "" : "rounded-2xl bg-slate-900/[0.04] px-4 py-3"
      }`}
    >
      {docked ? null : (
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Your hand · {hand.length} {hand.length === 1 ? "card" : "cards"}
        </span>
      )}
      <handSurface.Hand
        className="min-h-[120px]"
        sort={comparePlayingCards}
        empty={
          <span className="text-[13px] italic text-slate-400">(no cards)</span>
        }
      >
        {mode === "passing" ? (
          <handSurface.Summary>
            {() => (
              // The always-visible passing zone is an SDK primitive bound to
              // the pass collector: it shows the staged cards (tap one to send
              // it back to the hand) and empty slots otherwise.
              <handSurface.Staging label={`Passing to ${recipientName}`}>
                {(card) => (
                  <CardFace
                    card={card}
                    size="sm"
                    renderContent={renderPlayingCardContent}
                  />
                )}
              </handSurface.Staging>
            )}
          </handSurface.Summary>
        ) : null}
        <handSurface.Cards>
          {(card, state) => {
            if (card.hidden) return <handSurface.Card card={card} />;
            // The SDK CardFace already encodes eligible/selected/invalid/disabled
            // rings; here we add a lift affordance so the playable / chosen cards
            // pop out of the row, and slightly lower cards that cannot be played
            // right now without reducing their text contrast. During the playing phase the engine keeps every held card
            // nominally "playable", so we lean on `eligible` (the cards legal for
            // *this* turn) to decide what to dim — and dim the whole hand while we
            // wait on another seat.
            //
            // `distinctlyEligible` is the SDK's "highlight only when it's a
            // meaningful subset" signal: it is false when every card is a legal
            // target (all of passing, or a turn where any card may be played), so
            // we get a clean hand with no ring noise for free, and a clear ring
            // only when the playable cards are a subset (a normal trick).
            const showEligible = state.distinctlyEligible ?? false;
            const muted =
              !state.selected &&
              !state.eligible &&
              (state.disabled || mode === "playing");
            const lift = state.selected
              ? "-translate-y-3"
              : showEligible
                ? "-translate-y-1 hover:-translate-y-2.5"
                : muted
                  ? ""
                  : "hover:-translate-y-2";
            const dim = muted ? "scale-[0.98]" : "";
            return (
              <handSurface.Card
                card={card}
                className={`relative border-0 bg-transparent p-0 transition-transform disabled:cursor-default ${lift} ${dim}`}
                aria-label={`Select ${cardLabel(card)}`}
              >
                <CardFace
                  card={card}
                  size="sm"
                  eligible={showEligible}
                  selected={state.selected}
                  disabled={state.disabled}
                  invalid={state.invalid}
                  renderContent={renderPlayingCardContent}
                />
              </handSurface.Card>
            );
          }}
        </handSurface.Cards>
        {passAction ? (
          // The pass commit goes through the hand surface's action slot so the
          // SDK keeps it reachable inside the mobile dock and inline on desktop.
          <handSurface.Actions>{() => passAction}</handSurface.Actions>
        ) : null}
      </handSurface.Hand>
      {helper && !docked ? (
        <span className="text-xs text-slate-500">{helper}</span>
      ) : null}
    </div>
  );
}
