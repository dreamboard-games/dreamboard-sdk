import type { CardId, PlayerId } from "../../shared/manifest-contract";
import type { GameState } from "../game-contract";
import { createStateQueries } from "../reducer-support";

type Q = ReturnType<typeof createStateQueries<GameState>>;

const DUMPLING_TABLE = [0, 1, 3, 6, 10, 15] as const;

function nigiriPoints(card: {
  properties: { category?: string; nigiriPoints?: number };
}): number {
  if (card.properties.category !== "nigiri") return 0;
  return card.properties.nigiriPoints ?? 0;
}

function makiIcons(card: {
  properties: { makiIcons?: number; category?: string };
}): number {
  if (card.properties.category !== "maki") return 0;
  return card.properties.makiIcons ?? 0;
}

function scorePlayedCards(q: Q, playerId: PlayerId): number {
  const cards = q.zone.playerCards(playerId, "played");
  let total = 0;
  let wasabiMultiplier = 1;
  let tempura = 0;
  let sashimi = 0;
  let dumplings = 0;

  for (const cardId of cards) {
    const card = q.card.get(cardId);
    const category = card.properties.category;

    switch (category) {
      case "nigiri": {
        total += nigiriPoints(card) * wasabiMultiplier;
        wasabiMultiplier = 1;
        break;
      }
      case "wasabi": {
        wasabiMultiplier = 3;
        break;
      }
      case "tempura": {
        tempura += 1;
        break;
      }
      case "sashimi": {
        sashimi += 1;
        break;
      }
      case "dumpling": {
        dumplings += 1;
        break;
      }
      default:
        break;
    }
  }

  total += Math.floor(tempura / 2) * 5;
  total += Math.floor(sashimi / 3) * 10;
  total += DUMPLING_TABLE[Math.min(dumplings, 5)];

  return total;
}

function splitAmong(
  playerIds: readonly PlayerId[],
  tied: readonly PlayerId[],
  points: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (tied.length === 0) return out;
  const each = points / tied.length;
  for (const pid of playerIds) {
    out[pid] = tied.includes(pid) ? each : 0;
  }
  return out;
}

/** Award maki points for one round across all players. */
export function scoreMakiRound(
  playerIds: readonly PlayerId[],
  q: Q,
): Record<string, number> {
  const icons: Record<string, number> = {};
  for (const pid of playerIds) {
    let sum = 0;
    for (const cardId of q.zone.playerCards(pid, "played")) {
      sum += makiIcons(q.card.get(cardId));
    }
    icons[pid] = sum;
  }

  const ranked = [...playerIds].sort((a, b) => icons[b]! - icons[a]!);
  const topIcons = icons[ranked[0]!] ?? 0;
  const top = ranked.filter((pid) => icons[pid] === topIcons);

  const result: Record<string, number> = {};
  for (const pid of playerIds) result[pid] = 0;

  const topShare = splitAmong(playerIds, top, 6);
  for (const pid of playerIds) {
    result[pid] = (result[pid] ?? 0) + (topShare[pid] ?? 0);
  }

  if (playerIds.length < 3) return result;

  const remaining = ranked.filter((pid) => !top.includes(pid));
  if (remaining.length === 0) return result;

  const secondIcons = icons[remaining[0]!] ?? 0;
  const second = remaining.filter((pid) => icons[pid] === secondIcons);
  const secondShare = splitAmong(playerIds, second, 3);
  for (const pid of playerIds) {
    result[pid] = (result[pid] ?? 0) + (secondShare[pid] ?? 0);
  }

  return result;
}

export function scorePlayerRound(q: Q, playerId: PlayerId): number {
  return scorePlayedCards(q, playerId);
}

export function scoreRoundForAll(
  playerIds: readonly PlayerId[],
  q: Q,
): Record<string, number> {
  const maki = scoreMakiRound(playerIds, q);
  const out: Record<string, number> = {};
  for (const pid of playerIds) {
    out[pid] = scorePlayerRound(q, pid) + (maki[pid] ?? 0);
  }
  return out;
}

/** End-game pudding scoring. */
export function scorePuddingForAll(
  playerIds: readonly PlayerId[],
  q: Q,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const pid of playerIds) {
    counts[pid] = q.zone.playerCards(pid, "pudding").length;
  }

  const ranked = [...playerIds].sort((a, b) => counts[b]! - counts[a]!);
  const maxCount = counts[ranked[0]!] ?? 0;
  const minCount = counts[ranked[ranked.length - 1]!] ?? 0;
  const most = ranked.filter((pid) => counts[pid] === maxCount);
  const least = ranked.filter((pid) => counts[pid] === minCount);

  const out: Record<string, number> = {};
  for (const pid of playerIds) out[pid] = 0;

  const mostShare = splitAmong(playerIds, most, 6);
  for (const pid of playerIds) {
    out[pid] = (out[pid] ?? 0) + (mostShare[pid] ?? 0);
  }

  if (playerIds.length >= 3 && minCount < maxCount) {
    const leastShare = splitAmong(playerIds, least, -6);
    for (const pid of playerIds) {
      out[pid] = (out[pid] ?? 0) + (leastShare[pid] ?? 0);
    }
  }

  return out;
}

export function hasChopsticksReady(q: Q, playerId: PlayerId): boolean {
  return q.zone.playerCards(playerId, "played").some((cardId: CardId) => {
    const card = q.card.get(cardId);
    return card.properties.category === "chopsticks";
  });
}

export function destinationZoneForCard(
  q: Q,
  cardId: CardId,
): "played" | "pudding" {
  const card = q.card.get(cardId);
  return card.properties.category === "pudding" ? "pudding" : "played";
}
