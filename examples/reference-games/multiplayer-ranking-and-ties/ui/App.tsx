import type { HarborPlayerView } from "../app/player-view";
import {
  Game,
  UI,
  Zone,
  type CardCollectionSurface,
  type GameView,
} from "../shared/generated/ui-contract";
import type { CardId } from "../shared/manifest-contract";
import { HarborFairInteractionRoutes } from "./interaction-routes";
import "./style.css";

const playerNames: Record<string, string> = {
  "player-1": "Aster",
  "player-2": "Bryn",
  "player-3": "Cato",
  "player-4": "Diem",
};

const useHarborFairSurfaces = UI.defineSurfaces({
  market: Zone.collection(["market"] as const),
});

function playerName(playerId: string) {
  return playerNames[playerId] ?? playerId;
}

const fallbackView: HarborPlayerView = {
  currentPhase: "drafting",
  round: 1,
  activePlayerId: "player-1",
  market: [
    { kind: "stall", id: "food-p1-c1-1", guild: "food", prestige: 1, coins: 1 },
    {
      kind: "stall",
      id: "craft-p2-c0-1",
      guild: "craft",
      prestige: 2,
      coins: 0,
    },
    {
      kind: "stall",
      id: "music-p2-c1-1",
      guild: "music",
      prestige: 2,
      coins: 1,
    },
    { kind: "stall", id: "food-p3-c0-1", guild: "food", prestige: 3, coins: 0 },
  ],
  legalMarketCardIds: [
    "food-p1-c1-1",
    "craft-p2-c0-1",
    "music-p2-c1-1",
    "food-p3-c0-1",
  ],
  festivalRows: {
    "player-1": [],
    "player-2": [],
    "player-3": [],
    "player-4": [],
  },
  stormsRevealed: 0,
  stormHistory: [],
  events: [],
  completed: false,
  outcome: null,
  playerId: "player-1",
  isActivePlayer: true,
};

