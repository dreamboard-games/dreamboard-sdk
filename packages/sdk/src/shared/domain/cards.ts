export interface ViewCard<
  CardIdValue extends string = string,
  CardTypeValue extends string = string,
  Properties extends Record<string, unknown> = Record<string, unknown>,
> {
  id: CardIdValue;
  cardType: CardTypeValue;
  name?: string;
  text?: string;
  /** Manifest asset path; game UIs receive a loadable URL. */
  frontImage?: string;
  /** Manifest asset path; game UIs receive a loadable URL. */
  backImage?: string;
  properties: Properties;
}

export interface CardCollection<
  CardIdValue extends string = string,
  Card extends ViewCard<CardIdValue> = ViewCard<CardIdValue>,
> {
  cardIds: readonly CardIdValue[];
  cardsById: Readonly<Record<CardIdValue, Card | undefined>>;
}
