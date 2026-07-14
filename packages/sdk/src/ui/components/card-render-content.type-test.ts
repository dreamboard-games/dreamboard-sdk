import type { ViewCard } from "../index.js";
import type { CardFaceProps } from "./Card.js";

type ExpectExtends<Actual extends Expected, Expected> = Actual extends Expected
  ? true
  : never;

type TypedCard = ViewCard<
  "tech-card-1",
  "breakthrough",
  {
    cost: number;
    label: string;
  }
>;

type RenderContentCard = Parameters<
  NonNullable<CardFaceProps<TypedCard>["renderContent"]>
>[0];

export type CardIdIsPreserved = ExpectExtends<
  RenderContentCard["id"],
  "tech-card-1"
>;
export type CardTypeIsPreserved = ExpectExtends<
  RenderContentCard["cardType"],
  "breakthrough"
>;
export type PropertiesArePreserved = ExpectExtends<
  RenderContentCard["properties"]["cost"],
  number
>;
