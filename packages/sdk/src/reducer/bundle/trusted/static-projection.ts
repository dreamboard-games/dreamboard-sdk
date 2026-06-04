import type {
  ManifestContract,
  PhaseMapOf,
  ReducerGameContractLike,
  RuntimeTableRecord,
  StaticViewQueries,
  ViewMapOf,
} from "../../model";
import type { TrustedRuntimeScope } from "./runtime-scope";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

function hashProjection(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function readManifestVersion(manifest: unknown): string {
  const m = manifest as { version?: unknown; literals?: unknown };
  if (typeof m.version === "string" && m.version.length > 0) {
    return m.version;
  }
  if (m.literals && typeof m.literals === "object") {
    return hashProjection(stableStringify(m.literals));
  }
  return "0";
}

function createStaticViewQueries<
  Manifest extends ManifestContract<RuntimeTableRecord>,
>(manifest: Manifest): StaticViewQueries<Manifest> {
  const staticBoards = manifest.staticBoards ?? {
    byId: {},
    hex: {},
    square: {},
  };
  const requireBoard = (
    boards: Record<string, unknown>,
    boardId: string,
    layout: "board" | "hex" | "square",
  ) => {
    const board = boards[boardId];
    if (!board) {
      throw new Error(`Unknown static ${layout} board '${boardId}'.`);
    }
    return board;
  };

  return {
    board: {
      get: (boardId) =>
        requireBoard(
          staticBoards.byId as Record<string, unknown>,
          boardId,
          "board",
        ) as never,
      hex: (boardId) =>
        requireBoard(
          staticBoards.hex as Record<string, unknown>,
          boardId,
          "hex",
        ) as never,
      square: (boardId) =>
        requireBoard(
          staticBoards.square as Record<string, unknown>,
          boardId,
          "square",
        ) as never,
    },
  };
}

export function createStaticProjectionBuilder<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(scope: TrustedRuntimeScope<Contract, Definitions, Views>) {
  return {
    projectStatic(): {
      view: unknown;
      hash: string;
      manifestVersion: string;
    } | null {
      const staticView = scope.definition.staticView;
      if (!staticView) return null;
      const manifest = scope.definition.contract.manifest;
      const view = staticView.project({
        manifest,
        q: createStaticViewQueries(manifest),
      });
      const serialized = stableStringify(view);
      return {
        view: JSON.parse(serialized) as unknown,
        hash: hashProjection(serialized),
        manifestVersion: readManifestVersion(manifest),
      };
    },
  };
}
