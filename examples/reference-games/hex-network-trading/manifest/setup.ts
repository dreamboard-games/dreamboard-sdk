export const dieTypes = [
  { id: "d6", name: "Six-sided die", sides: 6 },
] as const;

export const dieSeeds = [
  { id: "stormtrail-die-1", typeId: "d6" },
  { id: "stormtrail-die-2", typeId: "d6" },
] as const;

export const resources = [
  { id: "timber", name: "Timber", icon: "🌲" },
  { id: "brick", name: "Brick", icon: "🧱" },
  { id: "provisions", name: "Provisions", icon: "🌾" },
] as const;

export const setupOptions = [] as const;
export const setupProfiles = [] as const;