function OutcomeTable({
  outcome,
}: {
  outcome: NonNullable<GameView["outcome"]>;
}) {
  const cancellation = outcome.reason.code === "FESTIVAL_CANCELLED";
  return (
    <div className="outcome-scroll">
      <table className="outcome-table" data-testid="standings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Organizer</th>
            <th>Result</th>
            {!cancellation ? <th>Score</th> : null}
            {!cancellation ? <th>Tie-breaks</th> : null}
          </tr>
        </thead>
        <tbody>
          {outcome.standings.map((standing) => (
            <tr key={standing.playerId}>
              <td>{standing.rank}</td>
              <td>{playerName(standing.playerId)}</td>
              <td>{standing.result}</td>
              {!cancellation ? <td>{standing.score}</td> : null}
              {!cancellation ? (
                <td>
                  {standing.tieBreaks
                    ?.map((item) => `${item.label}: ${item.value}`)
                    .join(" · ")}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HarborFairLayout({
  view,
  runtime = false,
  marketSurface,
  onDraft,
}: {
  view: HarborPlayerView | GameView;
  runtime?: boolean;
  marketSurface?: CardCollectionSurface<readonly ["market"]>;
  onDraft?: (stallId: CardId) => void;
}) {
  const playerIds = Object.keys(view.festivalRows);
  const cancellation = view.outcome?.reason.code === "FESTIVAL_CANCELLED";

  return (
    <main
      className="harbor-fair"
      data-reference-game="multiplayer-ranking-and-ties"
    >
      <header className="harbor-header">
        <div>
          <p className="eyebrow">Harbor Fair</p>
          <h1>Build a festival worth celebrating</h1>
          <p className="subtitle">
            Draft one public stall per round. Balanced guilds, prestige, and
            coins decide the final ranking.
          </p>
        </div>
        <div className="round-badge">
          <span>Round</span>
          <strong>{view.round}/6</strong>
        </div>
      </header>

      <section className="status-strip" aria-label="Fair status">
        <div>
          <span>Now organizing</span>
          <strong>
            {view.activePlayerId
              ? playerName(view.activePlayerId)
              : "Fair complete"}
          </strong>
        </div>
        <div>
          <span>Storms revealed</span>
          <strong>{view.stormsRevealed}/2</strong>
        </div>
        <div>
          <span>Your turn</span>
          <strong>
            {"isActivePlayer" in view && view.isActivePlayer
              ? "Choose a stall"
              : "Watch the market"}
          </strong>
        </div>
      </section>

      <section
        aria-labelledby="market-heading"
        className="harbor-panel market-panel"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Four public awnings</p>
            <h2 id="market-heading">Market</h2>
          </div>
          <p>Storms resolve during refill and never occupy a stall.</p>
        </div>
        <div className="market-grid">
          {runtime && marketSurface ? (
            <marketSurface.Collection>
              {(surfaceCard) => {
                if (surfaceCard.hidden) return null;
                const index = view.market.findIndex(
                  (candidate) => candidate?.id === surfaceCard.id,
                );
                const card = view.market[index];
                if (!card) return null;
                return (
                  <marketSurface.Card
                    card={surfaceCard}
                    className={`market-card guild-${card.guild}`}
                    style={{ order: index }}
                  >
                    <StallContent card={card} position={index + 1} />
                  </marketSurface.Card>
                );
              }}
            </marketSurface.Collection>
          ) : (
            view.market.map((card, index) =>
              card ? (
                <button
                  key={card.id}
                  type="button"
                  className={`market-card guild-${card.guild}`}
                  disabled={!view.legalMarketCardIds.includes(card.id)}
                  onClick={() => onDraft?.(card.id)}
                >
                  <StallContent card={card} position={index + 1} />
                </button>
              ) : (
                <div className="market-card empty-stall" key={`empty-${index}`}>
                  Refill interrupted
                </div>
              ),
            )
          )}
        </div>
        {runtime && marketSurface ? (
          <HarborFairInteractionRoutes market={marketSurface} />
        ) : null}
      </section>

      <section aria-labelledby="rows-heading" className="harbor-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Public collections</p>
            <h2 id="rows-heading">Festival rows</h2>
          </div>
          <p>One food, craft, and music stall forms a four-point guild set.</p>
        </div>
        <div className="festival-grid">
          {playerIds.map((playerId) => {
            const cards = view.festivalRows[playerId] ?? [];
            const counts = {
              food: cards.filter(({ guild }) => guild === "food").length,
              craft: cards.filter(({ guild }) => guild === "craft").length,
              music: cards.filter(({ guild }) => guild === "music").length,
            };
            const completeSets = Math.min(
              counts.food,
              counts.craft,
              counts.music,
            );
            return (
              <article className="festival-row" key={playerId}>
                <div className="festival-row-title">
                  <strong>{playerName(playerId)}</strong>
                  <span>{cards.length}/6 stalls</span>
                </div>
                <div className="guild-counts">
                  <span>Food {counts.food}</span>
                  <span>Craft {counts.craft}</span>
                  <span>Music {counts.music}</span>
                </div>
                <p>
                  {completeSets} complete guild set
                  {completeSets === 1 ? "" : "s"}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="history-heading"
        className="harbor-panel history-panel"
      >
        <div>
          <p className="eyebrow">Refill history</p>
          <h2 id="history-heading">Harbor log</h2>
        </div>
        <ol aria-live="polite">
          {view.events.length === 0 ? (
            <li>The market is ready for its first organizer.</li>
          ) : (
            view.events
              .slice(-10)
              .map((event, index) => (
                <li key={`${event.kind}-${index}`}>{eventLabel(event)}</li>
              ))
          )}
        </ol>
      </section>

      {view.outcome ? (
        <section
          className={`harbor-panel outcome-panel ${cancellation ? "cancelled" : "judged"}`}
        >
          <p className="eyebrow">Authoritative outcome</p>
          <h2>
            {cancellation ? "The fair is cancelled" : "Festival standings"}
          </h2>
          <p>{view.outcome.reason.message}</p>
          <OutcomeTable outcome={view.outcome} />
        </section>
      ) : null}
    </main>
  );
}

function StallContent({
  card,
  position,
}: {
  card: NonNullable<GameView["market"][number]>;
  position: number;
}) {
  return (
    <>
      <span className="stall-position">Awnings {position}</span>
      <strong>{card.guild} guild</strong>
      <span>Prestige {card.prestige}</span>
      <span>Coins {card.coins}</span>
      <small>Draft stall</small>
    </>
  );
}

function eventLabel(event: GameView["events"][number]) {
  switch (event.kind) {
    case "stall-drafted":
      return `${playerName(event.playerId)} drafted ${event.cardId}.`;
    case "market-refilled":
      return `Awnings ${event.marketIndex + 1} refilled with ${event.cardId}.`;
    case "storm-revealed":
      return `Storm revealed (${event.stormsRevealed}/2).`;
    case "round-advanced":
      return `Round ${event.nextRound} began.`;
    case "festival-scored":
      return "Six rounds completed; standings published.";
  }
}

export function App({
  view = fallbackView,
  onDraft,
}: {
  view?: HarborPlayerView;
  onDraft?: (stallId: CardId) => void;
}) {
  return <HarborFairLayout view={view} onDraft={onDraft} />;
}

function HarborFairGame() {
  const { market } = useHarborFairSurfaces();
  return (
    <Game.Root>
      {(state) => (
        <HarborFairLayout view={state.view} runtime marketSurface={market} />
      )}
    </Game.Root>
  );
}

export default function RuntimeApp() {
  return (
    <UI.Root>
      <HarborFairGame />
    </UI.Root>
  );
}
