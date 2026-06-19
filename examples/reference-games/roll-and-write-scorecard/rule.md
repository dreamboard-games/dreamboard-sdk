# Cloudline Survey

Cloudline Survey is a two-die roll-and-write scorecard game for one to four
players. The reference setup uses two players so seat-order resolution is easy
to inspect.

Every player has a private 4 by 4 survey grid:

```text
 2   5   8  11
 6   9   3   7
10   4  12   6
 7  11   5   9
```

The game uses eight seeded rolls:

| Round | Dice  | Total |
| ----- | ----- | ----- |
| 1     | 2 + 3 | 5     |
| 2     | 4 + 3 | 7     |
| 3     | 6 + 4 | 10    |
| 4     | 1 + 5 | 6     |
| 5     | 3 + 6 | 9     |
| 6     | 2 + 2 | 4     |
| 7     | 5 + 3 | 8     |
| 8     | 6 + 5 | 11    |

For each roll, players resolve in session seat order. If the active player has
an unmarked cell matching the roll total, they must choose one matching cell.
If no matching cell remains, they choose any unmarked cell and record a failed
survey. After the final player resolves a roll, the next seeded roll starts.
After every player resolves round 8, the game scores and ends.

Scoring:

- 6 points for each complete surveyed row.
- 6 points for each complete surveyed column.
- 1 point per surveyed cell in the largest orthogonally connected surveyed
  region.
- -2 points per failed survey.
