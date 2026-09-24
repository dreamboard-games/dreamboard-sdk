import { useState } from "react";
import type { GameSource } from "@dreamboard-games/sdk";
import { Counter, GameProvider } from "./game";

export function App({ source }: { source: GameSource }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <GameProvider source={source} onError={(error) => setError(String(error))}>
      <Counter />
      {error && (
        <p role="alert">
          {error} <button onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}
    </GameProvider>
  );
}
