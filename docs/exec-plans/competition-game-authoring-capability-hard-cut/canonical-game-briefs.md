# Canonical Game Briefs

Status: proposed.

These four original microgames are the rules authority for the new canonical
reference games in this plan. Phase implementations may tune copy, balance, and
art direction, but must not replace the core loop with a different game unless
the plan is amended first.

The games intentionally use familiar mechanic families without copying a
commercial game's name, rules text, content, art, or trade dress.

## Shared Implementation Rules

Every game must:

- be a complete playable game rather than a component showcase;
- use seeded Dreamboard randomness and reproduce the same state from the same
  seed and interaction sequence;
- keep legal-action decisions in reducer collectors and descriptors;
- expose setup, current objective, and action guidance;
- support pointer and keyboard play;
- have a useful 390x844 layout;
- include deterministic scenario fixtures for its required branches;
- consume `@dreamboard-games/sdk` as an exact packed dependency; and
- include a `reference-game.json`, game README, and asset rights manifest.

The reference games teach framework boundaries. They do not need production
content volume, sophisticated balance, AI search, or final commercial art.

## `roll-and-write-scorecard`: Cloudline Survey

### Design Summary

| Field       | Decision                                                        |
| ----------- | --------------------------------------------------------------- |
| Players     | 1-4 humans                                                      |
| Length      | 8 shared rolls                                                  |
| Main lesson | A scorecard is an ordinary per-player square board              |
| Randomness  | One seeded two-die roll per round                               |
| Interaction | Each player marks one legal square or records one failed survey |
| End         | Score after every player has resolved the eighth roll           |

Cloudline Survey is a compact roll-and-write game. Every player receives the
same fixed 4x4 survey grid. Each cell has a target number from 2 through 12.

The game uses one shared roll per round, but players resolve it in session seat
order. Sequential resolution avoids introducing another simultaneous-action
capability in Phase 01 while preserving the defining roll-and-write pattern:
all players use the same random result on their own scorecard.

### Scorecard

Use this fixed target layout:

```text
 2   5   8  11
 6   9   3   7
10   4  12   6
 7  11   5   9
```

Each cell is one of:

```ts
type SurveyMark =
  | { kind: "surveyed"; round: number; rolledTotal: number }
  | { kind: "failed"; round: number };
```

The per-player board declaration remains gameplay topology only:

```ts
const boards = [
  {
    id: "survey-grid",
    name: "Survey grid",
    layout: "square",
    scope: "perPlayer",
    spaces: surveyCells,
  },
] as const;
```

### Round Flow

1. The `roll` auto phase rolls two six-sided dice and stores both values and
   their total.
2. The next unresolved player enters `markSurvey`.
3. If that player has an unmarked cell whose target equals the rolled total,
   they must select exactly one matching cell and submit it.
4. If no matching cell remains, they select any unmarked cell and record a
   failed survey there.
5. After every player resolves the roll, start the next round.
6. After round 8, calculate the final result.

The reducer, not the UI, decides whether the player is making a successful or
failed mark:

```ts
function legalSurveyTargets(
  state: PublicState,
  playerId: PlayerId,
): readonly CellId[] {
  const empty = emptyCells(state, playerId);
  const matching = empty.filter(
    (cellId) => cellById[cellId].target === state.roll.total,
  );
  return matching.length > 0 ? matching : empty;
}
```

The interaction uses `boardTarget.playerSpace` and a draft followed by submit.
Presentation renders a surveyed cell with the rolled total and a failed cell
with a cross.

### Scoring

For each player:

- 6 points for each row containing four surveyed cells;
- 6 points for each column containing four surveyed cells;
- 1 point per surveyed cell in the player's largest orthogonally connected
  group; and
- minus 2 points per failed survey.

Phase 01 may temporarily express the result with the existing terminal API.
Phase 02 must migrate the game to `GameOutcome` with score components
`complete-rows`, `complete-columns`, `largest-region`, and `failed-surveys`.

### Required Scenarios

- first roll with multiple matching cells;
- one remaining matching cell;
- no remaining match, requiring a failed survey;
- drafted but unsubmitted mark;
- stale submission after the active player changes;
- complete row and complete column scoring;
- one-player complete game;
- four-player seat-order progression;
- keyboard-only mark and submit;
- 390x844 scorecard without horizontal scrolling; and
- identical rolls, marks, and result from the same seed.

### Capability Boundary

The game justifies generated `Board.SquareGrid`. It does not justify a `Sheet`
runtime, a scorecard-specific collector, a physical carrier field, or an SDK
component that calculates the score.

## `multiplayer-ranking-and-ties`: Harbor Fair

### Design Summary

