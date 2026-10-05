export const pieceTypes = [
  { id: "trail", name: "Trail" },
  { id: "camp", name: "Camp" },
  { id: "bandits", name: "Bandits" },
] as const;

const supply = { type: "zone", zoneId: "supply" } as const;

export const pieceSeeds = [
  { id: "bandits", typeId: "bandits", home: { type: "detached" } },
  { id: "trail", typeId: "trail", count: 10, scope: "perPlayer", home: supply },
  { id: "camp", typeId: "camp", count: 4, scope: "perPlayer", home: supply },
] as const;
