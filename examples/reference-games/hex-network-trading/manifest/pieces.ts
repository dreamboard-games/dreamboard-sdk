const PLAYER_NUMBERS = [1, 2, 3, 4] as const;

type PlayerNumber = (typeof PLAYER_NUMBERS)[number];
type SettlementPiece = "camp" | "town";

const ownerId = (playerNumber: PlayerNumber) =>
  `player-${playerNumber}` as const;

const detachedHome = { type: "detached" } as const;

function playerTrails(playerNumber: PlayerNumber) {
  return Array.from(
    { length: 15 },
    (_, index) =>
      ({
        id: `trail-p${playerNumber}-${index + 1}`,
        typeId: "trail",
        ownerId: ownerId(playerNumber),
        home: detachedHome,
      }) as const,
  );
}

function playerSettlements(
  playerNumber: PlayerNumber,
  typeId: SettlementPiece,
  count: number,
) {
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        id: `${typeId}-p${playerNumber}-${index + 1}`,
        typeId,
        ownerId: ownerId(playerNumber),
        home: detachedHome,
      }) as const,
  );
}

export const pieceTypes = [
  {
    id: "trail",
    name: "Trail",
  },
  {
    id: "camp",
    name: "Camp",
  },
  {
    id: "town",
    name: "Town",
  },
  {
    id: "storm",
    name: "Storm",
  },
] as const;

export const pieceSeeds = [
  {
    id: "storm",
    typeId: "storm",
    home: detachedHome,
  },
  ...PLAYER_NUMBERS.flatMap((playerNumber) => playerTrails(playerNumber)),
  ...PLAYER_NUMBERS.flatMap((playerNumber) =>
    playerSettlements(playerNumber, "camp", 5),
  ),
  ...PLAYER_NUMBERS.flatMap((playerNumber) =>
    playerSettlements(playerNumber, "town", 4),
  ),
] as const;
