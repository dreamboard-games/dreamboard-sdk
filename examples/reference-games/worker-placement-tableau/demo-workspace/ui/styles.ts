export const PAGE_BG = "bg-[#f5f0e8] text-[#2d2d2d]";

export const PANEL_CLASS =
  "rounded-lg border-2 border-[#2d2d2d] bg-white p-3 shadow-[3px_3px_0_#2d2d2d]";

export const SECTION_HEADING_CLASS =
  "font-display text-sm font-bold uppercase tracking-[0.12em] text-slate-700";

export const STAMP_CLASS =
  "rounded-md border-2 border-[#2d2d2d] bg-[#fdfbf7] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em]";

export const ACTION_BUTTON_CLASS =
  "rounded-md border-2 border-[#2d2d2d] bg-[#2d2d2d] px-3 py-2 text-sm font-bold text-white shadow-[2px_2px_0_#f2b84b] disabled:cursor-not-allowed disabled:opacity-50";

export const ACTION_SPACE_LABEL: Record<string, string> = {
  lumberyard: "Lumberyard",
  quarry: "Quarry",
  market: "Market",
  "guild-hall": "Guild hall",
  "training-hall": "Training hall",
  workshop: "Workshop",
  library: "Library",
  "trade-post": "Trade post",
  "town-square": "Town square",
};

export const ACTION_SPACE_HINT: Record<string, string> = {
  lumberyard: "Gather wood.",
  quarry: "Gather stone.",
  market: "Choose resources.",
  "guild-hall": "Score guild favors.",
  "training-hall": "Ready apprentices.",
  workshop: "Craft items.",
  library: "Draw and discard orders.",
  "trade-post": "Exchange resources.",
  "town-square": "Flexible civic action.",
};

export const ITEM_LABEL: Record<string, string> = {
  chair: "Chair",
  table: "Table",
  toy: "Toy",
  statue: "Statue",
  cabinet: "Cabinet",
  instrument: "Instrument",
};

export const RESOURCE_ICON: Record<string, string> = {
  wood: "Wood",
  stone: "Stone",
  coin: "Coin",
};
