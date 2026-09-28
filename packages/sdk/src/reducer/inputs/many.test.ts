import { describe, expect, test } from "vitest";
import { formInput } from "./formInput";
import { many } from "./many";
import { rngInput } from "./rngInput";

describe("many defaults", () => {
  test.each(["a", () => "a", () => undefined] as const)(
    "removes inner defaults when lifting a scalar schema (%s)",
    (defaultValue) => {
      const choices = [{ value: "a", label: "A" }];
      const inner =
        typeof defaultValue === "function"
          ? formInput.choice({ choices, defaultValue })
          : formInput.choice({ choices, defaultValue });
      const input = many(inner, { min: 1, max: 2 });
      expect(input).not.toHaveProperty("defaultValue");
      expect(input).not.toHaveProperty("resolveDefaultValue");
      expect(input.schema.safeParse(["a"]).success).toBe(true);
      expect(input.schema.safeParse("a").success).toBe(false);
    },
  );
});

describe("many authoring validation", () => {
  test.each([rngInput.d6(), rngInput.coin()])(
    "rejects engine-sampled collectors from untyped callers (%j)",
    (collector) => {
      expect(() => {
        Reflect.apply(many, undefined, [collector, { count: 2 }]);
      }).toThrow("many(...) cannot wrap rngInput collectors.");
    },
  );
});
