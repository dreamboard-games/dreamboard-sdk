import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  createReducerBundle,
  defineGame,
  defineGameContract,
  definePhase,
  defineStaticView,
} from "../reducer";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../reducer/advanced";
import { perPlayer } from "./per-player";

function buildMinimalManifest() {
  const playerIds = ["player-1", "player-2"] as const;
  return {
    literals: {
      playerIds,
      phaseNames: [] as readonly string[],
      setupOptionIds: [] as const,
      setupProfileIds: [] as const,
      cardSetIds: [] as const,
      cardTypes: [] as const,
      deckIds: [] as const,
      handIds: [] as const,
      sharedZoneIds: [] as const,
      playerZoneIds: [] as const,
      zoneIds: [] as const,
      cardIds: [] as const,
      resourceIds: [] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: [] as const,
      dieIds: [] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      boardContainerIds: [] as const,
      edgeIds: [] as const,
      edgeTypeIds: [] as const,
      vertexIds: [] as const,
      vertexTypeIds: [] as const,
      spaceIds: [] as const,
      spaceTypeIds: [] as const,
      handVisibilityById: {},
      zoneVisibilityById: {},
      cardSetIdByCardId: {},
      cardTypeByCardId: {},
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {},
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: z.string(),
      setupOptionId: createManifestStringLiteralSchema([] as const),
      setupProfileId: createManifestStringLiteralSchema([] as const),
      cardSetId: createManifestStringLiteralSchema([] as const),
      cardType: createManifestStringLiteralSchema([] as const),
      cardId: createManifestStringLiteralSchema([] as const),
      deckId: createManifestStringLiteralSchema([] as const),
      handId: createManifestStringLiteralSchema([] as const),
      sharedZoneId: createManifestStringLiteralSchema([] as const),
      playerZoneId: createManifestStringLiteralSchema([] as const),
      zoneId: createManifestStringLiteralSchema([] as const),
      resourceId: createManifestStringLiteralSchema([] as const),
      pieceTypeId: createManifestStringLiteralSchema([] as const),
      pieceId: createManifestStringLiteralSchema([] as const),
      dieTypeId: createManifestStringLiteralSchema([] as const),
      dieId: createManifestStringLiteralSchema([] as const),
      boardTypeId: createManifestStringLiteralSchema([] as const),
      boardBaseId: createManifestStringLiteralSchema([] as const),
      boardId: createManifestStringLiteralSchema([] as const),
      boardContainerId: createManifestStringLiteralSchema([] as const),
      relationTypeId: createManifestStringLiteralSchema([] as const),
      edgeId: createManifestStringLiteralSchema([] as const),
      edgeTypeId: createManifestStringLiteralSchema([] as const),
      vertexId: createManifestStringLiteralSchema([] as const),
      vertexTypeId: createManifestStringLiteralSchema([] as const),
      spaceId: createManifestStringLiteralSchema([] as const),
      spaceTypeId: createManifestStringLiteralSchema([] as const),
    },
    defaults: {
      zones: () => ({ shared: {}, perPlayer: {}, visibility: {} }),
      decks: () => ({}),
      hands: () => ({}),
      handVisibility: () => ({}),
      ownerOfCard: () => ({}),
      visibility: () => ({}),
      resources: () => perPlayer([], () => ({})),
    },
    setupOptionsById: {},
    setupChoiceIdsByOptionId: {},
    setupProfilesById: {},
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  } as const;
}

function buildContract<const PhaseNames extends readonly string[]>(
  phaseNames: PhaseNames,
) {
  return defineGameContract({
    manifest: buildMinimalManifest(),
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: Object.fromEntries(
      phaseNames.map((phaseName) => [phaseName, z.object({})]),
    ) as { [Name in PhaseNames[number]]: z.ZodObject<Record<string, never>> },
  });
}

const autoPhase = <Contract>() =>
  definePhase<Contract>()({
    kind: "auto",
    state: z.object({}),
    initialState: () => ({}),
  });

