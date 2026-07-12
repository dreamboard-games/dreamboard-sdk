import assert from "node:assert/strict";
import test from "node:test";
import type { CargoCard, RivalInstruction } from "../../app/rules/cards.ts";
import { chooseRivalCargoIndex } from "../../app/rules/cards.ts";

function cargo(
  id: string,
  cargoKind: "timber" | "grain" | "ore",
  value: number,
): CargoCard {
  return {
    id,
    cardType: `${cargoKind}-${value}`,
    name: id,
    cargoKind,
    value,
  } as CargoCard;
}

function instruction(
  instructionKind: "claimHighest" | "claimKind" | "sweepLeft",
  cargoKind?: "timber" | "grain" | "ore",
): RivalInstruction {
  return {
    id: "claim-highest-1",
    cardType: "claim-highest",
    name: instructionKind,
    instructionKind,
    ...(cargoKind ? { cargoKind } : {}),
  } as RivalInstruction;
}

test("claimHighest takes the unique maximum and breaks maximum ties leftmost", () => {
  assert.equal(
    chooseRivalCargoIndex(
      [cargo("a", "timber", 1), cargo("b", "ore", 3), cargo("c", "grain", 2)],
      instruction("claimHighest"),
    ),
    1,
  );
  assert.equal(
    chooseRivalCargoIndex(
      [cargo("a", "timber", 2), cargo("b", "ore", 3), cargo("c", "grain", 3)],
      instruction("claimHighest"),
    ),
    1,
  );
});

test("claimKind takes the highest matching cargo, breaks ties leftmost, and falls back leftmost", () => {
  assert.equal(
    chooseRivalCargoIndex(
      [cargo("a", "ore", 3), cargo("b", "grain", 1), cargo("c", "grain", 2)],
      instruction("claimKind", "grain"),
    ),
    2,
  );
  assert.equal(
    chooseRivalCargoIndex(
      [cargo("a", "grain", 2), cargo("b", "ore", 3), cargo("c", "grain", 2)],
      instruction("claimKind", "grain"),
    ),
    0,
  );
  assert.equal(
    chooseRivalCargoIndex(
      [cargo("a", "ore", 3), cargo("b", "timber", 1)],
      instruction("claimKind", "grain"),
    ),
    0,
  );
});

test("sweepLeft always discards the leftmost river cargo", () => {
  assert.equal(
    chooseRivalCargoIndex(
      [cargo("a", "timber", 1), cargo("b", "ore", 3)],
      instruction("sweepLeft"),
    ),
    0,
  );
});
