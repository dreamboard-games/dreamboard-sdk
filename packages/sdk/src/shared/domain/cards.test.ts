import { describe, expect, it } from "vitest";
import { ViewCardSchema, type ViewCard } from "./cards.js";

const card = {
  id: "strike-1",
  cardType: "attack",
  name: "Strike",
  text: "Deal damage",
  frontImage: "cards/strike.png",
  backImage: "cards/back.png",
  properties: { damage: 2, details: { tags: ["attack", null] } },
} satisfies ViewCard;

describe("ViewCardSchema", () => {
  it("preserves a complete visible card and JSON properties", () => {
    expect(ViewCardSchema.parse(card)).toEqual(card);
    expect(
      ViewCardSchema.parse({
        id: "block",
        cardType: "defense",
        properties: {},
      }),
    ).toEqual({ id: "block", cardType: "defense", properties: {} });
  });

  it.each([
    { name: "Strike", frontImage: "cards/strike.png" },
    { id: "strike-1", properties: {} },
    { id: "strike-1", cardType: "attack" },
    { ...card, cardSetId: "actions" },
    { ...card, componentType: "card" },
    { ...card, properties: { nested: { invalid: undefined } } },
    { ...card, properties: { invalid: NaN } },
  ])(
    "rejects incomplete, table-only, or non-JSON display data: %j",
    (value) => {
      expect(ViewCardSchema.safeParse(value).success).toBe(false);
    },
  );
});
