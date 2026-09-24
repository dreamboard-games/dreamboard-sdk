import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { GameSource } from "@dreamboard-games/sdk";
import { GameProvider, useGame } from "./game";
import App from "./App";

function ClearErrorOnFrame({ clear }: { clear(): void }) {
  const version = useGame((game) => game.version);
  useEffect(clear, [clear, version]);
  return null;
}

export function GameShell({
  source,
  children,
}: {
  source: GameSource;
  children?: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const clear = useCallback(() => setError(null), []);
  return (
    <GameProvider
      source={source}
      onError={(cause) =>
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    >
      <ClearErrorOnFrame clear={clear} />
      {children}
      {error && (
        <div
          role="alert"
          className="m-3 flex items-center justify-between gap-3 rounded-xl border-2 border-red-800 bg-red-50 p-3 text-red-950"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={clear}
            className="min-h-11 rounded border border-red-800 px-3"
          >
            Dismiss error
          </button>
        </div>
      )}
      <App />
    </GameProvider>
  );
}
