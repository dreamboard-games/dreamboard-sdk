import React from "react";
import {
  Game,
  Interaction,
  PlayerRoster,
} from "@dreamboard-games/sdk/runtime/primitives";
import { GameEventLog, Panel, ThemeProvider } from "@dreamboard-games/sdk/ui";
import { createInitialPublicState, resolveRivalProcedure } from "../app/game";
import { AutomaRiverInteractionRoutes } from "./interaction-routes";

const referenceGameId = "automa-river-rival";
const preview = resolveRivalProcedure({
  ...createInitialPublicState(),
  teamScore: 2,
}).publicState;

function RiverCard({
  card,
}: {
  card: { id: string; kind: string; value: number };
}) {
  return (
    <div className="rounded-md border border-slate-300 bg-slate-50 p-2">
      <strong>{`${card.kind} ${card.value}`}</strong>
      <div className="text-xs text-slate-600">{card.id}</div>
    </div>
  );
}

function RiverPreview({
  river,
}: {
  river: readonly { id: string; kind: string; value: number }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {river.map((card) => (
        <RiverCard key={card.id} card={card} />
      ))}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider reducedMotion="force">
      <Game.Root>
        {() => (
          <Game.Viewport
            className="min-w-0"
            data-reference-game={referenceGameId}
            data-reference-scenario="automa-river-rival.claim-cargo.mobile"
          >
            <Panel.Root style={{ width: "min(100%, 520px)", margin: "0 auto" }}>
              <Panel.Header>
                <Panel.Title>River Guild</Panel.Title>
                <Panel.Description data-reference-phase="humanTurn">
                  Claim cargo for the team, then let the reducer resolve the
                  deterministic rival.
                </Panel.Description>
              </Panel.Header>
              <Panel.Body>
                <PlayerRoster.Root>
                  <PlayerRoster.List>
                    {(player) => (
                      <span data-reference-player={player.playerId}>
                        {player.name}
                      </span>
                    )}
                  </PlayerRoster.List>
                </PlayerRoster.Root>
                <RiverPreview river={preview.river} />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Team</strong>
                    <div>{preview.teamScore}</div>
                  </div>
                  <div>
                    <strong>Rival</strong>
                    <div>{preview.rivalProgress}</div>
                  </div>
                </div>
                <Interaction.Root interaction="claimCargo">
                  <Panel.Actions>
                    <AutomaRiverInteractionRoutes />
                  </Panel.Actions>
                </Interaction.Root>
                <GameEventLog
                  events={preview.eventLog.map((event, index) => ({
                    ...event,
                    version: 2,
                    index,
                  }))}
                  maxVisible={4}
                />
              </Panel.Body>
            </Panel.Root>
          </Game.Viewport>
        )}
      </Game.Root>
    </ThemeProvider>
  );
}
