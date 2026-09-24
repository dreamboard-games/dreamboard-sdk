import "./tokens.css";
import { useState } from "react";
/** Mount only in a local development entry, with testing-source callbacks. */
export interface ScenarioControlsProps {
  scenarios: readonly string[];
  players: readonly { playerId: string; displayName?: string }[];
  me: string;
  onSeatChange(playerId: string): void;
  onCheckpoint(): unknown;
  onRestore(checkpoint: unknown): void;
}
export function ScenarioControls({
  scenarios,
  players,
  me,
  onSeatChange,
  onCheckpoint,
  onRestore,
}: ScenarioControlsProps) {
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <details open className="db-scenario-controls">
      <summary>Local scenario tools</summary>
      <div className="db-scenario-toolbar">
        <label>
          Scenario
          <select
            aria-label="Scenario"
            defaultValue={
              new URLSearchParams(location.search).get("scenario") ?? ""
            }
            onChange={(event) => {
              const url = new URL(location.href);
              url.searchParams.set("scenario", event.currentTarget.value);
              url.searchParams.delete("at");
              location.assign(url);
            }}
          >
            <option value="">New game</option>
            {scenarios.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
        <label>
          Selected seat
          <select
            aria-label="Selected seat"
            value={me}
            onChange={(event) => onSeatChange(event.currentTarget.value)}
          >
            {players.map((player) => (
              <option key={player.playerId} value={player.playerId}>
                {player.displayName ?? player.playerId}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setSaved(JSON.stringify(onCheckpoint()));
            setError(null);
          }}
        >
          Save checkpoint
        </button>
        <button
          type="button"
          disabled={saved === null}
          onClick={() => {
            try {
              onRestore(JSON.parse(saved!));
              setError(null);
            } catch (error) {
              setError(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          Restore checkpoint
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
