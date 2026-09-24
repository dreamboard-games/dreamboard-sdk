# Instance objects

<!-- api: root GameInstance -->
<!-- api: root GameSnapshot -->
<!-- api: root Interaction -->
<!-- api: root Input -->
<!-- api: root Card -->
<!-- api: root Zone -->
<!-- api: root Player -->
<!-- api: root Phase -->
<!-- api: root Turn -->

Objects retain their captured snapshot data. Handlers use current authoritative
routing and options; an object from an ended source/seat lifetime cannot act for a
new seat. Getter results are immutable, including nested local draft values.

| Object      | Data                                                                 | Getters                                                                                                                                                                          | Handlers                                                    |
| ----------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Instance    | `view`, `version`, `connection`, `request`, `state`, `events.recent` | `getSnapshot`, `inspect`, `getOptions`                                                                                                                                           | `setOptions`, `subscribe`, `dispose`, `assertCoverage`      |
| Phase       | `current`                                                            | `is`, `switch`                                                                                                                                                                   | —                                                           |
| Turn        | `activePlayerIds`, `currentPlayerId`, `order`, `isMine`              | —                                                                                                                                                                                | —                                                           |
| Player      | `id`, `index`, `name`, `color`, `isMe`                               | —                                                                                                                                                                                | —                                                           |
| Interaction | `key`, `id`, `phase`, `label`, `help`, `kind`                        | `getInputs`, `getInput`, `getStep`, `getStepIndex`, `getAvailability`, `getIsAvailable`, `getUnavailableReason`, `getIsReady`, `getMissingInputs`, `getStatus`, `getSubmitProps` | `submit`, `cancel`, `reset`, `activate`, `getSubmitHandler` |
| Input       | `key`, `kind`, `interaction`                                         | `getDomain`, `getValue`, `getIsReady`, `getEligibleTargets`, `getIsEligible`, `getIsSelected`, `getTargetProps`, `getFieldProps`                                                 | `setValue`, `clear`, `getSelectHandler`                     |
| Zone        | `id`, `count`                                                        | `getCards`, `getIsEmpty`                                                                                                                                                         | —                                                           |
| Card        | `id`, `zone`, `index`, `view`, `hidden`                              | `getInteractions`, `getIsEligible`, `getIsSelected`, `getCanSelect`, `getProps`                                                                                                  | `select`, `getSelectHandler`                                |

Collections are `players.get/getAll/next`, `interactions.get/list/listAvailable`,
`inputs.get`, `zones.get/getAll`, and `cards.get`. `me` is null before a selected
snapshot; otherwise it provides id, player and getCanAct. Turn ownership is derived
only from active membership. Events are the latest **public** batch, not a replay
stream or accumulated history. Testing-source apply/explore capabilities appear
only when the supplied source supports them.