| Field       | Decision                                                            |
| ----------- | ------------------------------------------------------------------- |
| Players     | 2-4 humans                                                          |
| Length      | 6 rounds                                                            |
| Main lesson | Ranked results, true ties, tie-break evidence, and score breakdowns |
| Randomness  | Seeded festival deck shuffle                                        |
| Interaction | Draft one public stall card into a personal festival row            |
| End         | Score after round 6, or scoreless cancellation after two storms     |

Harbor Fair is a small open-information drafting game. It is intentionally
simple so the implementation focus stays on authoritative results rather than
card-game infrastructure.

### Cards

The festival deck contains stall cards and two storm cards:

```ts
type Guild = "food" | "craft" | "music";

type StallCard = {
  kind: "stall";
  id: StallCardId;
  guild: Guild;
  prestige: 1 | 2 | 3;
  coins: 0 | 1;
};

type StormCard = {
  kind: "storm";
  id: StormCardId;
};
```

Create 30 stall cards. For each of the three guilds, use this ten-card value
recipe:

```text
prestige 1, coin 1: 2 cards
prestige 2, coin 0: 4 cards
prestige 2, coin 1: 2 cards
prestige 3, coin 0: 2 cards
```

Add two storm cards. The shared market contains four face-up stall cards.
Storm cards are resolved when drawn while refilling and do not occupy a market
slot. Scenario fixtures may provide an explicit deck order; ordinary setup
uses the seeded shuffle.

### Round Flow

1. In session seat order, each player drafts one stall from the market.
2. Move the card to that player's public festival row.
3. Refill the market.
4. If a storm is revealed, increment `stormsRevealed`, record the public event
   in ordinary game state until Phase 04 supplies `GameEvent`, then continue
   refilling.
5. If the second storm is revealed, end immediately with
   `FESTIVAL_CANCELLED`.
6. After every player drafts, increment the round and return to the first seat.
7. If round 6 completes, calculate standings.

The second-storm branch exists to prove a valid terminal outcome without
numeric scores. Every human receives rank 1 and result `draw`; the standings
omit `score`, `scoreBreakdown`, and `tieBreaks`.

### Scoring And Ranking

For a normal six-round ending:

- `stall-prestige`: sum printed prestige;
- `guild-sets`: 4 points for each complete set containing one food, one craft,
  and one music stall;
- `coin-bonus`: 1 point per coin;
- first tie-break: number of complete guild sets;
- second tie-break: total coins; and
- if both tie-break values remain equal, players share the same rank and use
  result `draw` when tied for first.

The reducer computes standings explicitly:

```ts
type FestivalResult = {
  playerId: PlayerId;
  prestige: number;
  guildSetPoints: number;
  coins: number;
  completeSets: number;
};

function compareFestivalResult(a: FestivalResult, b: FestivalResult): number {
  return (
    totalScore(b) - totalScore(a) ||
    b.completeSets - a.completeSets ||
    b.coins - a.coins
  );
}
```

Do not ask `OutcomeDialog` or `StandingsTable` to sort these rows. The reducer
assigns final ranks after grouping equal score and tie-break tuples.

### Outcome Example

```ts
return endGame(state, {
  reason: { code: "SIX_ROUNDS_COMPLETE" },
  standings: ranked.map((row) => ({
    playerId: row.playerId,
    rank: row.rank,
    result: row.result,
    score: row.total,
    scoreBreakdown: [
      {
        id: "stall-prestige",
        label: "Stall prestige",
        value: row.prestige,
      },
      {
        id: "guild-sets",
        label: "Guild sets",
        value: row.guildSetPoints,
      },
      { id: "coin-bonus", label: "Coins", value: row.coins },
    ],
    tieBreaks: [
      {
        id: "complete-sets",
        label: "Complete sets",
        value: row.completeSets,
      },
      { id: "coins", label: "Coins", value: row.coins },
    ],
  })),
});
```

### Required Scenarios

- unique winner by raw score;
- equal raw score separated by complete sets;
- equal score and complete sets separated by coins;
- true first-place tie after both tie-breaks;
- non-first tied rank;
- second storm causing scoreless cancellation;
- terminal commit followed by reconnect;
- two-, three-, and four-player result validation;
- desktop and 390x844 outcome presentation; and
- strict rejection of missing, duplicate, or unknown player standings.

### Capability Boundary

The game justifies `GameOutcome` and controlled outcome presentation. It does
not justify generic scoring rules, a framework ranking engine, or UI-side
winner inference.

## `solo-countdown-puzzle`: Last Light

### Design Summary

