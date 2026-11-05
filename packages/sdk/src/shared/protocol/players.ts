/** Stable seat colors shared by hosted and local gameplay. */
export const PLAYER_SEAT_COLORS = [
  "#2563EB",
  "#DC2626",
  "#059669",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#65A30D",
  "#EA580C",
] as const;

export function playerSeatColor(seatIndex: number): string {
  return PLAYER_SEAT_COLORS[seatIndex % PLAYER_SEAT_COLORS.length];
}
