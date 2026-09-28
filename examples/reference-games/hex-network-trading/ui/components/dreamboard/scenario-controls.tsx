import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import "./tokens.css";
import { useId, useState } from "react";
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
  const fieldId = useId();
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <details
      open
      className="db-scenario-controls rounded-lg border border-border p-4"
    >
      <summary className="mb-3 w-full cursor-pointer font-semibold">
        Local scenario tools
      </summary>
      <div className="db-scenario-toolbar flex flex-wrap items-center gap-3">
        <div className="m-1 flex flex-col items-start gap-1">
          <Label htmlFor={`${fieldId}-scenario`}>Scenario</Label>
          <NativeSelect
            className="[&_select]:min-h-11"
            id={`${fieldId}-scenario`}
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
            <NativeSelectOption value="">New game</NativeSelectOption>
            {scenarios.map((id) => (
              <NativeSelectOption key={id}>{id}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="m-1 flex flex-col items-start gap-1">
          <Label htmlFor={`${fieldId}-seat`}>Selected seat</Label>
          <NativeSelect
            className="[&_select]:min-h-11"
            id={`${fieldId}-seat`}
            aria-label="Selected seat"
            value={me}
            onChange={(event) => onSeatChange(event.currentTarget.value)}
          >
            {players.map((player) => (
              <NativeSelectOption key={player.playerId} value={player.playerId}>
                {player.displayName ?? player.playerId}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          type="button"
          onClick={() => {
            setSaved(JSON.stringify(onCheckpoint()));
            setError(null);
          }}
        >
          Save checkpoint
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
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
        </Button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
