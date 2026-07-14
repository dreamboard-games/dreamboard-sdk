# Last Light

Status: **approved and authoritative**.

This file is the gameplay and theme authority for Last Light. The current
implementation, generated fixtures, snapshots, and tests describe legacy
behavior until they have been brought into conformance with this brief. A test
that disagrees with this file must be corrected; it does not amend the rules.

## Teaching scope

Last Light teaches deterministic environment procedures without inventing an
opponent identity. It demonstrates a complete solo resource puzzle, meaningful
action availability, seeded hidden-deck randomness, ordered system events, and
terminal checks at different points in one turn.

The game lasts up to eight decisions and must be shown as a developing puzzle:
energy rises and falls, beacons brighten or dim, reinforcement absorbs a storm,
and the countdown creates pressure. A single repair followed by one weather
card is a branch test, not a representative product demo.

## Theme brief

One lighthouse keeper must relight three coastal beacons before dawn while a
storm approaches the lighthouse. The keeper can recharge the station's power,
repair one beacon stage, or reinforce the sea wall against the next dangerous
weather card.

The presentation should feel tense but hopeful: a dark coast gradually gains
three points of light while weather fronts advance across a visible timeline.
Energy, storm strength, turns remaining, beacon levels, and reinforcement must
be readable together. Weather is an environmental procedure—not a character,
bot, rival, or player.

Canonical vocabulary:

- **energy**: the resource spent on repair and reinforcement;
- **beacons**: north, harbor, and south, each with levels 0 through 2;
- **reinforcement**: one stored sea-wall defense against the next Gale or
  Squall;
- **storm**: the danger track from 0 to 6; and
- **countdown**: turns remaining before dawn.

## Players and objective

Last Light requires exactly one human player. Light the north, harbor, and
south beacons to level 2 before the storm reaches 6 or the eight-turn countdown
reaches 0.

This is a scoreless win-or-loss puzzle. There is no target score and no
comparison with another participant.

## Information visibility

The following are public:

- energy, storm, turns remaining, and reinforcement;
- all three beacon levels;
- revealed weather cards and ordered system events; and
- the terminal reason and outcome.

The order of the unrevealed weather deck is hidden. The random source state is
engine-private. There is no second player projection, opponent hand, or private
human information.

## Components and setup

The three beacons are `north`, `harbor`, and `south`. Each starts at level 0
and is lit at level 2.

The player starts with:

- 5 energy;
- storm strength 0;
- 8 turns remaining; and
- no reinforcement.

The eight-card weather deck contains:

| Weather       | Count | Effect without reinforcement                   |
| ------------- | ----: | ---------------------------------------------- |
| Calm          |     2 | No track or beacon change.                     |
| Gale          |     3 | Advance storm by 1.                            |
| North Squall  |     1 | Advance storm by 1 and dim north by 1 if lit.  |
| Harbor Squall |     1 | Advance storm by 1 and dim harbor by 1 if lit. |
| South Squall  |     1 | Advance storm by 1 and dim south by 1 if lit.  |

Ordinary setup seed-shuffles these eight cards once, establishes the single
human as active, and enters `playerTurn`. The deck does not repeat, replenish,
or wrap. Scenario tests may inject explicit weather order but ordinary play
must use Dreamboard's seeded random source.

## Complete game arc

Every surviving turn follows this sequence:

```text
playerTurn -> resolveWeather -> advanceCountdown -> playerTurn
```

1. The player chooses exactly one available action.
2. If that action lights the third beacon, win immediately; do not reveal
   weather or decrement the countdown.
3. Otherwise reveal and completely resolve the next weather card.
4. If storm reaches 6, lose immediately; do not decrement the countdown.
5. Otherwise decrement turns remaining by 1.
6. If turns remaining reaches 0, lose immediately.
7. Otherwise return to `playerTurn` with the new state.

At most eight weather cards can resolve because the countdown contains eight
turns and the deck contains exactly eight cards.

## Phases and actions

