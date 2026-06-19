# River Guild Rules

## Goal

Score at least as much cargo value as the river rival after six rounds.

## Setup

Create one human player, deal the public river, and place the fixed rival
instruction deck in order.

## Human Claim

On the human turn, submit `claimCargo`. The team gains two points. The action
must include a claim id; reusing a claim id returns the same committed rival
event slice and does not score again.

## Rival Procedure

After the human claim, reveal the top rival instruction.

- `claimHighest` removes the highest-value cargo in the river. Ties break by
  cargo id in ascending order.
- `claimKind` removes the first cargo of the named kind. If none exists, it
  removes the leftmost cargo.
- `sweepLeft` removes the leftmost cargo.

The rival gains progress equal to the removed cargo value. The reducer appends
system events for instruction reveal, cargo claim, river refill, and round
advance.

## End

After round six, compare team score and rival progress. The cooperative outcome
is `win`, `draw`, or `loss`.