| Field       | Decision                                                    |
| ----------- | ----------------------------------------------------------- |
| Players     | Exactly 1 human                                             |
| Length      | At most 8 turns                                             |
| Main lesson | Deterministic environment procedures without an opponent ID |
| Randomness  | Seeded weather deck                                         |
| Interaction | Charge, repair a beacon, or reinforce the sea wall          |
| End         | Light all beacons, reach storm 6, or exhaust the countdown  |

Last Light is a solo resource puzzle. The player is restoring three coastal
beacons while a deterministic weather deck advances a storm.

There is no opponent object, opponent hand, or non-human session actor.

### State

```ts
type BeaconId = "north" | "harbor" | "south";

type PublicState = {
  turnsRemaining: number;
  energy: number;
  storm: number;
  beacons: Record<BeaconId, 0 | 1 | 2>;
  reinforced: boolean;
  revealedWeather: WeatherCardId[];
};

type HiddenState = {
  weatherDeck: WeatherCardId[];
};
```

All three beacons are lit at level 2. The player starts with 5 energy, storm 0,
eight turns remaining, and no reinforcement.

### Player Actions

On each turn choose exactly one:

- `charge`: gain 2 energy, capped at 7;
- `repair`: spend 1 energy to raise one beacon by 1; or
- `reinforce`: spend 2 energy to set `reinforced` until the next storm advance.

The player action transitions through two auto phases:

```text
playerTurn -> resolveWeather -> advanceCountdown -> playerTurn
```

If a `repair` action lights the third beacon, end the game immediately before
entering `resolveWeather`.

`resolveWeather` reveals the next seeded card:

```ts
type WeatherCard =
  | { kind: "calm"; title: string }
  | { kind: "gale"; title: string; storm: 1 }
  | {
      kind: "squall";
      title: string;
      storm: 1;
      dimBeacon: BeaconId;
    };
```

- Calm changes no tracks.
- Gale advances storm by 1 unless reinforcement prevents it.
- Squall advances storm by 1 and reduces the named beacon by 1 if it is above 0.
- Reinforcement prevents both effects of one Gale or Squall.
- Reinforcement is consumed after resolving a Gale or Squall.

Use this eight-card weather deck before seeded shuffling:

```text
Calm: 2
Gale: 3
Squall north: 1
Squall harbor: 1
Squall south: 1
```

After weather resolution, end immediately if storm reaches 6. Otherwise,
`advanceCountdown` decrements `turnsRemaining`, checks the countdown loss, and
transitions to the next player turn if the game continues.

### Terminal Rules

Check at these boundaries:

1. After the player action, if all three beacons reach level 2, the player wins
   with reason `ALL_BEACONS_LIT`.
2. After weather, if storm reaches 6, the player loses with reason
   `STORM_REACHED_LIGHTHOUSE`.
3. After countdown, if turns reach 0, the player loses with reason
   `DAWN_ARRIVED`.

All outcomes are scoreless:

```ts
standings: [
  {
    playerId,
    rank: 1,
    result: won ? "win" : "loss",
  },
];
```

### Required System Events

- `weather-calm`: reports the revealed card;
- `storm-advanced`: reports old and new storm values;
- `reinforcement-held`: reports the prevented storm advance;
- `beacon-dimmed`: reports the affected beacon; and
- `countdown-advanced`: reports turns remaining.

An accepted transition may emit more than one ordered event.

### Required Scenarios

- win by lighting the third beacon;
- loss when storm reaches 6;
- loss when countdown reaches 0;
- Gale with and without reinforcement;
- Squall dimming a lit beacon;
- Calm followed by countdown;
- reconnect after weather and countdown commit;
- event log at 390x844;
- no opponent/player-two identity anywhere in state or projection; and
- identical weather, events, state, and outcome from the same seed.

### Capability Boundary

The game justifies deterministic `GameEvent` output and its persistence. It
does not justify a bot actor, a general AI API, event-level access control, or
host-executed commands.

## `automa-river-rival`: River Guild

### Design Summary

| Field       | Decision                                                        |
| ----------- | --------------------------------------------------------------- |
| Players     | 1-2 cooperating humans                                          |
| Length      | 6 rounds                                                        |
| Main lesson | A deterministic rival deck is ordinary state, not a fake player |
| Randomness  | Seeded cargo deck and seeded rival instruction deck             |
| Interaction | Each human claims one cargo card from a public river            |
| End         | Compare the team's cargo value with rival progress              |

River Guild is a cooperative open-market game. Human players collect cargo
from a four-card river. After all humans have acted in a round, a deterministic
rival instruction claims or disrupts one river card.

The rival has a label, deck, claimed cargo, and progress track in game state.
It has no `PlayerId`, seat, actor, hand projection, authentication identity, or
interaction submission.

