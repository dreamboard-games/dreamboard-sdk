import { describe, expect, test, vi } from "vitest";
import { createReducerBundle, defineBots } from "../../reducer";
import { frame } from "../../headless/sources/__fixtures__/frames";
import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
  PluginGameplayFrame,
} from "../../shared/protocol/frame";
import type { InteractionKey } from "../../headless/model";
import {
  game,
  metadata,
  playerView,
  skips,
} from "./__fixtures__/scored-bot-game";

type Game = typeof game;
type View = typeof playerView;
type Card = View["hand"][number];
type PassScore = (args: { cards: readonly Card[]; view: View }) => number;
type PassHandler =
  | PassScore
  | {
      candidates(context: {
        view: View;
        eligible: { cards: readonly Card[] };
        selection: { cards: { count: number } };
      }): Iterable<{ cards: readonly Card[] }>;
      score: PassScore;
    };

function offer(
  interactionKey: InteractionKey<Game>,
  inputs: readonly InteractionInputDescriptor[] = [],
): InteractionDescriptor<InteractionKey<Game>> {
  const [phaseName, interactionId] = interactionKey.split(".");
  return {
    phaseName,
    interactionKey,
    interactionId,
    label: interactionId,
    kind: "action",
    availability: { status: "available" },
    commit: { mode: "manual" },
    inputs,
  };
}

function cardInput(
  key: string,
  eligibleTargets: readonly string[],
  selection?: InteractionInputDescriptor["domain"]["selection"],
): InteractionInputDescriptor {
  return {
    key,
    kind: "card",
    domain: {
      type: "cardTarget",
      projection: "resolved",
      targetKind: "card",
      zoneIds: ["hand"],
      eligibleTargets,
      selection,
    },
  };
}

const playCard = offer("play.choose", [
  cardInput("selectedCardId", ["two", "ace"]),
]);
const passCards = offer("passing.submit", [
  cardInput("cardIds", ["four", "three", "two", "ace"], {
    mode: "many",
    min: 3,
    max: 3,
    distinct: true,
  }),
]);
const end = offer("play.end");

function seat(
  availableInteractions: readonly InteractionDescriptor<InteractionKey<Game>>[],
  view: View | null = playerView,
): PluginGameplayFrame {
  return { ...frame(), availableInteractions, view };
}

function setup({
  resolve = (view: View) => view.hand,
  choose = ({ selectedCard }: { selectedCard: Card; view: View }) =>
    -selectedCard.rank,
  pass = ({ cards }: { cards: readonly Card[] }) =>
    cards.reduce((total, card) => total + card.rank, 0),
  empty = ({ view }: { view: View }) => -view.shield,
}: {
  resolve?: (view: View) => readonly Card[];
  choose?: (args: { selectedCard: Card; view: View }) => number;
  pass?: PassHandler;
  empty?: (args: { view: View }) => number;
} = {}) {
  const registered = defineBots(game, {
    resolve: { card: resolve },
    strategies: [
      {
        ...metadata,
        score: {
          ...skips,
          "play.end": empty,
          "play.choose": choose,
          "passing.submit": pass,
        },
      },
    ],
  });
  const { decideBot } = createReducerBundle(game, {
    botStrategies: registered,
  });
  return (frame: PluginGameplayFrame) =>
    decideBot?.({ strategyId: metadata.id, frame });
}

