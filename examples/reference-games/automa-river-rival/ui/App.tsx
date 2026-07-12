import type { ProcedureEvent } from "../app/game-contract";
import {
  Game,
  UI,
  Zone,
  type CardCollectionSurface,
  type GameView,
} from "../shared/generated/ui-contract";
import { RiverGuildInteractionRoutes } from "./interaction-routes";
import "./style.css";

const useRiverGuildSurfaces = UI.defineSurfaces({
  river: Zone.collection(["river"] as const),
});

type Cargo = GameView["river"][number];

const kindLabels = {
  timber: "Timber",
  grain: "Grain",
  ore: "Ore",
} as const;

function seatLabel(playerId: string) {
  const parts = playerId.split("-");
  const seat = Number(parts[parts.length - 1]);
  return Number.isFinite(seat) ? `Guild member ${seat}` : playerId;
}

function CargoFace({ cargo, position }: { cargo: Cargo; position?: number }) {
  return (
    <span className="cargo-face">
      {position === undefined ? null : (
        <span className="cargo-position">Mooring {position + 1}</span>
      )}
      <span
        className={`cargo-mark cargo-${cargo.cargoKind}`}
        aria-hidden="true"
      >
        {cargo.cargoKind === "timber"
          ? "▤"
          : cargo.cargoKind === "grain"
            ? "✦"
            : "◆"}
      </span>
      <strong>{kindLabels[cargo.cargoKind]}</strong>
      <span className="cargo-value">
        {cargo.value} progress {cargo.value === 1 ? "mark" : "marks"}
      </span>
    </span>
  );
}

function CargoChips({ cargo }: { cargo: readonly Cargo[] }) {
  if (cargo.length === 0) {
    return <span className="empty-copy">No cargo claimed yet</span>;
  }
  return (
    <ul className="cargo-chips" aria-label="Claimed cargo">
      {cargo.map((card) => (
        <li className={`cargo-chip cargo-${card.cargoKind}`} key={card.id}>
          {kindLabels[card.cargoKind]} {card.value}
        </li>
      ))}
    </ul>
  );
}

function eventLabel(event: ProcedureEvent) {
  switch (event.kind) {
    case "rival-instruction-revealed":
      return event.instructionKind === "claimHighest"
        ? "Rival order: claim the highest cargo."
        : event.instructionKind === "claimKind"
          ? `Rival order: claim ${event.cargoKind ?? "matching"} cargo.`
          : "Rival order: sweep the leftmost cargo.";
    case "rival-cargo-claimed":
      return `Rival claimed ${event.cargoKind} ${event.value} from mooring ${event.position + 1}.`;
    case "rival-river-swept":
      return `Rival swept the leftmost ${event.cargoKind} for exactly one progress.`;
    case "river-refilled":
      return `${event.source === "human" ? "Human" : "Rival"} mooring ${event.position + 1} refilled.`;
    case "river-round-advanced":
      return event.nextRound === null
        ? "Six river rounds complete."
        : `Round ${event.nextRound} began.`;
  }
}

