import type { GameTopologyManifest } from "@dreamboard-games/sdk-types";

function generateThinUiContractContent(): string {
  return `/**
 * Generated file.
 * Do not edit directly.
 */

import game from "../../app/game";
import {
  createGameUiContract,
  type GameUiBoardSurface,
  type GameUiCardCollectionSurface,
  type GameUiGameRootState,
  type GameUiHandSurface,
  type GameUiInteractionFormSurface,
  type GameUiInteractionKey,
  type GameUiInteractionRoutes,
  type GameUiMe,
  type GameUiPhaseName,
  type GameUiPlayers,
  type GameUiTurn,
  type GameUiView,
} from "@dreamboard-games/sdk/runtime/workspace-contract";
import type { DreamboardUI } from "@dreamboard-games/sdk/runtime";
import {
  literals,
  staticBoards,
  type BoardBaseId,
  type CardId,
  type CardProperties,
  type CardType,
  type EdgeId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
  type VertexId,
  type ZoneId,
} from "../manifest-contract";

type GameDefinition = typeof game;
type RuntimeBoundary = DreamboardUI;
type PlayerCardZoneId = {
  [Zone in (typeof literals.playerZoneIds)[number]]:
    (typeof literals.cardSetIdsByPlayerZoneId)[Zone] extends readonly []
      ? never
      : Zone;
}[(typeof literals.playerZoneIds)[number]];
type SharedCardZoneId = {
  [Zone in (typeof literals.sharedZoneIds)[number]]:
    (typeof literals.cardSetIdsBySharedZoneId)[Zone] extends readonly []
      ? never
      : Zone;
}[(typeof literals.sharedZoneIds)[number]];
type ManifestTypes = {
  PlayerId: PlayerId & string;
  ResourceId: ResourceId & string;
  ZoneId: ZoneId & string;
  CardId: [CardId] extends [never] ? string : CardId & string;
  CardType: [CardType] extends [never] ? string : CardType & string;
  CardProperties: CardProperties extends Record<string, unknown>
    ? CardProperties
    : Record<string, unknown>;
  BoardBaseId: BoardBaseId & string;
  SpaceId: SpaceId & string;
  EdgeId: EdgeId & string;
  VertexId: VertexId & string;
  PlayerCardZoneId: PlayerCardZoneId & string;
  CardZoneId: (PlayerCardZoneId | SharedCardZoneId) & string;
};

const contract = createGameUiContract<
  GameDefinition,
  ManifestTypes,
  typeof staticBoards.hex,
  typeof staticBoards.square
>({
  game,
  resourceIds: literals.resourceIds as readonly ResourceId[],
  resourcePresentationById: literals.resourcePresentationById,
  hexStaticBoards: staticBoards.hex,
  squareStaticBoards: staticBoards.square,
});

export const uiContract = contract.uiContract;
export const UI = contract.UI;
export const clientParamSchemasByPhase = contract.clientParamSchemasByPhase;
export const Board = UI.Board;
export const Zone = UI.Zone;
export const Game = UI.Game;
export const Interaction = UI.Interaction;
export const PlayerRoster = UI.PlayerRoster;
export const Dice = UI.Dice;
export const Phase = UI.Phase;
export const ResourceCounter = UI.ResourceCounter;

export type ViewName = import("@dreamboard-games/sdk/runtime/workspace-contract").GameUiViewName<GameDefinition>;
export type GameView = GameUiView<GameDefinition>;
export type PhaseName = GameUiPhaseName<GameDefinition>;
export type GameRootState = GameUiGameRootState<GameDefinition, ManifestTypes>;
export type GamePlayers = GameUiPlayers<ManifestTypes>;
export type GameMe = GameUiMe<ManifestTypes>;
export type GameTurn = GameUiTurn<GameDefinition, ManifestTypes>;
export type InteractionKey = GameUiInteractionKey<GameDefinition>;
export type InteractionRoutes = GameUiInteractionRoutes<GameDefinition>;
export type InteractionFormSurface<Key extends InteractionKey> =
  GameUiInteractionFormSurface<GameDefinition, typeof uiContract, Key>;
export type BoardSurface<
  Board extends ManifestTypes["BoardBaseId"] = ManifestTypes["BoardBaseId"],
> = GameUiBoardSurface<ManifestTypes, Board>;
export type HandSurface<
  Zones extends readonly ManifestTypes["ZoneId"][] = readonly ManifestTypes["ZoneId"][],
> = GameUiHandSurface<ManifestTypes, Zones>;
export type CardCollectionSurface<
  Zones extends readonly ManifestTypes["ZoneId"][] = readonly ManifestTypes["ZoneId"][],
> = GameUiCardCollectionSurface<ManifestTypes, Zones>;

declare module "@dreamboard-games/sdk/runtime" {
  interface DreamboardUIRegister {
    contract: GameDefinition;
    ui: typeof uiContract;
  }
}
`;
}

