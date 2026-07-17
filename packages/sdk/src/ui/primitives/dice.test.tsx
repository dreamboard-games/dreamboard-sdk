import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { Dice } from "./dice.js";

test("Dice primitives expose normalized readonly values and sum", () => {
  const html = renderToString(
    <Dice.Root values={[3, 4] as const} count={2}>
      <Dice.Values>
        {({ values, sum, diceCount, allRolled }) => (
          <span
            data-values={values?.join(",")}
            data-sum={sum}
            data-count={diceCount}
            data-all-rolled={allRolled}
          />
        )}
      </Dice.Values>
    </Dice.Root>,
  );

  expect(html).toContain('data-values="3,4"');
  expect(html).toContain('data-sum="7"');
  expect(html).toContain('data-count="2"');
  expect(html).toContain('data-all-rolled="true"');
});

test("Dice primitives preserve unrolled state without a local adapter", () => {
  const html = renderToString(
    <Dice.Root values={null} count={2}>
      <Dice.Values>
        {({ values, sum, diceCount, allRolled }) => (
          <span
            data-values={values?.join(",") ?? "none"}
            data-sum={sum ?? "none"}
            data-count={diceCount}
            data-all-rolled={allRolled}
          />
        )}
      </Dice.Values>
    </Dice.Root>,
  );

  expect(html).toContain('data-values="none"');
  expect(html).toContain('data-sum="none"');
  expect(html).toContain('data-count="2"');
  expect(html).toContain('data-all-rolled="false"');
});
