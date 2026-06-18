import type { ReactNode } from "react";
import {
  CardFace,
  GameEndDisplay,
  useIsMobile,
  type ViewCard,
} from "@dreamboard-games/sdk/ui";
import {
  PlayerRoster,
  type CardCollectionSurface,
  type PhaseName,
} from "#dreamboard/ui-contract";
import {
  cardCostOf,
  cardKindOf,
  SketchCardContent,
  viewCardFromId,
  type CostTone,
} from "./cards";
import {
  SketchbookPrimaryActions,
  SketchbookRoutes,
} from "../interaction-routes";
import { SUPPLY_GROUPS, type SketchbookSurfaces } from "../surfaces";
import type { CardId } from "../../shared/manifest-contract";
import type { SketchbookLayoutProps } from "../types";

const PANEL_CLASS =
  "rounded-2xl border border-[#2d2d2d]/15 bg-white shadow-[0_14px_30px_-20px_rgba(45,45,45,0.4)]";
const SECTION_HEADING_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500";

const PHASE_LABELS = {
  setup: "Setting up",
  playerTurn: "Your turn",
  checkGameEnd: "Tallying",
  gameOver: "Game over",
} as const satisfies Record<PhaseName, string>;

const STEP_LABELS: Record<string, string> = {
  action: "Action phase",
  resolve: "Resolving",
  buy: "Buy phase",
  cleanup: "Cleanup",
};

const CARD_BACK_STUB = {
  id: "card-back",
  cardType: "doodle",
  name: "",
  properties: {},
} as unknown as ViewCard<CardId>;

// ── Small themed status chip for the turn resources ──────────────────────────
function StatChip({
  label,
  value,
  active = false,
}: {
  label: string;
  value: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={`flex min-w-[58px] flex-col items-start rounded-xl border-2 px-2.5 py-1 transition-colors ${
        active
          ? "border-[#2d2d2d] bg-[#fff4cf]"
          : "border-[#2d2d2d]/12 bg-[#fdfbf7]"
      }`}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="text-lg font-bold leading-none tabular-nums text-[#2d2d2d]">
        {value}
      </span>
    </div>
  );
}

function SupplyGroup({
  label,
  surface,
  costToneFor,
}: {
  label: string;
  surface: CardCollectionSurface;
  costToneFor: (cost: number) => CostTone;
}) {
  return (
    <section className="min-w-0">
      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#2d2d2d]">
        {label}
      </h3>
      {/* `top-card` collections render one tile per pile; we still guard on the
          top index so the layout stays a clean wrapping grid of pile tiles even
          when the collection materializes the full pile. Each pile is its own
          block list (a flex item here), so buried cards never add phantom gaps. */}
      <div className="flex flex-wrap items-start gap-2">
        <surface.Collection>
          {(card) => {
            if (card.hidden || card.index !== 0) return null;
            const tone = costToneFor(cardCostOf(card));
            return (
              <surface.Card
                card={card}
                className={`group rounded-2xl border-0 bg-transparent p-0 transition-transform enabled:cursor-pointer enabled:hover:-translate-y-0.5 disabled:cursor-default ${
                  tone === "unaffordable" ? "opacity-45" : ""
                }`}
              >
                <CardFace
                  card={card}
                  size="md"
                  eligible={card.playable}
                  renderContent={(c) => (
                    <SketchCardContent card={c} costTone={tone} />
                  )}
                />
              </surface.Card>
            );
          }}
        </surface.Collection>
      </div>
    </section>
  );
}

// A labelled pile column (deck / discard) for the table feedback row.
function TablePile({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
      <span className="rounded-full bg-[#2d2d2d]/85 px-2 text-[10px] font-bold tabular-nums text-white">
        {count}
      </span>
    </div>
  );
}

