# Harbor Fair Rules

## Players

Harbor Fair supports two to four players seated in a fixed order.

## Deck

The festival deck contains 30 stall cards and two storm cards. Stall cards
belong to one of three guilds: food, craft, and music. Each guild has:

| Prestige | Coins | Count |
| -------- | ----- | ----- |
| 1        | 1     | 2     |
| 2        | 0     | 4     |
| 2        | 1     | 2     |
| 3        | 0     | 2     |

## Draft

Reveal stall cards until the shared market contains four stalls. Storm cards
revealed during refill are discarded and count toward the storm limit.

Players draft in seat order. On a turn, the active player chooses one face-up
stall card, adds it to their festival row, and refills the market. After the
last player drafts, the round advances. The fair ends after six rounds.

## Cancellation

When the second storm is revealed, the fair ends immediately. No player receives
a numeric score. Every player is rank 1 with result `draw`, and the outcome
reason is `FESTIVAL_CANCELLED`.

## Scoring

If six rounds complete, each player scores:

- Stall prestige: sum printed prestige.
- Guild sets: 4 points for each complete food/craft/music set.
- Coin bonus: 1 point per coin.

Sort standings by total score, then complete sets, then coins. Players with
identical values across all three fields share a rank. A sole rank-1 player
gets result `win`; tied rank-1 players get result `draw`; all other players get
result `loss`.
