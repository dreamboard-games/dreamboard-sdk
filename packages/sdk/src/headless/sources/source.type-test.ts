import type { ApplySource, CommandSource, GameSource } from "./types.js";

export function sourceCapabilities(
  hosted: CommandSource,
  fixed: GameSource,
  local: ApplySource<{ type: "advance"; count: number }>,
) {
  const failure: Readonly<Error> | null = hosted.store.get().failure;
  if (failure) {
    const message: string = failure.message;
    void message;
    // @ts-expect-error Source diagnostics cannot be reassigned by consumers.
    failure.message = "changed";
  }
  void hosted.submit("move", { destination: "a" });
  void hosted.cancel("move");
  // @ts-expect-error Retry belongs to transport lifecycle recovery.
  hosted.retry();
  local.apply({ type: "advance", count: 2 });
  // @ts-expect-error Hosted transports cannot execute local reducers.
  hosted.apply({ type: "advance", count: 2 });
  // @ts-expect-error Static sources cannot issue commands.
  fixed.submit("move", {});
  // @ts-expect-error Local capabilities preserve their action contract.
  local.apply({ type: "advance", count: "two" });
  // @ts-expect-error Basis is private to the source lifetime.
  void hosted.store.get().snapshot?.frame.basis;
  // @ts-expect-error Store mutation is source-owned.
  hosted.store.setState({});
  void hosted.submit("move", {}).then((result) => {
    // @ts-expect-error Transport receipt identities are not instance results.
    void result.clientActionId;
  });
}
