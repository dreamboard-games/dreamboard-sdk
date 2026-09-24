import { useGame } from "@game";
/** Selected-seat data only. Reducer state belongs exclusively in local dev tooling. */
export function Inspector() {
  const model = useGame((game) => ({
    version: game.version,
    phase: game.phase.current,
    me: game.me?.id,
    view: game.view,
    state: game.state,
    connection: game.connection,
    request: game.request,
  }));
  return (
    <details>
      <summary>Inspect selected-seat view</summary>
      <pre>{JSON.stringify(model, null, 2)}</pre>
    </details>
  );
}
