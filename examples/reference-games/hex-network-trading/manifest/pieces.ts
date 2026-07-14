const PLAYER_NUMBERS = [1, 2, 3] as const;
const detached = { type: "detached" } as const;

function ownerId(playerNumber: (typeof PLAYER_NUMBERS)[number]) {
  return `player-${playerNumber}` as const;
}

export const pieceTypes = [
  { id: "trail", name: "Trail" },
  { id: "camp", name: "Camp" },
  { id: "bandits", name: "Bandits" },
] as const;

export const pieceSeeds = [
  { id: "bandits", typeId: "bandits", home: detached },
  ...PLAYER_NUMBERS.flatMap((playerNumber) =>
    Array.from({ length: 10 }, (_, index) => ({
      id: `trail-p${playerNumber}-${index + 1}`,
      typeId: "trail" as const,
      ownerId: ownerId(playerNumber),
      home: detached,
    })),
  ),
  ...PLAYER_NUMBERS.flatMap((playerNumber) =>
    Array.from({ length: 4 }, (_, index) => ({
      id: `camp-p${playerNumber}-${index + 1}`,
      typeId: "camp" as const,
      ownerId: ownerId(playerNumber),
      home: detached,
    })),
  ),
] as const;