describe("defineStaticView", () => {
  test("static view receives only the manifest and static queries", () => {
    const contract = buildContract(["alpha"] as const);
    const seen: {
      sawQ: boolean;
      sawState: boolean;
      sawPlayerId: boolean;
      sawRuntime: boolean;
    } = {
      sawQ: false,
      sawState: false,
      sawPlayerId: false,
      sawRuntime: false,
    };
    const staticView = defineStaticView<typeof contract>()({
      project: (args) => {
        // `project` accepts exactly static inputs — we assert the argument
        // shape at runtime so the narrowing we rely on is visible to a test
        // reader, not just a compile-time constraint.
        seen.sawQ = "q" in (args as object);
        seen.sawState = "state" in (args as object);
        seen.sawPlayerId = "playerId" in (args as object);
        seen.sawRuntime = "runtime" in (args as object);
        return { playerIds: args.manifest.literals.playerIds };
      },
    });
    const projection = staticView.project({
      manifest: contract.manifest,
      q: {
        board: {
          get: (() => null) as never,
          hex: (() => null) as never,
          square: (() => null) as never,
        },
      },
    });
    expect(projection.playerIds).toEqual(["player-1", "player-2"]);
    expect(seen).toEqual({
      sawQ: true,
      sawState: false,
      sawPlayerId: false,
      sawRuntime: false,
    });
  });

  test("createReducerBundle().projectStatic() returns a stable view+hash+manifestVersion", () => {
    const contract = buildContract(["alpha"] as const);
    const staticView = defineStaticView<typeof contract>()({
      project: ({ manifest }) => ({
        zoneIds: manifest.literals.sharedZoneIds,
      }),
    });
    const definition = defineGame({
      contract,
      initialPhase: "alpha",
      phases: { alpha: autoPhase<typeof contract>() },
      staticView,
    });
    const bundle = createReducerBundle(definition);
    const first = bundle.projectStatic();
    const second = bundle.projectStatic();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.view).toEqual({ zoneIds: [] });
    expect(first!.hash).toBe(second!.hash);
    expect(typeof first!.hash).toBe("string");
    expect(first!.hash.length).toBeGreaterThan(0);
    expect(typeof first!.manifestVersion).toBe("string");
  });

  test("createReducerBundle().projectStatic() exposes generated static board queries", () => {
    const island = {
      id: "island",
      baseId: "island",
      layout: "hex",
      typeId: null,
      scope: "shared",
      templateId: null,
      fields: {},
      playerId: null,
      spaces: {
        center: {
          id: "center",
          name: null,
          typeId: null,
          fields: {},
          zoneId: null,
          q: 0,
          r: 0,
        },
      },
      relations: [],
      containers: {},
      orientation: "pointy-top",
      edges: [],
      vertices: [],
    } as const;
    const manifest = {
      ...buildMinimalManifest(),
      staticBoards: {
        byId: { island },
        hex: { island },
        square: {},
      },
    } as const;
    const contract = defineGameContract({
      manifest,
      phases: { alpha: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const staticView = defineStaticView<typeof contract>()({
      project: ({ q }) => ({
        board: q.board.hex("island"),
      }),
    });
    const definition = defineGame({
      contract,
      initialPhase: "alpha",
      phases: { alpha: autoPhase<typeof contract>() },
      staticView,
    });

    const projection = createReducerBundle(definition).projectStatic();

    expect(projection?.view).toEqual({ board: island });
  });

  test("createReducerBundle().projectStatic() returns null when no staticView is declared", () => {
    const contract = buildContract(["alpha"] as const);
    const definition = defineGame({
      contract,
      initialPhase: "alpha",
      phases: { alpha: autoPhase<typeof contract>() },
    });
    const bundle = createReducerBundle(definition);
    expect(bundle.projectStatic()).toBeNull();
  });
});
