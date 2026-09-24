import { useMemo } from "react";
import type { CardCollection, ViewCard } from "../../shared/domain/cards.js";
import { materializeCards } from "../helpers/cards.js";

export function useCards<
  CardIdValue extends string,
  CardValue extends ViewCard<CardIdValue>,
>(collection: CardCollection<CardIdValue, CardValue>) {
  return useMemo(() => materializeCards(collection), [collection]);
}
