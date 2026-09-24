import { useState, type ReactNode } from "react";
import type { GameSource } from "@dreamboard-games/sdk";
import { GameProvider, useGame } from "./game";
import { App } from "./App";

type Notice = {
  message: string;
  source: GameSource;
  version: number | null;
  me: string | null;
};
function ErrorNotice({
  error,
  source,
  dismiss,
}: {
  error: Notice | null;
  source: GameSource;
  dismiss(): void;
}) {
  const version = useGame((state) => state.version);
  const me = useGame((state) => state.me?.id ?? null);
  if (
    !error ||
    error.source !== source ||
    error.version !== version ||
    error.me !== me
  )
    return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b-2 border-red-800 bg-red-50 p-4 text-red-950"
    >
      <p>{error.message}</p>
      <button
        type="button"
        className="min-h-11 rounded border border-red-800 px-3"
        onClick={dismiss}
      >
        Dismiss error
      </button>
    </div>
  );
}
export function GameShell({
  source,
  children,
}: {
  source: GameSource;
  children?: ReactNode;
}) {
  const [error, setError] = useState<Notice | null>(null);
  return (
    <GameProvider
      source={source}
      onError={(value) => {
        const snapshot = source.store.get().snapshot;
        setError({
          message: value instanceof Error ? value.message : String(value),
          source,
          version: snapshot?.version ?? null,
          me: snapshot?.me ?? null,
        });
      }}
    >
      {children}
      <ErrorNotice
        error={error}
        source={source}
        dismiss={() => setError(null)}
      />
      <App />
    </GameProvider>
  );
}
