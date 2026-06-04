export type HexColor = string & { readonly __brand: "HexColor" };

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: unknown): value is HexColor {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

export function parseHexColor(value: unknown): HexColor | undefined {
  return isHexColor(value) ? value : undefined;
}

export function hexColor(value: string): HexColor {
  if (!isHexColor(value)) {
    throw new Error(
      `Expected a 6-digit hex color such as #E53935, received '${value}'.`,
    );
  }
  return value;
}
