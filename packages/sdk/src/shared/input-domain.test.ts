import { expect, test } from "vitest";
import { inputDomainErrors, inputValueInDomain } from "./input-domain.js";

test("many choices share membership, count and distinctness with reducer validation", () => {
  const domain = {
    type: "choice" as const,
    choices: [
      { value: "a", label: "A" },
      { value: "b", label: "B", disabled: true },
      { value: null, label: "None" },
    ],
    selection: { mode: "many" as const, min: 2, max: 2, distinct: true },
  };
  expect(inputDomainErrors(domain, ["a", null], domain.selection)).toEqual([]);
  expect(inputValueInDomain(domain, ["a", null], domain.selection)).toBe(true);
  expect(inputDomainErrors(domain, ["a"], domain.selection)).toContain(
    "Choose at least 2 values.",
  );
  expect(inputDomainErrors(domain, ["a", "a"], domain.selection)).toContain(
    "Choose each value only once.",
  );
  expect(inputDomainErrors(domain, ["a", "b"], domain.selection)).toContain(
    "Selected choice is not eligible.",
  );
  expect(
    inputDomainErrors(domain, ["a", null, "a"], domain.selection),
  ).toContain("Choose at most 2 values.");
  expect(
    inputValueInDomain(domain, ["a"], domain.selection, {
      ignoreMinimum: true,
    }),
  ).toBe(true);
});

test("choiceList validates arrays while its buttons select individual eligible choices", () => {
  const domain = {
    type: "choiceList" as const,
    choices: [
      { value: "a", label: "A" },
      { value: "b", label: "B", disabled: true },
    ],
    min: 1,
    max: 2,
  };
  expect(inputDomainErrors(domain, ["a"])).toEqual([]);
  expect(inputDomainErrors(domain, ["b"])).toEqual([
    "Selected choice is not eligible.",
  ]);
  expect(inputDomainErrors(domain, [])).toEqual(["Choose at least 1 option."]);
  expect(inputDomainErrors(domain, "a")).toEqual([
    "Expected a list of choices.",
  ]);
});