export function GameUI({
  view,
  players,
  turn,
  phase,
  hand,
  market,
  supplyActions,
  supplyTreasures,
  supplyVictory,
  supplyCurses,
}: SketchbookLayoutProps) {
  const isMyTurn = turn.isMine;
  const turnOrder = turn.order;
  const currentPlayerId = turn.currentPlayerId;
  const {
    mode,
    actionsLeft,
    buysLeft,
    coins,
    vpTotals,
    deckCount,
    turnNumber,
    inPlayCards,
    discardCards,
  } = view;

  const supplyByKey: Record<string, CardCollectionSurface> = {
    supplyActions,
    supplyTreasures,
    supplyVictory,
    supplyCurses,
  };

  const resolveKind = view.pendingAction?.kind;

  // Affordability cue for supply piles, derived from the view (independent of
  // interaction projection timing) so the cost badge always reads true.
  const costToneFor = (cost: number): CostTone => {
    if (mode === "buy") {
      return coins >= cost && buysLeft > 0 ? "affordable" : "unaffordable";
    }
    if (mode === "resolve" && resolveKind === "studioVisit") {
      return cost <= 4 ? "affordable" : "unaffordable";
    }
    return "neutral";
  };

  // In the action step with no action card to play, the only move is to advance
  // — make that explicit instead of a lonely "End actions".
  const hasPlayableAction =
    isMyTurn &&
    mode === "action" &&
    actionsLeft > 0 &&
    view.handCards.some((id) => cardKindOf(viewCardFromId(id)) === "action");

  const waitingFor =
    !isMyTurn && currentPlayerId
      ? (players.byId.get(currentPlayerId)?.name ?? currentPlayerId)
      : undefined;

  const tip = view.winnerPlayerId
    ? "The sketchbook is filled."
    : !isMyTurn
      ? waitingFor
        ? `Waiting for ${waitingFor} to finish their turn.`
        : undefined
      : phase !== "playerTurn"
        ? PHASE_LABELS[phase]
        : mode === "action"
          ? hasPlayableAction
            ? "Tap an action card in your hand to play it, or end your actions."
            : "No action cards to play — continue to the buy phase."
          : mode === "resolve"
            ? resolveKind === "eraser"
              ? "Tap up to four cards in your hand to trash, then confirm."
              : resolveKind === "sketchpad"
                ? "Tap cards to discard — you draw that many back."
                : "Tap a supply pile costing $4 or less to gain a card."
            : mode === "buy"
              ? "Tap treasures to play them for coins, then tap a pile to buy."
              : "Wrapping up your turn…";

  const stepLabel = !isMyTurn
    ? phase === "playerTurn"
      ? "Opponent's turn"
      : PHASE_LABELS[phase]
    : phase === "playerTurn"
      ? (STEP_LABELS[mode] ?? PHASE_LABELS[phase])
      : PHASE_LABELS[phase];

  const stagingLabel =
    resolveKind === "eraser"
      ? "Trashing"
      : resolveKind === "sketchpad"
        ? "Discarding"
        : undefined;

  const endActionLabel = hasPlayableAction ? "End actions" : "Continue to buy";

  const trayActive = useIsMobile();
  const discardTop = discardCards[discardCards.length - 1];

  return (
    <>
      <main
        className={`min-h-[100dvh] bg-[#fdfbf7] text-[#2d2d2d] ${
          trayActive ? "pb-40" : "pb-[268px]"
        }`}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-[#2d2d2d]/12 bg-[#fdfbf7]/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-3">
              <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">
                Sketchbook
              </h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  isMyTurn
                    ? "border-[#2d2d2d] bg-[#fff4cf] text-[#2d2d2d]"
                    : "border-[#2d2d2d]/15 bg-white text-slate-500"
                }`}
              >
                {stepLabel}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              Turn{" "}
              <span className="tabular-nums text-[#2d2d2d]">{turnNumber}</span>
            </span>
          </div>
          {tip ? (
            <div className="mx-auto max-w-[1280px] px-3 pb-2 text-sm text-slate-600 sm:px-4">
              {tip}
            </div>
          ) : null}
        </header>

        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[210px_minmax(0,1fr)_250px] lg:items-start">
          {/* ── Resources + table ─────────────────────────────────────── */}
          <aside className="flex flex-col gap-4 lg:order-1">
            <section
              aria-label="Your resources"
              className={`${PANEL_CLASS} p-3`}
            >
              <h2 className={`${SECTION_HEADING_CLASS} mb-2`}>
                Your resources
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-2">
                <StatChip
                  label="Actions"
                  value={actionsLeft}
                  active={isMyTurn && mode === "action"}
                />
                <StatChip
                  label="Buys"
                  value={buysLeft}
                  active={isMyTurn && mode === "buy"}
                />
                <StatChip
                  label="Coins"
                  value={`$${coins}`}
                  active={isMyTurn && mode === "buy"}
                />
                <StatChip label="Deck" value={deckCount} />
                <StatChip
                  label="VP"
                  value={currentPlayerId ? (vpTotals[currentPlayerId] ?? 0) : 0}
                />
              </div>
            </section>

            {/* Played cards land in "In play" and bought cards land in
                "Discard", so plays and purchases have an obvious destination. */}
            <section aria-label="Your table" className={`${PANEL_CLASS} p-3`}>
              <h2 className={`${SECTION_HEADING_CLASS} mb-2`}>Your table</h2>
              <div className="flex gap-4">
                <TablePile label="Deck" count={deckCount}>
                  <CardFace card={CARD_BACK_STUB} size="sm" faceDown />
                </TablePile>
                <TablePile label="Discard" count={discardCards.length}>
                  {discardTop ? (
                    <CardFace
                      card={viewCardFromId(discardTop)}
                      size="sm"
                      renderContent={(c) => <SketchCardContent card={c} />}
                    />
                  ) : (
                    <div className="h-24 w-16 rounded-lg border-2 border-dashed border-[#2d2d2d]/20 sm:h-28 sm:w-20" />
                  )}
                </TablePile>
              </div>
              <div className="mt-3">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  In play
                </span>
                {inPlayCards.length === 0 ? (
                  <span className="text-xs italic text-slate-400">
                    Cards you play this turn appear here.
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {inPlayCards.map((id) => (
                      <CardFace
                        key={id}
                        card={viewCardFromId(id)}
                        size="sm"
                        renderContent={(c) => <SketchCardContent card={c} />}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>

          {/* ── Supply ────────────────────────────────────────────────── */}
          <div className="lg:order-2">
            <section
              aria-label="Supply"
              className={`${PANEL_CLASS} overflow-hidden`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#2d2d2d]/10 bg-[#f4efe6] px-4 py-2">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2d2d2d]">
                  Supply
                </h2>
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  {mode === "resolve" && resolveKind === "studioVisit"
                    ? "Tap a pile to gain"
                    : mode === "buy"
                      ? "Tap a pile to buy"
                      : "Buy in the buy phase"}
                </span>
              </div>
              <div className="flex flex-col gap-4 p-4">
                {SUPPLY_GROUPS.map((group) => (
                  <SupplyGroup
                    key={group.label}
                    label={group.label}
                    surface={supplyByKey[group.surfaceKey]!}
                    costToneFor={costToneFor}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* ── Players ───────────────────────────────────────────────── */}
          <aside className="lg:order-3">
            <section aria-label="Players" className={`${PANEL_CLASS} p-3`}>
              <h2 className={`${SECTION_HEADING_CLASS} mb-2`}>Players</h2>
              <PlayerRoster.Root
                score={(playerId) => vpTotals[playerId] ?? 0}
                scoreLabel="VP"
                badges={(playerId) => [
                  view.winnerPlayerId === playerId
                    ? { key: "winner", icon: "🏆", tooltip: "Winner" }
                    : null,
                ]}
              >
                <PlayerRoster.List className="flex flex-wrap gap-2 lg:flex-col">
                  {(player) => (
                    <div
                      key={player.playerId}
                      className={`flex items-center gap-2 rounded-xl border-2 border-l-[6px] border-[#2d2d2d]/80 bg-white px-2.5 py-1.5 text-sm font-semibold transition-colors lg:w-full ${
                        player.isActive ? "bg-[#fff4cf]" : ""
                      }`}
                      style={{ borderLeftColor: player.color ?? "#94a3b8" }}
                    >
                      <span className="min-w-0 flex-1 truncate text-left">
                        <PlayerRoster.Name player={player} />
                      </span>
                      <span className="rounded bg-[#eef2f7] px-1.5 text-xs font-bold tabular-nums text-[#2d2d2d]">
                        <PlayerRoster.Score player={player} />
                      </span>
                      <PlayerRoster.Badges player={player} />
                      {player.isActive ? (
                        <span className="rounded bg-[#ff6b6b] px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white">
                          turn
                        </span>
                      ) : null}
                    </div>
                  )}
                </PlayerRoster.List>
              </PlayerRoster.Root>
            </section>
          </aside>
        </div>

        {/* ── Hand dock ─────────────────────────────────────────────────
            On mobile the SDK lifts the hand (and its action slot) into a fixed
            tray; on desktop it renders inline below the board. Either way the
            primary action + staging travel with the hand. */}
        <div
          className={
            trayActive
              ? ""
              : "fixed inset-x-0 bottom-0 z-20 max-h-[62vh] overflow-y-auto border-t border-[#2d2d2d]/12 bg-[#fdfbf7]/95 backdrop-blur-sm"
          }
          style={
            trayActive
              ? undefined
              : { paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }
          }
        >
          <div className="mx-auto w-full max-w-[1280px] px-3 pt-2 sm:px-4">
            {trayActive ? null : (
              <span
                className={`${SECTION_HEADING_CLASS} mb-1 block text-center`}
              >
                Your hand
              </span>
            )}
            <hand.Hand
              className="min-h-[132px]"
              cardSize="md"
              empty={
                <span className="text-[13px] italic text-slate-400">
                  (no cards in hand)
                </span>
              }
            >
              {stagingLabel ? (
                <hand.Summary>
                  {() => (
                    <hand.Staging label={stagingLabel} cardSize="md">
                      {(card) => (
                        <CardFace
                          card={card}
                          size="md"
                          selected
                          renderContent={(c) => <SketchCardContent card={c} />}
                        />
                      )}
                    </hand.Staging>
                  )}
                </hand.Summary>
              ) : null}
              <hand.Cards>
                {(card, state) => {
                  if (card.hidden) return <hand.Card card={card} />;
                  // Lift the cards that can act this step (an action to play, a
                  // treasure to cash in, a target to stage). Others stay readable.
                  const showEligible = state.distinctlyEligible ?? false;
                  const lift = state.selected
                    ? "-translate-y-3"
                    : showEligible
                      ? "-translate-y-1 hover:-translate-y-2.5"
                      : "";
                  return (
                    <hand.Card
                      card={card}
                      className={`relative border-0 bg-transparent p-0 transition-transform disabled:cursor-default ${lift}`}
                    >
                      <CardFace
                        card={card}
                        size="md"
                        eligible={showEligible}
                        selected={state.selected}
                        invalid={state.invalid}
                        renderContent={(c) => <SketchCardContent card={c} />}
                      />
                    </hand.Card>
                  );
                }}
              </hand.Cards>
              <hand.Actions>
                {(summary) => (
                  <SketchbookPrimaryActions
                    selectedCount={summary.selectedCount}
                    endActionLabel={endActionLabel}
                  />
                )}
              </hand.Actions>
            </hand.Hand>
          </div>
        </div>
      </main>

      {/* Collector bindings for every interaction (mounted once). */}
      <SketchbookRoutes hand={hand} market={market} />

      <GameEndDisplay
        isGameOver={view.gameOver}
        scores={turnOrder.map((playerId) => ({
          playerId,
          name: players.byId.get(playerId)?.name ?? playerId,
          score: vpTotals[playerId] ?? 0,
          isWinner: playerId === view.winnerPlayerId,
        }))}
        winnerMessage="The sketchbook is filled."
      />
    </>
  );
}
