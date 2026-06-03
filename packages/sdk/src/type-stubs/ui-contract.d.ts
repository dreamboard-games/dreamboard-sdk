export type ViewName = string;
export type GameView = Record<string, unknown>;
export type InferView<_Name extends ViewName> = GameView;

export type PhaseName = string;
