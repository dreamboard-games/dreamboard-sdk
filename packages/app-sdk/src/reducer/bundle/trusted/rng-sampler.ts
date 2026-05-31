import type {
  CollectorState,
  InputCollector,
  RandomHelpers,
  RuntimeRngState,
  SchemaLike,
} from "../../model";
import { nextRandomInt } from "../../rng";

export type RngConsumption = {
  operation: string;
  traceEntry: string;
};

export type MutableRandomHelpers = {
  random: RandomHelpers;
  currentRng: () => RuntimeRngState;
};

export function sampleDieValue(
  sides: number,
  rng: RuntimeRngState,
): {
  value: number;
  nextRng: RuntimeRngState;
  consumption: RngConsumption;
} {
  const [offset, nextRng] = nextRandomInt(sides, rng);
  return {
    value: offset + 1,
    nextRng,
    consumption: {
      operation: "rollDie",
      traceEntry: nextRng.trace[nextRng.trace.length - 1] ?? "",
    },
  };
}

export function shuffleWithRng<T>(
  values: readonly T[],
  rng: RuntimeRngState,
  operation:
    | "shuffleSharedZone"
    | "shufflePlayerZone"
    | "randomSubset" = "shuffleSharedZone",
): {
  orderedValues: T[];
  nextRng: RuntimeRngState;
  consumptions: RngConsumption[];
} {
  const orderedValues = [...values];
  let nextRng = rng;
  const consumptions: RngConsumption[] = [];
  for (
    let lastIndex = orderedValues.length - 1;
    lastIndex > 0;
    lastIndex -= 1
  ) {
    const [swapIndex, updatedRng] = nextRandomInt(lastIndex + 1, nextRng);
    consumptions.push({
      operation,
      traceEntry: updatedRng.trace[updatedRng.trace.length - 1] ?? "",
    });
    nextRng = updatedRng;
    const current = orderedValues[lastIndex];
    const swap = orderedValues[swapIndex];
    if (current === undefined || swap === undefined) {
      throw new Error(
        `shuffleWithRng: invalid index (lastIndex=${lastIndex}, swapIndex=${swapIndex}, length=${orderedValues.length})`,
      );
    }
    orderedValues[lastIndex] = swap;
    orderedValues[swapIndex] = current;
  }
  return { orderedValues, nextRng, consumptions };
}

export function subsetWithRng<T>(
  values: readonly T[],
  count: number,
  rng: RuntimeRngState,
): {
  values: readonly T[];
  nextRng: RuntimeRngState;
  consumptions: RngConsumption[];
} {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("random.subset count must be a non-negative integer.");
  }
  if (count > values.length) {
    throw new Error(
      `random.subset count ${count} exceeds source length ${values.length}.`,
    );
  }
  const shuffled = shuffleWithRng(values, rng, "randomSubset");
  return {
    values: shuffled.orderedValues.slice(0, count),
    nextRng: shuffled.nextRng,
    consumptions: shuffled.consumptions,
  };
}

export function createMutableRandomHelpers(
  rng: RuntimeRngState,
): MutableRandomHelpers {
  let current = rng;
  return {
    random: {
      subset(options) {
        const sampled = subsetWithRng(options.from, options.count, current);
        current = sampled.nextRng;
        return sampled.values;
      },
    },
    currentRng: () => current,
  };
}

export function sampleRngCollectorValue(
  collector: InputCollector<SchemaLike<unknown>, CollectorState, "rng">,
  rng: RuntimeRngState,
): { value: unknown; nextRng: RuntimeRngState } {
  const meta = collector.meta;
  switch (meta.rng) {
    case "d6": {
      const count = meta.count > 0 ? meta.count : 1;
      const values: number[] = [];
      let nextRng = rng;
      for (let i = 0; i < count; i += 1) {
        const sampled = sampleDieValue(6, nextRng);
        values.push(sampled.value);
        nextRng = sampled.nextRng;
      }
      return { value: { values }, nextRng };
    }
    case "coin": {
      const [offset, nextRng] = nextRandomInt(2, rng);
      return {
        value: { value: offset === 0 ? "heads" : "tails" },
        nextRng,
      };
    }
    default: {
      const _exhaustive: never = meta;
      throw new Error(
        `Unknown rngInput kind '${String(_exhaustive)}'. Register a sampler in trusted rng-sampler.`,
      );
    }
  }
}