### State

```ts
type CargoKind = "timber" | "grain" | "ore";

type CargoCard = {
  id: CargoCardId;
  kind: CargoKind;
  value: 1 | 2 | 3;
};

type RivalInstruction =
  | { kind: "claimHighest" }
  | { kind: "claimKind"; cargoKind: CargoKind }
  | { kind: "sweepLeft" };

type PublicState = {
  round: number;
  activePlayerIndex: number;
  river: CargoCardId[];
  humanCargo: Record<PlayerId, CargoCardId[]>;
  rivalProgress: number;
  rivalClaimed: CargoCardId[];
  rivalDiscarded: CargoCardId[];
};

type HiddenState = {
  cargoDeck: CargoCardId[];
  rivalDeck: RivalInstruction[];
};
```

Create 24 cargo cards. For each cargo kind, use values
`[1, 1, 2, 2, 2, 3, 3, 3]`. The six-card rival deck contains:

```text
claimHighest: 2
claimKind timber: 1
claimKind grain: 1
claimKind ore: 1
sweepLeft: 1
```

Shuffle both decks with the session seed. Scenario fixtures may provide
explicit deck order to isolate each rival branch.

### Round Flow

1. In session seat order, each human claims one cargo card from the river.
2. Refill the empty river slot from the cargo deck.
3. After the last human acts, enter `resolveRival`.
4. Reveal and execute the next rival instruction.
5. Refill the river if the rival removed a card.
6. Enter `advanceRiverRound`, increment the round, and return to the first
   human.
7. End after the rival resolves round 6.

Rival instructions are deterministic:

- `claimHighest`: claim the highest-value river card; break ties by leftmost
  position;
- `claimKind`: claim the highest-value card of the named kind; if none exists,
  claim the leftmost card; and
- `sweepLeft`: discard the leftmost card and advance rival progress by 1.

Claimed cards add their printed value to `rivalProgress`. Swept cards do not
add their printed value.

### Terminal Rules

The team score is the sum of all human claimed-card values. Compare it with
`rivalProgress`:

- team greater than rival: every human wins;
- team equal to rival: every human draws; and
- team lower than rival: every human loses.

This is a cooperative result, so all humans share rank 1 and the same result.
Each standing carries the team score and the same complete contribution
breakdown. The components sum to the team score:

```ts
standings: playerOrder.map((playerId) => ({
  playerId,
  rank: 1,
  result: teamResult,
  score: teamScore,
  scoreBreakdown: playerOrder.map((memberId, index) => ({
    id: `seat-${index + 1}-cargo`,
    label: `Player ${index + 1} cargo`,
    value: cargoValue(state.publicState.humanCargo[memberId]),
  })),
}));
```

The terminal game view displays `rivalProgress` beside the authoritative
outcome. Do not misuse player `tieBreaks` to carry the non-player rival score.

### Required System Events

- `rival-instruction-revealed`;
- `rival-cargo-claimed`;
- `rival-river-swept`;
- `river-refilled`; and
- `river-round-advanced`.

Each event names the procedure and public result without pretending that a
player submitted the action.

### Required Scenarios

- `claimHighest` with a unique highest card;
- `claimHighest` leftmost tie-break;
- `claimKind` with a matching card;
- `claimKind` fallback when the kind is absent;
- `sweepLeft`;
- one-human victory, draw, and loss;
- two-human cooperative victory;
- duplicate human action returns the same committed rival events;
- reconnect after rival resolution;
- no rival ID accepted by player-targeted collectors;
- recent rival events at 390x844; and
- identical rival instructions, claims, events, and outcome from the same
  seed.

### Capability Boundary

The game justifies reducer-owned system events across the wire and host
projection. It does not justify a bot participant model, model-generated
decisions, or a general automa framework.

## Delegation Map

| Example                        | Rules owner | Framework owner                           | Primary acceptance artifact                           |
| ------------------------------ | ----------- | ----------------------------------------- | ----------------------------------------------------- |
| `roll-and-write-scorecard`     | Phase 01    | Generated `Board.SquareGrid`              | Packed game plus square-board interaction scenarios   |
| `multiplayer-ranking-and-ties` | Phase 02    | `GameOutcome` and outcome presentation    | Terminal persistence and reconnect scenarios          |
| `solo-countdown-puzzle`        | Phase 04    | `GameEvent` and automated-procedure flow  | Seed-repeat event and outcome comparison              |
| `automa-river-rival`           | Phase 04    | `GameEvent`, persistence, host projection | Duplicate/reconnect proof with no non-human player ID |

Implementation PR descriptions must link to the relevant section of this file
and list any deliberate rule deviations.