| Phase              | Actor               | Available action | Input      | Availability and effect                                                                                                             |
| ------------------ | ------------------- | ---------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `playerTurn`       | The sole human      | `charge`         | None       | Available while energy is below 7. Gain 2 energy, capped at 7.                                                                      |
| `playerTurn`       | The sole human      | `repairBeacon`   | `beaconId` | Available with at least 1 energy and at least one beacon below level 2. Spend 1 energy and raise the selected non-full beacon by 1. |
| `playerTurn`       | The sole human      | `reinforce`      | None       | Available with at least 2 energy and no stored reinforcement. Spend 2 energy and set reinforcement.                                 |
| `resolveWeather`   | Automatic procedure | None             | None       | Reveal and resolve exactly one seeded weather card, then check storm loss.                                                          |
| `advanceCountdown` | Automatic procedure | None             | None       | Subtract one turn, check countdown loss, then return to `playerTurn`.                                                               |
| `gameOver`         | None                | None             | None       | Expose the authoritative scoreless outcome.                                                                                         |

Action availability is derived from authoritative state. `repairBeacon` only
offers beacon IDs that are currently below level 2; the reducer revalidates the
submitted ID and energy cost. Charging at 7 and reinforcing an already
reinforced sea wall are unavailable because they cannot create an additional
effect. Reinforcement does not stack.

## Weather resolution and events

Reveal the next card, then resolve exactly one of these branches:

- **Calm:** make no state change, preserve any stored reinforcement, and append
  `weather-calm` with the revealed card identity.
- **Gale with reinforcement:** prevent the entire Gale, consume reinforcement,
  and append `reinforcement-held` with the revealed card identity. Do not
  append `storm-advanced`.
- **Gale without reinforcement:** add 1 storm and append `storm-advanced` with
  the revealed card identity plus old and new values.
- **Squall with reinforcement:** prevent both its storm increase and beacon
  dimming, consume reinforcement, and append `reinforcement-held`. Do not append
  `storm-advanced` or `beacon-dimmed`.
- **Squall without reinforcement:** add 1 storm and append `storm-advanced`,
  then reduce the named beacon by 1 if it is above 0 and append
  `beacon-dimmed` only when its level changes.

For an unblocked Squall, apply both effects before checking whether storm has
reached 6. If the game survives weather, `advanceCountdown` decrements the
countdown and appends `countdown-advanced` with turns remaining.

Each weather transition emits its ordered events exactly once as part of that
authoritative resolution.

## Terminal ordering and outcome

Terminal checks have strict precedence:

1. After `repairBeacon`, all three beacons at level 2 ends immediately with
   reason `ALL_BEACONS_LIT` and result `win`.
2. After completely resolving weather, storm at 6 ends immediately with reason
   `STORM_REACHED_LIGHTHOUSE` and result `loss`.
3. After decrementing the countdown, turns remaining at 0 ends immediately
   with reason `DAWN_ARRIVED` and result `loss`.

The sole standing always has rank 1, contains no numeric score or score
breakdown, and carries the corresponding `win` or `loss` result.

## Deliberate exclusions

Last Light deliberately does not include:

- an opponent, bot, automa, environment `PlayerId`, or second human;
- a player action that directly resolves or chooses weather;
- host-executed game commands or model-generated decisions;
- reinforcement stacks, multiple defenses, inventory cards, or upgrades;
- difficulty levels, variable countdowns, or a repeating weather deck;
- numeric score, optimization medals, ranking, or campaign progression;
- event-level access control or a general-purpose event framework designed by
  this game; or
- checked-in shuffled decks or mid-game base states as rules authority.

## Acceptance obligations

Conformance must prove:

- normal setup has exactly one human and no opponent identity anywhere in
  state, actions, events, or projections;
- one seeded shuffle of the exact eight-card weather composition;
- `charge`, `repairBeacon`, and `reinforce` availability at their boundaries;
- charging caps at 7, repair spends 1, and reinforcement spends 2;
- repair selection rejects a full or unknown beacon;
- immediate win on the third lit beacon with no later weather or countdown;
- Calm preserves reinforcement;
- Gale with and without reinforcement;
- each Squall target, including dimming and prevention of both effects;
- unblocked Squall effects finish before the storm terminal check;
- storm loss takes precedence over countdown advancement;
- countdown loss after surviving weather;
- exact event ordering for every weather and countdown branch;
- identical weather, events, state, and outcome from the same seed;
- complete seeded games demonstrating both a win and each loss reason; and
- pointer and keyboard play with an intelligible event history on desktop and
  at 390 by 844.
