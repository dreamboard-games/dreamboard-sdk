export type ManifestStaticBoardsData = {
  byId: unknown;
  hex: unknown;
  square: unknown;
};

export type ManifestStaticJsonEnvelope = {
  formatVersion: 1;
  generatedBy: "@dreamboard-games/workspace-codegen";
  boards: ManifestStaticBoardsData;
};

export function createManifestStaticBoardsData(
  materializedTable: Record<string, unknown>,
): ManifestStaticBoardsData {
  const boards = materializedTable.boards as
    | {
        byId: unknown;
        hex: unknown;
        square: unknown;
      }
    | undefined;

  return {
    byId: boards?.byId ?? {},
    hex: boards?.hex ?? {},
    square: boards?.square ?? {},
  };
}

export function createManifestStaticJsonEnvelope(
  staticBoards: ManifestStaticBoardsData,
): ManifestStaticJsonEnvelope {
  return {
    formatVersion: 1,
    generatedBy: "@dreamboard-games/workspace-codegen",
    boards: staticBoards,
  };
}

export function renderManifestStaticJsonSource(
  envelope: ManifestStaticJsonEnvelope,
): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
