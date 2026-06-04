import { z } from "zod";

export function formatIssue(
  label: string,
  issue: { path: PropertyKey[]; message: string },
): string {
  const path = issue.path
    .map((segment) =>
      typeof segment === "symbol" ? segment.toString() : String(segment),
    )
    .join(".");
  return `${path || label}: ${issue.message}`;
}

export function safeParseOrThrow<Schema extends z.ZodTypeAny>(
  schema: Schema,
  value: unknown,
  label: string,
): z.output<Schema> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => formatIssue(label, issue))
      .join("; ");
    throw new Error(message || `Invalid ${label}`);
  }
  return parsed.data;
}
