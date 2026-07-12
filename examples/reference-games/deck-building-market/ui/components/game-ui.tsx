import { CardFace, OutcomeDialog } from "@dreamboard-games/sdk/ui";
import {
  PlayerRoster,
  type CardCollectionSurface,
  type PhaseName,
} from "../../shared/generated/ui-contract";
import { literals, type CardId } from "../../shared/manifest-contract";
import { SketchCardContent, viewCardFromId } from "./cards";
import { SketchbookActions, SketchbookRoutes } from "../interaction-routes";
import { SUPPLY_GROUPS } from "../surfaces";
import type { SketchbookLayoutProps } from "../types";

const PANEL =
  "rounded-2xl border-2 border-stone-800/70 bg-[#fffdf7] shadow-[4px_4px_0_rgba(41,37,36,0.2)]";

const PHASE_LABEL: Record<PhaseName, string> = {
  setup: "Opening sketchbooks",
  playerTurn: "Working turn",
  checkGameEnd: "Checking supplies",
  gameOver: "Portfolio complete",
};

function Stat({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div className="rounded-xl border border-stone-400 bg-amber-50 px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-stone-500">
        {label}
      </div>
      <div className="text-xl font-black tabular-nums text-stone-900">{value}</div>
    </div>
  );
}

function SupplyGroup({
  label,
  surface,
  supplyCounts,
}: {
  readonly label: string;
  readonly surface: CardCollectionSurface;
  readonly supplyCounts: Readonly<Record<string, number>>;
}) {
  return (
    <section>
      <h3 className="mb-2 font-serif text-lg font-bold text-stone-800">{label}</h3>
      <div className="flex flex-wrap gap-2">
        <surface.Collection>
          {(card) => {
            if (card.hidden || card.index !== 0) return null;
            const zoneId = literals.homeSharedZoneIdByCardType[card.cardType];
            return (
              <div key={card.id} className="relative">
                <surface.Card
                  card={card}
                  className="rounded-xl border-0 bg-transparent p-0 transition-transform enabled:hover:-translate-y-1"
                >
                  <CardFace
                    card={card}
                    size="md"
                    eligible={card.playable}
                    renderContent={(value) => (
                      <SketchCardContent card={value} showCost />
                    )}
                  />
                </surface.Card>
                <span className="absolute -right-1 -top-1 rounded-full border-2 border-stone-700 bg-white px-1.5 text-[10px] font-black text-stone-900">
                  {supplyCounts[zoneId] ?? 0}
                </span>
              </div>
            );
          }}
        </surface.Collection>
      </div>
    </section>
  );
}

