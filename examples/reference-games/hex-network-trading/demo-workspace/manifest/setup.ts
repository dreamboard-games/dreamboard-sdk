export const dieTypes = [
  {
    id: "d6",
    name: "Six-sided die",
    sides: 6,
  },
] as const;

export const dieSeeds = [
  { id: "die-1", typeId: "d6" },
  { id: "die-2", typeId: "d6" },
] as const;

export const resources = [
  { id: "timber", name: "Timber", icon: "🌲" },
  { id: "clay", name: "Clay", icon: "🧱" },
  { id: "grain", name: "Grain", icon: "🌾" },
  { id: "cloth", name: "Cloth", icon: "🧵" },
  { id: "iron", name: "Iron", icon: "⛏️" },
] as const;

export const setupOptions = [] as const;

export const setupProfiles = [
  {
    id: "standard",
    name: "Standard",
    description: "Standard Frontier Trails setup",
  },
  {
    id: "terminal-regression",
    name: "Terminal regression",
    description:
      "Reducer-test profile that starts with a latched winner pending the next end-turn boundary.",
  },
  {
    id: "charter-verification",
    name: "Charter verification",
    description:
      "Reducer-test profile that deals charter cards to the first player for browser interaction verification.",
  },
] as const;
