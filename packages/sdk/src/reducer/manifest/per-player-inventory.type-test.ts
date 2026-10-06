import * as z from "zod";
import { compileManifest } from "./compiler.js";
import {
  perPlayerInstanceId,
  type PerPlayerInstanceId,
} from "../../shared/domain/per-player-instance.js";
import type {
  CardIdOfManifest,
  BoardIdOfManifest,
  PieceIdOfManifest,
  DieIdOfManifest,
} from "../model/extract.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;
const source = {
  players: { minPlayers: 1, maxPlayers: 4 },
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      cardSchema: z.object({ n: z.number().default(1) }),
      defaultHome: { type: "detached" },
      cards: [
        {
          id: "card",
          name: "Card",
          cardType: "action",
          count: 2,
          scope: "perPlayer",
          properties: {},
        },
      ],
    },
  ],
  pieceTypes: [
    {
      id: "worker",
      name: "Worker",
      fieldsSchema: z.object({ strength: z.number().default(1) }),
    },
  ],
  pieceSeeds: [
    { id: "worker", typeId: "worker", count: 2, scope: "perPlayer" },
    { id: "shared", typeId: "worker" },
  ],
  dieTypes: [{ id: "combat", name: "Combat", sides: 6 }],
  dieSeeds: [{ id: "die", typeId: "combat", scope: "perPlayer" }],
  boards: [
    {
      id: "mat",
      name: "Mat",
      layout: "generic",
      scope: "perPlayer",
      spaces: [{ id: "home" }],
    },
  ],
} as const;
const compiled = compileManifest(source);
const table = compiled.createInitialTable({ playerIds: ["arbitrary/席"] });
const piece = perPlayerInstanceId("piece", "worker-2", "arbitrary/席");
const strength: number = table.pieces[piece].properties.strength;
const exactPiece: PerPlayerInstanceId<"piece", "worker-1" | "worker-2"> =
  table.pieces[piece].id;
const exactCard: PerPlayerInstanceId<"card", "card-1" | "card-2"> =
  table.cards[perPlayerInstanceId("card", "card-1", "arbitrary/席")].id;
const exactDie: PerPlayerInstanceId<"die", "die"> =
  table.dice[perPlayerInstanceId("die", "die", "arbitrary/席")].id;
const shared: "shared" = table.pieces.shared.id;
type CardProof = Expect<
  Equal<
    CardIdOfManifest<typeof compiled>,
    PerPlayerInstanceId<"card", "card-1" | "card-2">
  >
>;
type PieceProof = Expect<
  Equal<
    PieceIdOfManifest<typeof compiled>,
    "shared" | PerPlayerInstanceId<"piece", "worker-1" | "worker-2">
  >
>;
type DieProof = Expect<
  Equal<DieIdOfManifest<typeof compiled>, PerPlayerInstanceId<"die", "die">>
>;
type BoardProof = Expect<
  Equal<BoardIdOfManifest<typeof compiled>, PerPlayerInstanceId<"board", "mat">>
>;
const staticPiece: "shared" | undefined = compiled.literals.pieceIds[0];
type StaticCardProof = Expect<
  Equal<(typeof compiled.literals.cardIds)[number], never>
>;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Negative proof accesses an inadmissible ordinal.
const badOrdinal =
  // @ts-expect-error Count expansion retains its exact upper bound.
  table.pieces[perPlayerInstanceId("piece", "worker-3", "arbitrary/席")];
// @ts-expect-error Families are independent even when their base strings coincide.
const badFamily: PieceIdOfManifest<typeof compiled> = perPlayerInstanceId(
  "die",
  "worker-2",
  "arbitrary/席",
);
// @ts-expect-error Unchecked raw strings cannot forge generated identity witnesses.
const raw: BoardIdOfManifest<typeof compiled> =
  '@db/["board","mat","arbitrary/席"]';
// @ts-expect-error Session inventory always requires an explicit roster.
compiled.createInitialTable();
// @ts-expect-error Instance record enumeration requires an explicit roster.
compiled.records.pieceIds(0);
compiled.records.pieceIds(0, { playerIds: ["arbitrary/席"] });
compiled.records.pieceTypeIds(0);
const ownedSource = {
  ...source,
  pieceSeeds: [{ id: "worker", typeId: "worker", ownerId: "arbitrary/席" }],
} as const;
// @ts-expect-error Authoring cannot supply ownership through an inferred object.
compileManifest(ownedSource);
const audienceSource = {
  ...source,
  pieceSeeds: [
    {
      id: "worker",
      typeId: "worker",
      visibility: { visibleTo: ["arbitrary/席"] },
    },
  ],
} as const;
// @ts-expect-error Authoring cannot supply a literal audience through an inferred object.
compileManifest(audienceSource);
void [
  strength,
  exactPiece,
  exactCard,
  exactDie,
  shared,
  staticPiece,
  badOrdinal,
  badFamily,
  raw,
];
export type Proofs = [
  CardProof,
  PieceProof,
  DieProof,
  BoardProof,
  StaticCardProof,
];

const withSharedCard = compileManifest({
  ...source,
  cardSets: [
    {
      ...source.cardSets[0],
      cards: [
        ...source.cardSets[0].cards,
        {
          id: "shared-card",
          name: "Shared",
          cardType: "marker",
          count: 1,
          properties: {},
        },
      ],
    },
  ],
});
const sharedSet: "cards" =
  withSharedCard.literals.cardSetIdByCardId["shared-card"];
const sharedType: "marker" =
  withSharedCard.literals.cardTypeByCardId["shared-card"];
const generatedCard = perPlayerInstanceId("card", "card-1", "arbitrary/席");
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Negative proof indexes static metadata with a runtime identity.
const runtimeSet =
  // @ts-expect-error Static metadata includes only shared authored card IDs.
  withSharedCard.literals.cardSetIdByCardId[generatedCard];
void [sharedSet, sharedType, runtimeSet];