function generateReducerGameSeed(manifest: GameTopologyManifest): string {
  const setupProfiles = manifest.setupProfiles ?? [];
  const setupProfileEntries =
    setupProfiles.length === 0
      ? ""
      : `{\n${setupProfiles
          .map((profile) => `  ${JSON.stringify(profile.id)}: {},`)
          .join("\n")}\n}`;

  return `import { z } from "zod";
import { defineGame } from "@dreamboard-games/sdk/reducer";
import {
  ids,
  manifestContract,
  setupProfiles,
} from "../shared/manifest-contract";

const publicState = z.object({
  currentPlayerId: ids.playerId.nullable(),
  notesByPlayerId: z.partialRecord(ids.playerId, z.string()).default({}),
});

const setupMoodChoices = [
  { value: "ready", label: "Ready" },
  { value: "exploring", label: "Exploring" },
] as const;
type SetupMood = (typeof setupMoodChoices)[number]["value"];

export default defineGame(
  {
    manifest: manifestContract,
    state: {
      public: publicState,
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: {
      setup: z.object({}),
    },
    errors: {},
  },
  (game) => {
    const setup = game.phase("setup");

    return {
      initial: {
        public: ({ playerIds }) => ({
          currentPlayerId: playerIds[0] ?? null,
          notesByPlayerId: {},
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "setup",
      setupProfiles: setupProfiles(${setupProfileEntries || "{}"}),
      phases: {
        setup: setup.define({
          kind: "player",
          initialState: () => ({}),
          actor: ({ state }) => state.publicState.currentPlayerId,
          interactions: {
            ready: setup.interaction({
              inputs: {
                mood: setup.inputs.form.choice<SetupMood>({
                  choices: setupMoodChoices,
                  defaultValue: "ready",
                }),
              },
              reduce({ state, input, accept }) {
                return accept({
                  ...state,
                  publicState: {
                    ...state.publicState,
                    notesByPlayerId: {
                      ...state.publicState.notesByPlayerId,
                      [input.playerId]: input.params.mood,
                    },
                  },
                });
              },
            }),
          },
        }),
      },
      views: {
        shared: game.emptyView(),
        player: game.emptyView(),
      },
    };
  },
);
`;
}

function generateReducerAppIndex(): string {
  return `import game from "./game";
import { createReducerBundle } from "@dreamboard-games/sdk/reducer";

export default createReducerBundle(game);
`;
}

function generateAppFrameworkTsConfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: false,
        types: [],
        declaration: false,
        rootDir: "..",
        outDir: "./dist",
        paths: {
          "@dreamboard/manifest-contract": ["../shared/manifest-contract.ts"],
          "#dreamboard/ui-contract": ["../shared/generated/ui-contract.ts"],
          "@shared/*": ["../shared/*"],
        },
      },
      include: [
        "./**/*.ts",
        "./**/*.d.ts",
        "../shared/manifest-*.ts",
        "../shared/manifest-*.d.ts",
        "../shared/manifest-*.json",
      ],
      exclude: ["node_modules", "dist", "../shared/generated"],
    },
    null,
    2,
  )}\n`;
}

function generateUiFrameworkTsConfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        jsx: "react-jsx",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: false,
        types: [],
        paths: {
          "@dreamboard/manifest-contract": ["../shared/manifest-contract.ts"],
          "#dreamboard/ui-contract": ["../shared/generated/ui-contract.ts"],
          "@shared/*": ["../shared/*"],
        },
      },
      include: [
        "./**/*.ts",
        "./**/*.tsx",
        "../shared/**/*.ts",
        "../shared/**/*.json",
      ],
      exclude: ["node_modules", "dist"],
    },
    null,
    2,
  )}\n`;
}

function generateReducerUiAppContent(): string {
  return `import {
  Game,
  Interaction,
  Phase,
  UI,
  type InteractionRoutes,
} from "#dreamboard/ui-contract";

function SetupPhase() {
  const ready = Interaction.useForm("setup.ready");
  const routes = {
    "setup.ready": {
      collect: {
        mood: ready.slot.mood,
      },
    },
  } satisfies InteractionRoutes;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <Interaction.Routes routes={routes} />
      <section className="mx-auto grid max-w-3xl gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Your game starts here</h1>
        <p className="text-sm text-slate-600">
          Replace this screen with your board, hands, mats, and table state.
        </p>
        <ready.slot.mood.Field />
        <ready.Submit className="rounded-md bg-slate-950 px-4 py-2 font-bold text-white">
          Ready
        </ready.Submit>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <UI.Root>
      <Game.Root>
        {() => (
          <Phase.Switch
            routes={{
              setup: () => <SetupPhase />,
            }}
          />
        )}
      </Game.Root>
    </UI.Root>
  );
}
`;
}

export function generateSeedFiles(
  manifest: GameTopologyManifest,
): Record<string, string> {
  return {
    "ui/App.tsx": generateReducerUiAppContent(),
    "app/game.ts": generateReducerGameSeed(manifest),
  };
}

export function generateAuthoritativeIndexFile(
  _manifest: GameTopologyManifest,
): string {
  return generateReducerAppIndex();
}

export function generateFrameworkFiles(
  manifest: GameTopologyManifest,
): Record<string, string> {
  return {
    "app/tsconfig.framework.json": generateAppFrameworkTsConfig(),
    "ui/tsconfig.framework.json": generateUiFrameworkTsConfig(),
    "shared/generated/ui-contract.ts": generateThinUiContractContent(),
    "app/index.ts": generateAuthoritativeIndexFile(manifest),
  };
}
