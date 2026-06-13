export type ManifestStaticBoardsData = {
  byId: unknown;
  hex: unknown;
  square: unknown;
};

export type ManifestStaticJsonEnvelope = {
  formatVersion: 1;
  generatedBy: "@dreamboard-games/sdk/codegen";
  boards: ManifestStaticBoardsData;
  initialTable: unknown;
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
  initialTable: unknown,
): ManifestStaticJsonEnvelope {
  return {
    formatVersion: 1,
    generatedBy: "@dreamboard-games/sdk/codegen",
    boards: staticBoards,
    initialTable,
  };
}

export function renderManifestStaticJsonSource(
  envelope: ManifestStaticJsonEnvelope,
): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
