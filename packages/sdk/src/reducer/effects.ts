import type {
  AnyContinuationToken,
  EffectSpecLike,
  ReducerFx,
  RuntimeTableRecord,
} from "./model";

type FxState = {
  table: RuntimeTableRecord;
  flow: { currentPhase: string };
};

type InternalEffectDefinition = EffectSpecLike;

function buildResume(
  effect: InternalEffectDefinition,
  context: unknown,
): AnyContinuationToken | undefined {
  if (!effect.__continuation) {
    return undefined;
  }
  return (effect.__continuation as unknown as (data: unknown) => unknown)(
    context ?? {},
  ) as AnyContinuationToken;
}

function invokeEffect(
  effect: InternalEffectDefinition,
  options: Record<string, unknown>,
) {
  const continuation = buildResume(effect, options.context);
  if (effect.type === "rollDie") {
    return continuation === undefined
      ? {
          kind: "engine.rollDie" as const,
          dieId: options.dieId as string,
        }
      : {
          kind: "engine.rollDie" as const,
          dieId: options.dieId as string,
          continuation,
        };
  }
  if (effect.type === "shuffleSharedZone") {
    return continuation === undefined
      ? {
          kind: "engine.shuffleSharedZone" as const,
          zoneId: options.zoneId as string,
        }
      : {
          kind: "engine.shuffleSharedZone" as const,
          zoneId: options.zoneId as string,
          continuation,
        };
  }
  if (effect.type === "shufflePlayerZone") {
    return continuation === undefined
      ? {
          kind: "engine.shufflePlayerZone" as const,
          zoneId: options.zoneId as string,
          playerId: options.playerId as string,
        }
      : {
          kind: "engine.shufflePlayerZone" as const,
          zoneId: options.zoneId as string,
          playerId: options.playerId as string,
          continuation,
        };
  }
  throw new Error(
    `fx.effect: unsupported effect type '${(effect as InternalEffectDefinition).type}'.`,
  );
}

export function createReducerFx<State extends FxState>(
  _state: State,
): ReducerFx<State> {
  const fx: ReducerFx<State> = {
    transition(to) {
      return { kind: "flow.transition", to } as ReturnType<
        ReducerFx<State>["transition"]
      >;
    },
    effect(effect, options) {
      return invokeEffect(
        effect as unknown as InternalEffectDefinition,
        options as Record<string, unknown>,
      ) as ReturnType<ReducerFx<State>["effect"]>;
    },
  } as ReducerFx<State>;
  return fx;
}
