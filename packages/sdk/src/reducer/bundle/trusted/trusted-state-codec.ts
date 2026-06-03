export function toDomainState<State extends { runtime: unknown }, DomainState>(
  state: State,
): DomainState {
  const { runtime: _runtime, ...domain } = state;
  attachPhaseAccessor(domain);
  return domain as DomainState;
}

export function toCombinedState<
  SessionState extends { domain: unknown; runtime: unknown },
  State,
>(session: SessionState): State {
  const combined = {
    ...(session.domain as object),
    runtime: session.runtime,
  };
  attachPhaseAccessor(combined);
  return combined as State;
}

export function toSessionState<
  State extends { runtime: unknown },
  DomainState,
  SessionState,
>(state: State, toDomain: (state: State) => DomainState): SessionState {
  return {
    domain: toDomain(state),
    runtime: state.runtime,
  } as SessionState;
}

function attachPhaseAccessor(state: unknown): void {
  if (!state || typeof state !== "object") return;
  const candidate = state as {
    flow?: { currentPhase?: unknown };
    phase?: unknown;
  };
  const phase = candidate.phase;
  if (!phase || typeof phase !== "object") return;
  const descriptor = Object.getOwnPropertyDescriptor(phase, "get");
  if (descriptor && typeof descriptor.value === "function") return;
  Object.defineProperty(phase, "get", {
    enumerable: false,
    configurable: true,
    value: (phaseName: string) =>
      candidate.flow?.currentPhase === phaseName ? phase : null,
  });
}
