export type ViewName = string;
export type GameView = Record<string, unknown>;
export type InferView<Name extends ViewName> = Name extends ViewName
  ? GameView
  : never;

export type PhaseName = string;
