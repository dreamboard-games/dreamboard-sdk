/**
 * Error thrown when action validation fails.
 * Contains the error code and optional message from the validation result.
 */
export class ValidationError extends Error {
  constructor(
    public readonly errorCode?: string,
    message?: string,
  ) {
    super(message || errorCode || "Validation failed");
    this.name = "ValidationError";
  }
}

export function validationErrorFromUnknown(
  error: unknown,
  fallbackMessage = "Interaction submission failed",
): ValidationError {
  if (error instanceof ValidationError) return error;
  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "errorCode" in error &&
    typeof error.errorCode === "string"
      ? error.errorCode
      : undefined;
  const message = error instanceof Error ? error.message : fallbackMessage;
  return new ValidationError(errorCode, message);
}
