# Last Light Rules

You are keeping three coastal beacons alive through a short storm window.

## Objective

Light the north, harbor, and south beacons to level 2 before the countdown
expires or the storm reaches strength 6.

## Setup

- One human player, `player-1`, starts active.
- The countdown starts at 8 turns.
- Energy starts at 5.
- Storm starts at 0.
- Each beacon starts at level 0.
- Weather resolves from the deterministic deck: calm, gale, squall, calm.

## Turn

On `playerTurn`, choose one beacon to repair. A legal repair costs one energy
and raises that beacon by one level, to a maximum of 2.

If all three beacons are at level 2 after the repair, the game ends
immediately with the `all-beacons-lit` win outcome.

Otherwise, `resolveWeather` reveals the next deterministic weather card and
records a `systemAction` event. If the storm reaches 6, the game ends with the
`storm-six` loss outcome.

If the storm does not end the game, `advanceCountdown` subtracts one turn and
records a second `systemAction` event. If the countdown reaches 0, the game
ends with the `countdown-exhausted` loss outcome. Otherwise, play returns to
`playerTurn`.

## Reconnect

The public event log is stored in reducer state. A reconnect should restore the
same weather and countdown events without inventing a bot, automa, or system
player.
