import type {
  CollectorState,
  InputCollector,
  RuntimeRngState,
  SchemaLike,
} from "../../model";
import type { RandomHelpers } from "../../model/spec/runtime-args";
import { nextRandomInt } from "../../rng";

export type RngConsumption = {
  operation: string;
  drawIndex: number;
  traceEntry: string;
};

export type MutableRandomHelpers = {
  random: RandomHelpers;
  currentRng: () => RuntimeRngState;
  consumptions: () => readonly RngConsumption[];
};

const MAX_INTEGER_RANGE = 0x1_0000_0000;

function assertIntegerRange(options: {
  minInclusive: number;
  maxInclusive: number;
}): number {
  const { minInclusive, maxInclusive } = options;
  if (
    !Number.isSafeInteger(minInclusive) ||
    !Number.isSafeInteger(maxInclusive)
  ) {
    throw new Error("random.integer bounds must be safe integers.");
  }
  if (minInclusive > maxInclusive) {
    throw new Error(
      "random.integer minInclusive must be less than or equal to maxInclusive.",
    );
  }
  const range = maxInclusive - minInclusive + 1;
  if (!Number.isSafeInteger(range) || range > MAX_INTEGER_RANGE) {
    throw new Error(
      `random.integer range must contain at most ${MAX_INTEGER_RANGE} values.`,
    );
  }
  return range;
}

function traceEntry(nextRng: RuntimeRngState): string {
  return nextRng.trace[nextRng.trace.length - 1] ?? "";
}

export function sampleIntegerValue(
  options: { minInclusive: number; maxInclusive: number },
  rng: RuntimeRngState,
  operation = "random.integer",
): {
  value: number;
  nextRng: RuntimeRngState;
  consumption: RngConsumption;
} {
  const range = assertIntegerRange(options);
  const [offset, nextRng, draw] = nextRandomInt(range, rng, {
    kind: "integer",
    parameters: {
      minInclusive: options.minInclusive,
      maxInclusive: options.maxInclusive,
    },
  });
  return {
    value: options.minInclusive + offset,
    nextRng,
    consumption: {
      operation,
      drawIndex: draw.index,
      traceEntry: traceEntry(nextRng),
    },
  };
}

export function sampleDieValue(
  sides: number,
  rng: RuntimeRngState,
): {
  value: number;
  nextRng: RuntimeRngState;
  consumption: RngConsumption;
} {
  const [offset, nextRng, draw] = nextRandomInt(sides, rng, {
    kind: "integer",
    parameters: { minInclusive: 1, maxInclusive: sides },
  });
  return {
    value: offset + 1,
    nextRng,
    consumption: {
      operation: "rollDie",
      drawIndex: draw.index,
      traceEntry: traceEntry(nextRng),
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
    const [swapIndex, updatedRng, draw] = nextRandomInt(
      lastIndex + 1,
      nextRng,
      {
        kind: "integer",
        parameters: { minInclusive: 0, maxInclusive: lastIndex },
      },
    );
    consumptions.push({
      operation,
      drawIndex: draw.index,
      traceEntry: traceEntry(updatedRng),
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
  const recordedConsumptions: RngConsumption[] = [];
  return {
    random: {
      integer(options) {
        const sampled = sampleIntegerValue(options, current);
        current = sampled.nextRng;
        recordedConsumptions.push(sampled.consumption);
        return sampled.value;
      },
      subset(options) {
        const sampled = subsetWithRng(options.from, options.count, current);
        current = sampled.nextRng;
        recordedConsumptions.push(...sampled.consumptions);
        return sampled.values;
      },
    },
    currentRng: () => current,
    consumptions: () => [...recordedConsumptions],
  };
}

export function sampleRngCollectorValue(
  collector: InputCollector<SchemaLike<unknown>, CollectorState, "rng">,
  rng: RuntimeRngState,
): {
  value: unknown;
  nextRng: RuntimeRngState;
  consumptions: readonly RngConsumption[];
} {
  const meta = collector.meta;
  switch (meta.rng) {
    case "d6": {
      const count = meta.count > 0 ? meta.count : 1;
      const values: number[] = [];
      let nextRng = rng;
      const consumptions: RngConsumption[] = [];
      for (let i = 0; i < count; i += 1) {
        const sampled = sampleDieValue(6, nextRng);
        values.push(sampled.value);
        nextRng = sampled.nextRng;
        consumptions.push({
          operation: "rngInput.d6",
          drawIndex: sampled.consumption.drawIndex,
          traceEntry: sampled.consumption.traceEntry,
        });
      }
      return { value: { values }, nextRng, consumptions };
    }
    case "coin": {
      const [offset, nextRng, draw] = nextRandomInt(2, rng, {
        kind: "integer",
        parameters: { minInclusive: 0, maxInclusive: 1 },
      });
      return {
        value: { value: offset === 0 ? "heads" : "tails" },
        nextRng,
        consumptions: [
          {
            operation: "rngInput.coin",
            drawIndex: draw.index,
            traceEntry: traceEntry(nextRng),
          },
        ],
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
