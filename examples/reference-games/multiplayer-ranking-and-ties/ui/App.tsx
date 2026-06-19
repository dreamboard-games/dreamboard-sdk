import type { HarborOutcome } from "../app/game-contract";
import { cardById, legalMarketCardIds } from "../app/phases/draft-flow";
import { scenarioMetadata } from "../app/phases/scenarios";
import { DraftInteractionRoutes } from "./interaction-routes";
import "./style.css";

const playerNames: Record<string, string> = {
  "player-1": "Aster",
  "player-2": "Bryn",
  "player-3": "Cato",
  "player-4": "Diem",
};

function playerName(playerId: string) {
  return playerNames[playerId] ?? playerId;
}

function OutcomeTable({ outcome }: { outcome: HarborOutcome }) {
  return (
    <table className="outcome-table" data-testid="standings-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Result</th>
          <th>Score</th>
          <th>Tie-breaks</th>
        </tr>
      </thead>
      <tbody>
        {outcome.standings.map((standing) => (
          <tr key={standing.playerId}>
            <td>{standing.rank}</td>
            <td>{playerName(standing.playerId)}</td>
            <td>{standing.result}</td>
            <td>{standing.score ?? "scoreless"}</td>
            <td>
              {standing.tieBreaks
                ?.map((item) => `${item.label}: ${item.value}`)
                .join(", ") ?? "none"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function App() {
  const state = scenarioMetadata.initial.state;
  const tieBreakOutcome = scenarioMetadata.completeSetTieBreak.state.outcome!;
  const legalCards = legalMarketCardIds(state);

  return (
    <div
      className="harbor-fair"
      data-reference-game="multiplayer-ranking-and-ties"
    >
      <header className="harbor-header">
        <p className="eyebrow">Harbor Fair</p>
        <h1>Multiplayer Ranking And Ties</h1>
        <p>
          Round {state.round} · Active player{" "}
          {playerName(state.playerIds[state.activePlayerIndex]!)}
        </p>
      </header>
      <section aria-labelledby="market-heading">
        <h2 id="market-heading">Market</h2>
        <div className="market-grid">
          {legalCards.map((cardId) => {
            const card = cardById[cardId];
            return card.kind === "stall" ? (
              <article className="market-card" key={cardId}>
                <strong>{card.guild}</strong>
                <span>Prestige {card.prestige}</span>
                <span>Coins {card.coins}</span>
              </article>
            ) : null;
          })}
        </div>
      </section>
      <DraftInteractionRoutes cardId={legalCards[0]!} />
      <section aria-labelledby="rows-heading">
        <h2 id="rows-heading">Festival Rows</h2>
        <div className="row-grid">
          {state.playerIds.map((playerId) => (
            <article className="festival-row" key={playerId}>
              <strong>{playerName(playerId)}</strong>
              <span>{state.festivalRows[playerId]?.length ?? 0} stalls</span>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="outcome-heading">
        <h2 id="outcome-heading">Tie-break Outcome</h2>
        <OutcomeTable outcome={tieBreakOutcome} />
      </section>
    </div>
  );
}
