export const FrameworkErrorCodes = {
  NOT_YOUR_TURN: "NOT_YOUR_TURN",
  WRONG_PHASE: "WRONG_PHASE",
  WRONG_STEP: "WRONG_STEP",
  NO_LEGAL_INPUT: "NO_LEGAL_INPUT",
  INVALID_PARAMS: "INVALID_PARAMS",
  UNKNOWN_INTERACTION: "UNKNOWN_INTERACTION",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type FrameworkErrorCode =
  (typeof FrameworkErrorCodes)[keyof typeof FrameworkErrorCodes];
