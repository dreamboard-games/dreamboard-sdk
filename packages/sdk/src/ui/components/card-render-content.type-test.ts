import type { ViewCard } from "../index.js";
import type { CardFaceProps } from "./Card.js";

type ExpectExtends<Actual extends Expected, Expected> = true;

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

type _CardIdIsPreserved = ExpectExtends<RenderContentCard["id"], "tech-card-1">;
type _CardTypeIsPreserved = ExpectExtends<
  RenderContentCard["cardType"],
  "breakthrough"
>;
type _PropertiesArePreserved = ExpectExtends<
  RenderContentCard["properties"]["cost"],
  number
>;
