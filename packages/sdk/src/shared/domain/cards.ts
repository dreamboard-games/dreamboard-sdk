import * as z from "zod";
import { RuntimeJsonSchema } from "../runtime-json.js";

/**
 * A card hidden from the seat, in a hidden zone or face down, is known only by
 * its position in its zone, never by which card it is.
 */
export type HiddenCardId = `hidden:${string}`;

/** The complete display data a seat may receive for a visible card. */
export const ViewCardSchema = z.strictObject({
  id: z.string(),
  cardType: z.string(),
  name: z.string().optional(),
  text: z.string().optional(),
  /** Manifest asset path; game UIs receive a loadable URL. */
  frontImage: z.string().optional(),
  /** Manifest asset path; game UIs receive a loadable URL. */
  backImage: z.string().optional(),
  properties: z.record(z.string(), RuntimeJsonSchema),
});

type ViewCardData = z.infer<typeof ViewCardSchema>;
export type ViewCard<
  CardIdValue extends string = string,
  CardTypeValue extends string = string,
  Properties extends Record<string, unknown> = ViewCardData["properties"],
> = Omit<ViewCardData, "id" | "cardType" | "properties"> & {
  id: CardIdValue;
  cardType: CardTypeValue;
  properties: Properties;
};

/** Project table card identity and property inference onto the seat's display data. */
export type ViewCardOfTable<
  Table extends {
    cards: Record<
      string,
      { cardType: string; properties: Record<string, unknown> }
    >;
  },
  CardId extends keyof Table["cards"] & string,
> = CardId extends keyof Table["cards"]
  ? ViewCard<
      CardId,
      Table["cards"][CardId]["cardType"],
      Table["cards"][CardId]["properties"]
    >
  : never;

export interface CardCollection<
  CardIdValue extends string = string,
  Card extends ViewCard<CardIdValue, string, Record<string, unknown>> =
    ViewCard<CardIdValue>,
> {
  cardIds: readonly CardIdValue[];
  cardsById: Readonly<Record<CardIdValue, Card | undefined>>;
}