function ResultPanel({
  outcome,
}: {
  outcome: NonNullable<GameView["outcome"]>;
}) {
  const standing = outcome.standings[0];
  if (!standing) return null;
  const title =
    standing.result === "win"
      ? "The guild outpaced the rival"
      : standing.result === "draw"
        ? "The guilds finish level"
        : "The rival led the river";
  return (
    <section className={`river-panel outcome-panel outcome-${standing.result}`}>
      <p className="eyebrow">Authoritative cooperative outcome</p>
      <h2>{title}</h2>
      <p>
        Every human shares rank 1, the same {standing.result}, and the team
        score of {standing.score}.
      </p>
      <dl className="outcome-breakdown">
        {standing.scoreBreakdown?.map((component) => (
          <div key={component.id}>
            <dt>{component.label}</dt>
            <dd>{component.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RiverGuildLayout({
  view,
  riverSurface,
}: {
  view: GameView;
  riverSurface: CardCollectionSurface<readonly ["river"]>;
}) {
  const latestInstruction =
    view.rival.instructionHistory[view.rival.instructionHistory.length - 1];
  return (
    <main
      className="river-guild"
      data-reference-game="automa-river-rival"
      data-reference-phase={view.currentPhase}
    >
      <header className="river-header">
        <div>
          <p className="eyebrow">A cooperative cargo race</p>
          <h1>River Guild</h1>
          <p className="river-intro">
            Claim one vessel in seat order. Then the rival guild reveals and
            resolves one deterministic instruction.
          </p>
        </div>
        <div
          className="round-medallion"
          aria-label={`Round ${view.round} of 6`}
        >
          <span>Round</span>
          <strong>{view.round}/6</strong>
        </div>
      </header>

      <section className="score-race" aria-label="Guild progress">
        <div className="score-team">
          <span>Your guild</span>
          <strong>{view.teamScore}</strong>
        </div>
        <div className="river-line" aria-hidden="true">
          <span>≈</span>
          <span>≈</span>
          <span>≈</span>
        </div>
        <div className="score-rival">
          <span>Rival guild</span>
          <strong>{view.rival.progress}</strong>
        </div>
      </section>

      <div className="river-layout">
        <section className="river-main">
          <section
            className="river-panel river-market"
            aria-labelledby="river-heading"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Four public moorings</p>
                <h2 id="river-heading">Cargo river</h2>
              </div>
              <p>
                {view.activeHumanId
                  ? `${seatLabel(view.activeHumanId)} chooses now.`
                  : "The river race is complete."}
              </p>
            </div>
            <div className="river-cards">
              <riverSurface.Collection>
                {(surfaceCard) => {
                  if (surfaceCard.hidden) return null;
                  const position = view.river.findIndex(
                    ({ id }) => id === surfaceCard.id,
                  );
                  const cargo = view.river[position];
                  if (!cargo) return null;
                  return (
                    <riverSurface.Card
                      card={surfaceCard}
                      className={`river-card cargo-${cargo.cargoKind}`}
                      data-cargo-id={cargo.id}
                      style={{ order: position }}
                    >
                      <CargoFace cargo={cargo} position={position} />
                    </riverSurface.Card>
                  );
                }}
              </riverSurface.Collection>
            </div>
            <RiverGuildInteractionRoutes river={riverSurface} />
            <p className="river-guidance" aria-live="polite">
              {view.currentPhase === "humanTurn"
                ? view.isActiveHuman
                  ? "Choose any cargo card. Its printed value joins the team score."
                  : "Another guild member is choosing from the public river."
                : view.currentPhase === "gameOver"
                  ? "All six rival instructions have resolved."
                  : "The rival procedure is resolving automatically."}
            </p>
          </section>

          <section className="river-panel" aria-labelledby="warehouses-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Public contributions</p>
                <h2 id="warehouses-heading">Guild warehouses</h2>
              </div>
              <p>Every seat contributes to one shared result.</p>
            </div>
            <div className="warehouse-grid">
              {view.playerIds.map((playerId) => (
                <article className="warehouse" key={playerId}>
                  <div className="warehouse-title">
                    <strong>{seatLabel(playerId)}</strong>
                    <span>
                      {view.contributionByPlayer[playerId] ?? 0} marks
                    </span>
                  </div>
                  <CargoChips cargo={view.humanCargoByPlayer[playerId] ?? []} />
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="river-sidebar">
          <section
            className="river-panel rival-panel"
            aria-labelledby="rival-heading"
          >
            <p className="eyebrow">Ordinary reducer state</p>
            <h2 id="rival-heading">Rival instructions</h2>
            <div className="instruction-stamp">
              {latestInstruction ? (
                <>
                  <span>Latest order</span>
                  <strong>
                    {latestInstruction.instructionKind === "claimHighest"
                      ? "Claim highest"
                      : latestInstruction.instructionKind === "claimKind"
                        ? `Claim ${latestInstruction.cargoKind}`
                        : "Sweep left"}
                  </strong>
                </>
              ) : (
                <>
                  <span>Orders remain hidden</span>
                  <strong>{view.rival.instructionDeckCount} sealed</strong>
                </>
              )}
            </div>
            <ol
              className="instruction-history"
              aria-label="Revealed rival orders"
            >
              {view.rival.instructionHistory.map((instruction, index) => (
                <li key={instruction.id}>
                  <span>{index + 1}</span>
                  {instruction.instructionKind === "claimHighest"
                    ? "Highest"
                    : instruction.instructionKind === "claimKind"
                      ? kindLabels[instruction.cargoKind!]
                      : "Sweep"}
                </li>
              ))}
            </ol>
          </section>

          <section
            className="river-panel event-panel"
            aria-labelledby="log-heading"
          >
            <p className="eyebrow">Public procedure trace</p>
            <h2 id="log-heading">River log</h2>
            <ol aria-live="polite">
              {view.procedureEvents.length === 0 ? (
                <li>The opening cargo waits at four moorings.</li>
              ) : (
                view.procedureEvents
                  .slice(-10)
                  .map((event, index) => (
                    <li
                      key={`${event.kind}-${view.procedureEvents.length - 10 + index}`}
                    >
                      {eventLabel(event)}
                    </li>
                  ))
              )}
            </ol>
          </section>

          <section
            className="river-panel deck-panel"
            aria-label="Hidden deck counts"
          >
            <div>
              <span>Cargo deck</span>
              <strong>{view.cargoDeckCount}</strong>
            </div>
            <div>
              <span>Sealed orders</span>
              <strong>{view.rival.instructionDeckCount}</strong>
            </div>
          </section>
        </aside>
      </div>

      {view.outcome ? <ResultPanel outcome={view.outcome} /> : null}
    </main>
  );
}

function RiverGuildGame() {
  const { river } = useRiverGuildSurfaces();
  return (
    <Game.Root>
      {({ view }) => <RiverGuildLayout view={view} riverSurface={river} />}
    </Game.Root>
  );
}

export default function App() {
  return (
    <UI.Root>
      <RiverGuildGame />
    </UI.Root>
  );
}
