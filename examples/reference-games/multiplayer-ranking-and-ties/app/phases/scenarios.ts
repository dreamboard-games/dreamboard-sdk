import type { CardId, PlayerId } from "../../shared/manifest-contract";
import {
  createInitialPublicState,
  createRankedOutcome,
  deckForDraftSequence,
  demoPlayers,
  playDraftSequence,
  uniqueDeckOrder,
} from "./draft-flow";

export const uniqueWinnerSequence = [
  "food-p3-c0-1",
  "food-p2-c0-1",
  "craft-p2-c0-1",
  "food-p2-c0-2",
  "craft-p3-c0-1",
  "craft-p2-c0-2",
  "food-p2-c0-3",
  "food-p2-c0-4",
  "music-p3-c0-1",
  "music-p2-c0-1",
  "craft-p2-c0-3",
  "craft-p2-c0-4",
  "food-p2-c1-1",
  "craft-p1-c1-1",
  "music-p2-c0-2",
  "food-p1-c1-1",
  "craft-p2-c1-1",
  "music-p1-c1-1",
  "music-p2-c1-1",
  "craft-p1-c1-2",
  "music-p2-c1-2",
  "food-p1-c1-2",
  "craft-p3-c0-2",
  "music-p1-c1-2",
] as CardId[];

export const trueTieSequence = [
  "food-p3-c0-1",
  "food-p3-c0-2",
  "craft-p2-c1-1",
  "craft-p2-c1-2",
  "music-p1-c1-1",
  "music-p1-c1-2",
  "food-p2-c0-1",
  "food-p2-c0-2",
  "craft-p2-c0-1",
  "craft-p2-c0-2",
  "music-p2-c0-1",
  "music-p2-c0-2",
] as CardId[];

export const completeSetTieBreakSequence = [
  "food-p2-c0-1",
  "food-p3-c0-1",
  "food-p1-c1-1",
  "craft-p2-c0-1",
  "craft-p3-c0-1",
  "craft-p1-c1-1",
  "music-p2-c0-1",
  "music-p2-c0-2",
  "music-p1-c1-1",
  "food-p2-c0-2",
  "food-p2-c1-1",
  "food-p2-c0-3",
  "craft-p2-c0-2",
  "craft-p2-c1-1",
  "craft-p2-c0-3",
  "music-p2-c0-3",
  "food-p2-c1-2",
  "music-p2-c1-1",
] as CardId[];

export const coinTieBreakSequence = [
  "food-p2-c1-1",
  "food-p3-c0-1",
  "food-p1-c1-1",
  "craft-p2-c1-1",
  "craft-p3-c0-1",
  "craft-p1-c1-1",
  "music-p2-c0-1",
  "music-p3-c0-1",
  "music-p1-c1-1",
  "food-p2-c0-1",
  "food-p2-c0-2",
  "food-p2-c0-3",
  "craft-p2-c0-1",
  "craft-p2-c0-2",
  "craft-p2-c0-3",
  "food-p2-c1-2",
  "food-p2-c0-4",
  "music-p2-c1-1",
] as CardId[];

export const cancellationDeckOrder = uniqueDeckOrder([
  "food-p2-c0-1",
  "craft-p2-c0-1",
  "music-p2-c0-1",
  "food-p1-c1-1",
  "storm-1",
  "craft-p1-c1-1",
  "storm-2",
  "music-p1-c1-1",
] as CardId[]);

export const nonFirstTieRows = {
  "player-1": ["food-p3-c0-1", "craft-p3-c0-1", "music-p3-c0-1"],
  "player-2": ["food-p2-c0-1", "craft-p2-c0-1", "music-p2-c1-1"],
  "player-3": ["food-p2-c0-2", "craft-p2-c0-2", "music-p2-c1-2"],
  "player-4": ["food-p1-c1-1", "craft-p1-c1-1"],
} as Record<PlayerId, CardId[]>;

const twoPlayers = ["player-1", "player-2"] as PlayerId[];
const threePlayers = ["player-1", "player-2", "player-3"] as PlayerId[];
const fourPlayers = [...demoPlayers] as unknown as PlayerId[];

export const scenarioMetadata = {
  initial: {
    id: "multiplayer-ranking-and-ties.initial",
    state: createInitialPublicState({
      playerIds: twoPlayers,
      deckOrder: deckForDraftSequence(trueTieSequence),
    }),
  },
  uniqueWinner: {
    id: "multiplayer-ranking-and-ties.unique-winner",
    playerCount: 4,
    sequence: uniqueWinnerSequence,
    ...playDraftSequence({
      playerIds: fourPlayers,
      sequence: uniqueWinnerSequence,
    }),
  },
  trueTie: {
    id: "multiplayer-ranking-and-ties.true-tie",
    playerCount: 2,
    sequence: trueTieSequence,
    ...playDraftSequence({
      playerIds: twoPlayers,
      sequence: trueTieSequence,
    }),
  },
  completeSetTieBreak: {
    id: "multiplayer-ranking-and-ties.complete-set-tie-break",
    playerCount: 3,
    sequence: completeSetTieBreakSequence,
    ...playDraftSequence({
      playerIds: threePlayers,
      sequence: completeSetTieBreakSequence,
    }),
  },
  coinTieBreak: {
    id: "multiplayer-ranking-and-ties.coin-tie-break",
    playerCount: 3,
    sequence: coinTieBreakSequence,
    ...playDraftSequence({
      playerIds: threePlayers,
      sequence: coinTieBreakSequence,
    }),
  },
  nonFirstTie: {
    id: "multiplayer-ranking-and-ties.non-first-tie",
    playerCount: 4,
    rows: nonFirstTieRows,
    outcome: createRankedOutcome({
      playerIds: fourPlayers,
      festivalRows: nonFirstTieRows,
    }),
  },
  scorelessCancellation: {
    id: "multiplayer-ranking-and-ties.scoreless-cancellation",
    playerCount: 2,
    deckOrder: cancellationDeckOrder,
    ...playDraftSequence({
      playerIds: twoPlayers,
      sequence: ["food-p2-c0-1", "craft-p2-c0-1"] as CardId[],
      deckOrder: cancellationDeckOrder,
    }),
  },
};