function CardStrip({
  cardIds,
  empty,
}: {
  readonly cardIds: readonly CardId[];
  readonly empty: string;
}) {
  if (cardIds.length === 0) {
    return <span className="text-xs italic text-stone-400">{empty}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {cardIds.map((cardId) => (
        <CardFace
          key={cardId}
          card={viewCardFromId(cardId)}
          size="sm"
          renderContent={(card) => <SketchCardContent card={card} />}
        />
      ))}
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
  supplyTechniques,
  supplyInspiration,
  supplyPortfolio,
}: SketchbookLayoutProps) {
  const playerId = view.playerId;
  const discard = view.discardCardsByPlayerId[playerId] ?? [];
  const inPlay = view.inPlayCardsByPlayerId[playerId] ?? [];
  const activeName = view.activePlayerId
    ? (players.byId.get(view.activePlayerId)?.name ?? view.activePlayerId)
    : null;
  const instruction =
    view.pendingTechnique === "eraser"
      ? "Select zero to four cards, then confirm Eraser."
      : view.pendingTechnique === "studioVisit"
        ? "Choose a visible supply card costing four inspiration or less."
        : view.step === "action"
          ? "Play one Technique, chain extra actions, or continue to buy."
          : view.step === "buy"
            ? "Play Inspiration cards one at a time, then acquire a supply card."
            : PHASE_LABEL[phase];

  const supplySurfaces: Record<string, CardCollectionSurface> = {
    supplyTechniques,
    supplyInspiration,
    supplyPortfolio,
  };

  return (
    <>
      <main className="min-h-screen bg-[#f2eadb] text-stone-900 [background-image:linear-gradient(rgba(120,113,108,.08)_1px,transparent_1px)] [background-size:100%_28px]">
        <header className="border-b-2 border-stone-800 bg-[#fffdf7]/95 px-4 py-3">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-black tracking-tight">Sketchbook</h1>
              <p className="text-sm text-stone-600">{instruction}</p>
            </div>
            <div className="text-right text-sm font-bold">
              <div>Turn {view.turnNumber} · {PHASE_LABEL[phase]}</div>
              <div className="text-stone-500">
                {turn.isMine ? "Your page" : activeName ? `${activeName}'s page` : "Final page"}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 lg:grid-cols-[230px_minmax(0,1fr)_250px]">
          <aside className="space-y-4">
            <section className={`${PANEL} p-3`} aria-label="Turn resources">
              <h2 className="mb-2 font-serif text-xl font-bold">Working palette</h2>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Actions" value={view.actionsLeft} />
                <Stat label="Buys" value={view.buysLeft} />
                <Stat label="Inspiration" value={view.inspiration} />
                <Stat label="Draw deck" value={view.deckCountByPlayerId[playerId] ?? 0} />
              </div>
            </section>
            <section className={`${PANEL} p-3`} aria-label="Your card cycle">
              <h2 className="font-serif text-xl font-bold">Card cycle</h2>
              <p className="mb-2 text-xs text-stone-500">
                Discard {discard.length} · In play {inPlay.length}
              </p>
              <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">In play</h3>
              <CardStrip cardIds={inPlay} empty="Nothing played yet." />
              <h3 className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Public discard</h3>
              <CardStrip cardIds={discard.slice(-4)} empty="Discard is empty." />
            </section>
          </aside>

          <section className={`${PANEL} space-y-5 p-4`} aria-label="Shared supply">
            <div className="flex items-end justify-between gap-3 border-b border-dashed border-stone-400 pb-2">
              <div>
                <h2 className="font-serif text-2xl font-black">Studio shelf</h2>
                <p className="text-xs text-stone-500">Top cards and pile counts are public.</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                {view.step ?? "complete"}
              </span>
            </div>
            {SUPPLY_GROUPS.map(({ label, surfaceKey }) => (
              <SupplyGroup
                key={label}
                label={label}
                surface={supplySurfaces[surfaceKey]!}
                supplyCounts={view.supplyCountByZoneId}
              />
            ))}
          </section>

          <aside className="space-y-4">
            <section className={`${PANEL} p-3`} aria-label="Artists">
              <h2 className="mb-2 font-serif text-xl font-bold">Artists</h2>
              <PlayerRoster.Root
                score={(id) => view.portfolioScores[id] ?? 0}
                scoreLabel="Portfolio"
              >
                <PlayerRoster.List className="space-y-2">
                  {(player) => (
                    <div
                      key={player.playerId}
                      className={`rounded-xl border-2 px-3 py-2 ${
                        player.isActive
                          ? "border-rose-400 bg-rose-50"
                          : "border-stone-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between gap-2 font-bold">
                        <PlayerRoster.Name player={player} />
                        <PlayerRoster.Score player={player} />
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-stone-500">
                        {view.handCountByPlayerId[player.playerId] ?? 0} in hand · {view.deckCountByPlayerId[player.playerId] ?? 0} in deck
                      </div>
                    </div>
                  )}
                </PlayerRoster.List>
              </PlayerRoster.Root>
            </section>
            <section className={`${PANEL} p-3`} aria-label="Recent events">
              <h2 className="mb-2 font-serif text-xl font-bold">Margin notes</h2>
              <ol className="space-y-2 text-xs text-stone-600">
                {view.history.slice(-6).map((entry, index) => (
                  <li key={`${entry.turn}-${entry.kind}-${index}`} className="border-l-2 border-sky-300 pl-2">
                    {entry.summary}
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>

        <section className="sticky bottom-0 z-20 border-t-2 border-stone-800 bg-[#fffdf7]/95 px-3 py-3 backdrop-blur" aria-label="Your hand">
          <div className="mx-auto max-w-7xl">
            <hand.Hand className="min-h-[138px]" cardSize="md">
              <hand.Actions>
                {() => <SketchbookActions />}
              </hand.Actions>
              <hand.Staging label="Selected for Eraser" cardSize="md">
                {(card) => (
                  <CardFace
                    card={card}
                    size="md"
                    selected
                    renderContent={(value) => <SketchCardContent card={value} />}
                  />
                )}
              </hand.Staging>
              <hand.Cards>
                {(card, state) =>
                  card.hidden ? (
                    <hand.Card card={card} />
                  ) : (
                    <hand.Card card={card} className="border-0 bg-transparent p-0">
                      <CardFace
                        card={card}
                        size="md"
                        eligible={state.distinctlyEligible}
                        selected={state.selected}
                        invalid={state.invalid}
                        renderContent={(value) => <SketchCardContent card={value} />}
                      />
                    </hand.Card>
                  )
                }
              </hand.Cards>
            </hand.Hand>
          </div>
        </section>
      </main>

      <SketchbookRoutes hand={hand} market={market} />
      <OutcomeDialog
        outcome={view.outcome}
        playerName={(id) => players.byId.get(id)?.name ?? id}
      />
    </>
  );
}