describe("defineBots", () => {
  test("compares card and empty actions including negative scores", () => {
    expect(setup()(seat([end, playCard]))).toEqual({
      interactionId: "choose",
      params: { selectedCardId: "ace" },
    });
    expect(setup({ empty: () => 0 })(seat([playCard, end]))).toEqual({
      interactionId: "end",
      params: {},
    });
  });

  test("uses projected order for ties and supplies the original objects", () => {
    const resolve = vi.fn((view: View) => [...view.hand].reverse());
    const choose = vi.fn<(args: { selectedCard: Card; view: View }) => number>(
      () => 0,
    );
    const empty = vi.fn(() => 0);
    const decide = setup({ resolve, choose, empty });
    expect(decide(seat([playCard, end]))).toEqual({
      interactionId: "choose",
      params: { selectedCardId: "two" },
    });
    expect(choose.mock.calls).toHaveLength(2);
    const [first] = choose.mock.calls;
    expect(first[0].selectedCard).toBe(playerView.hand[1]);
    expect(first[0].view).toBe(playerView);
    expect(resolve).toHaveBeenCalledExactlyOnceWith(playerView);
    expect(decide(seat([end, playCard]))).toEqual({
      interactionId: "end",
      params: {},
    });
  });

  test("streams fixed unordered combinations in projected order", () => {
    const resolve = vi.fn((view: View) => view.hand);
    const pass = vi.fn(({ cards }: { cards: readonly Card[] }) =>
      cards.reduce((sum, card) => sum + card.rank, 0),
    );
    expect(setup({ resolve, pass })(seat([passCards]))).toEqual({
      interactionId: "submit",
      params: { cardIds: ["four", "three", "two"] },
    });
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(
      pass.mock.calls.map(([{ cards }]) => cards.map(({ id }) => id)),
    ).toEqual([
      ["four", "three", "two"],
      ["four", "three", "ace"],
      ["four", "two", "ace"],
      ["three", "two", "ace"],
    ]);
  });

  test("does not enumerate duplicate card IDs from aliased offers", () => {
    const score = vi.fn(() => 0);
    const repeated = offer("passing.submit", [
      cardInput("cardIds", ["four", "three", "four", "two"], {
        mode: "many",
        min: 3,
        max: 3,
        distinct: true,
        order: "unordered",
      }),
    ]);
    expect(setup({ pass: score })(seat([repeated]))).toEqual({
      interactionId: "submit",
      params: { cardIds: ["four", "three", "two"] },
    });
    expect(score).toHaveBeenCalledTimes(1);
  });

  test("scores only proposals and restores projected order before scoring", () => {
    const score = vi.fn(({ cards }: { cards: readonly Card[] }) =>
      cards.reduce((sum, card) => sum + card.rank, 0),
    );
    const decide = setup({
      pass: {
        *candidates({ eligible, selection, view }) {
          expect(view).toBe(playerView);
          expect(eligible.cards.map(({ id }) => id)).toEqual([
            "four",
            "three",
            "two",
            "ace",
          ]);
          yield {
            cards: [...eligible.cards]
              .reverse()
              .slice(-selection.cards.count)
              .map((card) => ({ ...card, rank: -1 })),
          };
        },
        score,
      },
    });
    expect(decide(seat([passCards]))).toEqual({
      interactionId: "submit",
      params: { cardIds: ["four", "three", "two"] },
    });
    expect(score).toHaveBeenCalledExactlyOnceWith({
      view: playerView,
      cards: [playerView.hand[3], playerView.hand[2], playerView.hand[1]],
    });
  });

  test("retains proposal yield order on ties", () => {
    expect(
      setup({
        pass: {
          *candidates({ eligible }) {
            yield { cards: eligible.cards.slice(1) };
            yield { cards: eligible.cards.slice(0, 3) };
          },
          score: () => 0,
        },
      })(seat([passCards])),
    ).toEqual({
      interactionId: "submit",
      params: { cardIds: ["three", "two", "ace"] },
    });
  });

  test("continues with other offers when a generator yields no proposals", () => {
    const score = vi.fn(() => 0);
    const decide = setup({ pass: { candidates: () => [], score } });
    expect(decide(seat([passCards]))).toBeNull();
    expect(decide(seat([passCards, end]))).toEqual({
      interactionId: "end",
      params: {},
    });
    expect(score).not.toHaveBeenCalled();
  });

  test.each([
    ["wrong count", (cards: readonly Card[]) => cards.slice(0, 2)],
    [
      "duplicate card",
      (cards: readonly Card[]) => [cards[0], cards[0], cards[1]],
    ],
    [
      "ineligible card ID",
      (cards: readonly Card[]) => [
        { ...cards[0], id: "four-99" as const },
        cards[1],
        cards[2],
      ],
    ],
  ])("rejects a proposal with %s before scoring", (_, propose) => {
    const score = vi.fn(() => 0);
    const decide = setup({
      pass: {
        candidates: ({ eligible }) => [{ cards: propose(eligible.cards) }],
        score,
      },
    });
    expect(() => decide(seat([passCards]))).toThrow(
      expect.objectContaining({
        category: "invalid_candidate",
        interactionKey: "passing.submit",
      }),
    );
    expect(score).not.toHaveBeenCalled();
  });

  test("reports generator iteration failures without the exception value", () => {
    const decide = setup({
      pass: {
        *candidates({ eligible }) {
          yield { cards: eligible.cards.slice(0, 3) };
          throw new Error("private generator data");
        },
        score: () => 0,
      },
    });
    expect(() => decide(seat([passCards]))).toThrow(
      expect.objectContaining({
        category: "candidate_generator_failed",
        interactionKey: "passing.submit",
        message: "Bot candidate generator failed.",
      }),
    );
  });

  test("skips unavailable actions, explicit skips and null views", () => {
    const resolve = vi.fn((view: View) => view.hand);
    const empty = vi.fn(() => 0);
    const decide = setup({ resolve, empty });
    expect(decide(seat([playCard, end], null))).toBeNull();
    expect(
      decide(
        seat([
          offer("play.form"),
          {
            ...playCard,
            availability: { status: "notYourTurn", reason: "Other seat" },
          },
        ]),
      ),
    ).toBeNull();
    expect(resolve).not.toHaveBeenCalled();
    expect(empty).not.toHaveBeenCalled();
  });

  test("rejects a negative fixed selection count on direct decision calls", () => {
    const invalidPass = offer("passing.submit", [
      cardInput("cardIds", ["four", "three", "two", "ace"], {
        mode: "many",
        min: -1,
        max: -1,
        distinct: true,
      }),
    ]);
    expect(() => setup()(seat([invalidPass]))).toThrow(
      "Combination count must be a nonnegative integer.",
    );
  });

  test.each([
    {
      resolve: () => {
        throw new Error("private resolver data");
      },
      category: "resolver_failed",
      message:
        "Bot card resolver failed. Every eligible card must resolve exactly once.",
    },
    {
      choose: () => {
        throw { private: "private scorer data" };
      },
      category: "scorer_failed",
      message: "Bot scorer failed.",
    },
  ])(
    "reports $category without the callback exception",
    ({ category, message, ...handlers }) => {
      expect(() => setup(handlers)(seat([playCard]))).toThrow(
        expect.objectContaining({
          name: "BotStrategyError",
          category,
          interactionKey: "play.choose",
          message,
        }),
      );
    },
  );

  test.each([NaN, Infinity, -Infinity])(
    "rejects non-finite score %s",
    (value) => {
      expect(() => setup({ empty: () => value })(seat([end]))).toThrow(
        "Bot score must be finite",
      );
    },
  );

  test.each([
    (view: View) => view.hand.slice(0, 1),
    (view: View) => [...view.hand, view.hand[1]],
  ])("requires each eligible card to resolve exactly once", (resolve) => {
    expect(() => setup({ resolve })(seat([playCard]))).toThrow(
      "Every eligible card must resolve exactly once",
    );
  });
});
