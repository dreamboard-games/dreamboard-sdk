/**
 * Generated file.
 * Do not edit directly.
 */

export const literals = {
  playerIds: ["player-1", "player-2", "player-3", "player-4"] as const,
  phaseNames: [] as readonly string[],
  boardLayouts: ["generic", "hex", "square"] as const,
  setupOptionIds: [] as const,
  setupProfileIds: ["charter-verification", "standard", "terminal-regression"] as const,
  cardSetIds: ["charter-cards"] as const,
  cardTypes: ["claimMarker", "landmark", "scout", "shortcut", "surveyGrant"] as const,
  cardIds: ["claimMarker-1", "claimMarker-2", "landmark-1", "landmark-2", "landmark-3", "landmark-4", "landmark-5", "scout-1", "scout-10", "scout-11", "scout-12", "scout-13", "scout-14", "scout-2", "scout-3", "scout-4", "scout-5", "scout-6", "scout-7", "scout-8", "scout-9", "shortcut-1", "shortcut-2", "surveyGrant-1", "surveyGrant-2"] as const,
  deckIds: ["charter-deck", "charter-played"] as const,
  handIds: ["charter-hand"] as const,
  sharedZoneIds: ["charter-deck", "charter-played"] as const,
  playerZoneIds: ["charter-hand"] as const,
  zoneIds: ["charter-deck", "charter-hand", "charter-played"] as const,
  resourceIds: ["clay", "cloth", "grain", "iron", "timber"] as const,
  resourcePresentationById: {
  "clay": {
    "label": "Clay",
    "icon": "🧱"
  },
  "cloth": {
    "label": "Cloth",
    "icon": "🧵"
  },
  "grain": {
    "label": "Grain",
    "icon": "🌾"
  },
  "iron": {
    "label": "Iron",
    "icon": "⛏️"
  },
  "timber": {
    "label": "Timber",
    "icon": "🌲"
  }
} as const,
  pieceTypeIds: ["camp", "storm", "town", "trail"] as const,
  pieceIds: ["camp-p1-1", "camp-p1-2", "camp-p1-3", "camp-p1-4", "camp-p1-5", "camp-p2-1", "camp-p2-2", "camp-p2-3", "camp-p2-4", "camp-p2-5", "camp-p3-1", "camp-p3-2", "camp-p3-3", "camp-p3-4", "camp-p3-5", "camp-p4-1", "camp-p4-2", "camp-p4-3", "camp-p4-4", "camp-p4-5", "storm", "town-p1-1", "town-p1-2", "town-p1-3", "town-p1-4", "town-p2-1", "town-p2-2", "town-p2-3", "town-p2-4", "town-p3-1", "town-p3-2", "town-p3-3", "town-p3-4", "town-p4-1", "town-p4-2", "town-p4-3", "town-p4-4", "trail-p1-1", "trail-p1-10", "trail-p1-11", "trail-p1-12", "trail-p1-13", "trail-p1-14", "trail-p1-15", "trail-p1-2", "trail-p1-3", "trail-p1-4", "trail-p1-5", "trail-p1-6", "trail-p1-7", "trail-p1-8", "trail-p1-9", "trail-p2-1", "trail-p2-10", "trail-p2-11", "trail-p2-12", "trail-p2-13", "trail-p2-14", "trail-p2-15", "trail-p2-2", "trail-p2-3", "trail-p2-4", "trail-p2-5", "trail-p2-6", "trail-p2-7", "trail-p2-8", "trail-p2-9", "trail-p3-1", "trail-p3-10", "trail-p3-11", "trail-p3-12", "trail-p3-13", "trail-p3-14", "trail-p3-15", "trail-p3-2", "trail-p3-3", "trail-p3-4", "trail-p3-5", "trail-p3-6", "trail-p3-7", "trail-p3-8", "trail-p3-9", "trail-p4-1", "trail-p4-10", "trail-p4-11", "trail-p4-12", "trail-p4-13", "trail-p4-14", "trail-p4-15", "trail-p4-2", "trail-p4-3", "trail-p4-4", "trail-p4-5", "trail-p4-6", "trail-p4-7", "trail-p4-8", "trail-p4-9"] as const,
  dieTypeIds: ["d6"] as const,
  dieIds: ["die-1", "die-2"] as const,
  boardTemplateIds: ["star-frontier"] as const,
  boardTypeIds: [] as const,
  boardBaseIds: ["frontier"] as const,
  boardIds: ["frontier"] as const,
  boardContainerIds: [] as const,
  relationTypeIds: ["adjacent"] as const,
  edgeIds: ["hex-edge:-1,-1,2::-2,-2,4", "hex-edge:-1,-1,2::-2,1,1", "hex-edge:-1,-1,2::1,-2,1", "hex-edge:-1,-10,11::-2,-8,10", "hex-edge:-1,-10,11::1,-11,10", "hex-edge:-1,-4,5::-2,-2,4", "hex-edge:-1,-4,5::-2,-5,7", "hex-edge:-1,-4,5::1,-5,4", "hex-edge:-1,-7,8::-2,-5,7", "hex-edge:-1,-7,8::-2,-8,10", "hex-edge:-1,-7,8::1,-8,7", "hex-edge:-1,11,-10::-2,10,-8", "hex-edge:-1,11,-10::1,10,-11", "hex-edge:-1,2,-1::-2,1,1", "hex-edge:-1,2,-1::-2,4,-2", "hex-edge:-1,2,-1::1,1,-2", "hex-edge:-1,5,-4::-2,4,-2", "hex-edge:-1,5,-4::-2,7,-5", "hex-edge:-1,5,-4::1,4,-5", "hex-edge:-1,8,-7::-2,10,-8", "hex-edge:-1,8,-7::-2,7,-5", "hex-edge:-1,8,-7::1,7,-8", "hex-edge:-10,-1,11::-11,1,10", "hex-edge:-10,-1,11::-8,-2,10", "hex-edge:-10,11,-1::-11,10,1", "hex-edge:-10,11,-1::-8,10,-2", "hex-edge:-10,2,8::-11,1,10", "hex-edge:-10,2,8::-11,4,7", "hex-edge:-10,2,8::-8,1,7", "hex-edge:-10,5,5::-11,4,7", "hex-edge:-10,5,5::-11,7,4", "hex-edge:-10,5,5::-8,4,4", "hex-edge:-10,8,2::-11,10,1", "hex-edge:-10,8,2::-11,7,4", "hex-edge:-10,8,2::-8,7,1", "hex-edge:-2,-2,4::-4,-1,5", "hex-edge:-2,-5,7::-4,-4,8", "hex-edge:-2,-8,10::-4,-7,11", "hex-edge:-2,1,1::-4,2,2", "hex-edge:-2,10,-8::-4,11,-7", "hex-edge:-2,4,-2::-4,5,-1", "hex-edge:-2,7,-5::-4,8,-4", "hex-edge:-4,-1,5::-5,-2,7", "hex-edge:-4,-1,5::-5,1,4", "hex-edge:-4,-4,8::-5,-2,7", "hex-edge:-4,-4,8::-5,-5,10", "hex-edge:-4,-7,11::-5,-5,10", "hex-edge:-4,11,-7::-5,10,-5", "hex-edge:-4,2,2::-5,1,4", "hex-edge:-4,2,2::-5,4,1", "hex-edge:-4,5,-1::-5,4,1", "hex-edge:-4,5,-1::-5,7,-2", "hex-edge:-4,8,-4::-5,10,-5", "hex-edge:-4,8,-4::-5,7,-2", "hex-edge:-5,-2,7::-7,-1,8", "hex-edge:-5,-5,10::-7,-4,11", "hex-edge:-5,1,4::-7,2,5", "hex-edge:-5,10,-5::-7,11,-4", "hex-edge:-5,4,1::-7,5,2", "hex-edge:-5,7,-2::-7,8,-1", "hex-edge:-7,-1,8::-8,-2,10", "hex-edge:-7,-1,8::-8,1,7", "hex-edge:-7,-4,11::-8,-2,10", "hex-edge:-7,11,-4::-8,10,-2", "hex-edge:-7,2,5::-8,1,7", "hex-edge:-7,2,5::-8,4,4", "hex-edge:-7,5,2::-8,4,4", "hex-edge:-7,5,2::-8,7,1", "hex-edge:-7,8,-1::-8,10,-2", "hex-edge:-7,8,-1::-8,7,1", "hex-edge:1,-11,10::2,-10,8", "hex-edge:1,-2,1::2,-1,-1", "hex-edge:1,-2,1::2,-4,2", "hex-edge:1,-5,4::2,-4,2", "hex-edge:1,-5,4::2,-7,5", "hex-edge:1,-8,7::2,-10,8", "hex-edge:1,-8,7::2,-7,5", "hex-edge:1,1,-2::2,-1,-1", "hex-edge:1,1,-2::2,2,-4", "hex-edge:1,10,-11::2,8,-10", "hex-edge:1,4,-5::2,2,-4", "hex-edge:1,4,-5::2,5,-7", "hex-edge:1,7,-8::2,5,-7", "hex-edge:1,7,-8::2,8,-10", "hex-edge:10,-11,1::11,-10,-1", "hex-edge:10,-11,1::8,-10,2", "hex-edge:10,-2,-8::11,-1,-10", "hex-edge:10,-2,-8::11,-4,-7", "hex-edge:10,-2,-8::8,-1,-7", "hex-edge:10,-5,-5::11,-4,-7", "hex-edge:10,-5,-5::11,-7,-4", "hex-edge:10,-5,-5::8,-4,-4", "hex-edge:10,-8,-2::11,-10,-1", "hex-edge:10,-8,-2::11,-7,-4", "hex-edge:10,-8,-2::8,-7,-1", "hex-edge:10,1,-11::11,-1,-10", "hex-edge:10,1,-11::8,2,-10", "hex-edge:2,-1,-1::4,-2,-2", "hex-edge:2,-10,8::4,-11,7", "hex-edge:2,-4,2::4,-5,1", "hex-edge:2,-7,5::4,-8,4", "hex-edge:2,2,-4::4,1,-5", "hex-edge:2,5,-7::4,4,-8", "hex-edge:2,8,-10::4,7,-11", "hex-edge:4,-11,7::5,-10,5", "hex-edge:4,-2,-2::5,-1,-4", "hex-edge:4,-2,-2::5,-4,-1", "hex-edge:4,-5,1::5,-4,-1", "hex-edge:4,-5,1::5,-7,2", "hex-edge:4,-8,4::5,-10,5", "hex-edge:4,-8,4::5,-7,2", "hex-edge:4,1,-5::5,-1,-4", "hex-edge:4,1,-5::5,2,-7", "hex-edge:4,4,-8::5,2,-7", "hex-edge:4,4,-8::5,5,-10", "hex-edge:4,7,-11::5,5,-10", "hex-edge:5,-1,-4::7,-2,-5", "hex-edge:5,-10,5::7,-11,4", "hex-edge:5,-4,-1::7,-5,-2", "hex-edge:5,-7,2::7,-8,1", "hex-edge:5,2,-7::7,1,-8", "hex-edge:5,5,-10::7,4,-11", "hex-edge:7,-11,4::8,-10,2", "hex-edge:7,-2,-5::8,-1,-7", "hex-edge:7,-2,-5::8,-4,-4", "hex-edge:7,-5,-2::8,-4,-4", "hex-edge:7,-5,-2::8,-7,-1", "hex-edge:7,-8,1::8,-10,2", "hex-edge:7,-8,1::8,-7,-1", "hex-edge:7,1,-8::8,-1,-7", "hex-edge:7,1,-8::8,2,-10", "hex-edge:7,4,-11::8,2,-10"] as const,
  edgeTypeIds: ["relay"] as const,
  vertexIds: ["hex-vertex:-1,-1,2", "hex-vertex:-1,-10,11", "hex-vertex:-1,-4,5", "hex-vertex:-1,-7,8", "hex-vertex:-1,11,-10", "hex-vertex:-1,2,-1", "hex-vertex:-1,5,-4", "hex-vertex:-1,8,-7", "hex-vertex:-10,-1,11", "hex-vertex:-10,11,-1", "hex-vertex:-10,2,8", "hex-vertex:-10,5,5", "hex-vertex:-10,8,2", "hex-vertex:-11,1,10", "hex-vertex:-11,10,1", "hex-vertex:-11,4,7", "hex-vertex:-11,7,4", "hex-vertex:-2,-2,4", "hex-vertex:-2,-5,7", "hex-vertex:-2,-8,10", "hex-vertex:-2,1,1", "hex-vertex:-2,10,-8", "hex-vertex:-2,4,-2", "hex-vertex:-2,7,-5", "hex-vertex:-4,-1,5", "hex-vertex:-4,-4,8", "hex-vertex:-4,-7,11", "hex-vertex:-4,11,-7", "hex-vertex:-4,2,2", "hex-vertex:-4,5,-1", "hex-vertex:-4,8,-4", "hex-vertex:-5,-2,7", "hex-vertex:-5,-5,10", "hex-vertex:-5,1,4", "hex-vertex:-5,10,-5", "hex-vertex:-5,4,1", "hex-vertex:-5,7,-2", "hex-vertex:-7,-1,8", "hex-vertex:-7,-4,11", "hex-vertex:-7,11,-4", "hex-vertex:-7,2,5", "hex-vertex:-7,5,2", "hex-vertex:-7,8,-1", "hex-vertex:-8,-2,10", "hex-vertex:-8,1,7", "hex-vertex:-8,10,-2", "hex-vertex:-8,4,4", "hex-vertex:-8,7,1", "hex-vertex:1,-11,10", "hex-vertex:1,-2,1", "hex-vertex:1,-5,4", "hex-vertex:1,-8,7", "hex-vertex:1,1,-2", "hex-vertex:1,10,-11", "hex-vertex:1,4,-5", "hex-vertex:1,7,-8", "hex-vertex:10,-11,1", "hex-vertex:10,-2,-8", "hex-vertex:10,-5,-5", "hex-vertex:10,-8,-2", "hex-vertex:10,1,-11", "hex-vertex:11,-1,-10", "hex-vertex:11,-10,-1", "hex-vertex:11,-4,-7", "hex-vertex:11,-7,-4", "hex-vertex:2,-1,-1", "hex-vertex:2,-10,8", "hex-vertex:2,-4,2", "hex-vertex:2,-7,5", "hex-vertex:2,2,-4", "hex-vertex:2,5,-7", "hex-vertex:2,8,-10", "hex-vertex:4,-11,7", "hex-vertex:4,-2,-2", "hex-vertex:4,-5,1", "hex-vertex:4,-8,4", "hex-vertex:4,1,-5", "hex-vertex:4,4,-8", "hex-vertex:4,7,-11", "hex-vertex:5,-1,-4", "hex-vertex:5,-10,5", "hex-vertex:5,-4,-1", "hex-vertex:5,-7,2", "hex-vertex:5,2,-7", "hex-vertex:5,5,-10", "hex-vertex:7,-11,4", "hex-vertex:7,-2,-5", "hex-vertex:7,-5,-2", "hex-vertex:7,-8,1", "hex-vertex:7,1,-8", "hex-vertex:7,4,-11", "hex-vertex:8,-1,-7", "hex-vertex:8,-10,2", "hex-vertex:8,-4,-4", "hex-vertex:8,-7,-1", "hex-vertex:8,2,-10"] as const,
  vertexTypeIds: [] as const,
  spaceIds: ["h-0-0", "h-1-0", "h-1-1", "h-1-2", "h-1-3", "h-1-4", "h-1-5", "h-2-0", "h-2-1", "h-2-10", "h-2-11", "h-2-2", "h-2-3", "h-2-4", "h-2-5", "h-2-6", "h-2-7", "h-2-8", "h-2-9", "o-0", "o-1", "o-10", "o-11", "o-12", "o-13", "o-14", "o-15", "o-16", "o-17", "o-2", "o-3", "o-4", "o-5", "o-6", "o-7", "o-8", "o-9"] as const,
  spaceTypeIds: ["borderland", "land"] as const,
  handVisibilityById: {
  "charter-hand": "ownerOnly",
} as const,
  zoneVisibilityById: {
  "charter-deck": "hidden",
  "charter-hand": "ownerOnly",
  "charter-played": "public",
} as const,
  cardSetIdByCardId: {
  "claimMarker-1": "charter-cards",
  "claimMarker-2": "charter-cards",
  "landmark-1": "charter-cards",
  "landmark-2": "charter-cards",
  "landmark-3": "charter-cards",
  "landmark-4": "charter-cards",
  "landmark-5": "charter-cards",
  "scout-1": "charter-cards",
  "scout-10": "charter-cards",
  "scout-11": "charter-cards",
  "scout-12": "charter-cards",
  "scout-13": "charter-cards",
  "scout-14": "charter-cards",
  "scout-2": "charter-cards",
  "scout-3": "charter-cards",
  "scout-4": "charter-cards",
  "scout-5": "charter-cards",
  "scout-6": "charter-cards",
  "scout-7": "charter-cards",
  "scout-8": "charter-cards",
  "scout-9": "charter-cards",
  "shortcut-1": "charter-cards",
  "shortcut-2": "charter-cards",
  "surveyGrant-1": "charter-cards",
  "surveyGrant-2": "charter-cards",
} as const,
  cardTypeByCardId: {
  "claimMarker-1": "claimMarker",
  "claimMarker-2": "claimMarker",
  "landmark-1": "landmark",
  "landmark-2": "landmark",
  "landmark-3": "landmark",
  "landmark-4": "landmark",
  "landmark-5": "landmark",
  "scout-1": "scout",
  "scout-10": "scout",
  "scout-11": "scout",
  "scout-12": "scout",
  "scout-13": "scout",
  "scout-14": "scout",
  "scout-2": "scout",
  "scout-3": "scout",
  "scout-4": "scout",
  "scout-5": "scout",
  "scout-6": "scout",
  "scout-7": "scout",
  "scout-8": "scout",
  "scout-9": "scout",
  "shortcut-1": "shortcut",
  "shortcut-2": "shortcut",
  "surveyGrant-1": "surveyGrant",
  "surveyGrant-2": "surveyGrant",
} as const,
  setupChoiceIdsByOptionId: {

} as const,
  cardSetIdsBySharedZoneId: {
  "charter-deck": ["charter-cards"] as const,
  "charter-played": ["charter-cards"] as const,
} as const,
  sharedZoneIdsByCardSetId: {
  "charter-cards": ["charter-deck", "charter-played"] as const,
} as const,
  homeSharedZoneIdsByCardType: {
  "claimMarker": [] as const,
  "landmark": [] as const,
  "scout": [] as const,
  "shortcut": [] as const,
  "surveyGrant": [] as const,
} as const,
  homeSharedZoneIdByCardType: {

} as const,
  cardSetIdsByPlayerZoneId: {
  "charter-hand": ["charter-cards"] as const,
} as const,
} as const;
