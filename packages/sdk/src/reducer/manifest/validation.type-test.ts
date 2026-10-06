import { z } from "zod";
import {
  compileManifest,
  createGame,
  createReducerBundle,
  defineTopologyManifest,
  type CompiledManifest,
  type ValidatedManifest,
} from "../../reducer";

const base = {
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [],
} as const;
const negative = {
  ...base,
  pieceSeeds: [{ typeId: "token", count: -1 }],
} as const;
// @ts-expect-error Negative literal counts cannot be compiled.
compileManifest(negative);
// @ts-expect-error Negative literal counts cannot be declared as validated topology.
defineTopologyManifest(negative);
// @ts-expect-error Fractional counts cannot yield runtime identity unions.
compileManifest({ ...base, dieSeeds: [{ typeId: "die", count: 1.5 }] });
const zeroCards = {
  ...base,
  cardSets: [
    {
      type: "manual",
      id: "cards",
      name: "Cards",
      cards: [{ type: "ace", name: "Ace", count: 0, properties: {} }],
    },
  ],
} as const;
// @ts-expect-error Zero does not mean one copy.
compileManifest(zeroCards);

const state = {
  public: z.object({}),
  private: z.object({}),
  hidden: z.object({}),
};
// @ts-expect-error Reducer authoring requires compiler-owned metadata.
createGame({ manifest: negative, state, phases: { play: z.object({}) } });

// @ts-expect-error Even valid authored input must be compiled before binding state schemas.
createGame({ manifest: base, state, phases: { play: z.object({}) } });

const validated: ValidatedManifest<typeof base> = defineTopologyManifest(base);
void validated;
// @ts-expect-error Raw authored data does not prove semantic validation.
const unvalidated: ValidatedManifest<typeof base> = base;
void unvalidated;
const compiled = compileManifest(base);
const {
  literals,
  ids,
  defaults,
  normalSetup,
  boardDefinitions,
  tileDefinitions,
  tableSchema,
  records,
  createInitialTable,
} = compiled;
// @ts-expect-error A structural reconstruction does not carry compilation proof.
const forged: CompiledManifest<typeof base> = {
  literals,
  ids,
  defaults,
  normalSetup,
  boardDefinitions,
  tileDefinitions,
  tableSchema,
  records,
  createInitialTable,
};
void forged;

const game = createGame({
  manifest: compiled,
  state,
  phases: { play: z.object({}) },
});
const input = {
  phases: {
    play: game.phase("play").define({ kind: "auto", initialState: () => ({}) }),
  },
  view: () => ({}),
};
const definition = game.assemble(input);
createReducerBundle(definition);
// @ts-expect-error Downstream runtime consumers require an assembled definition.
createReducerBundle({ contract: game.contract, ...input });
