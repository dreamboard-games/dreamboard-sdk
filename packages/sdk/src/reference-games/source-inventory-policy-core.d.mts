export const CANONICAL_REFERENCE_GAME_IDS: readonly string[];

export type ReferenceGameSourceInventoryPolicy = {
  readonly schemaVersion: 1;
  readonly workspaceOwnershipVersion: number;
  readonly excludedGameRelativePaths: readonly string[];
  readonly excludedGameRelativePrefixes: readonly string[];
};

export type ReferenceGameSourcePathClass =
  | "included"
  | "workspace-generated"
  | "test-generated"
  | "test-base"
  | "obsolete-screenshot"
  | "derived-output";

export function createReferenceGameSourceInventoryPolicy(ownership: {
  readonly version: number;
  readonly dynamic: { readonly generatedFiles: readonly string[] };
}): ReferenceGameSourceInventoryPolicy;

export function referenceGamePathIdentity(repositoryPath: string): {
  readonly gameId: string;
  readonly relativePath: string;
} | null;

export function classifyReferenceGameSourcePath(
  repositoryPath: string,
  policy: ReferenceGameSourceInventoryPolicy,
): ReferenceGameSourcePathClass;

export function shouldDescendIntoReferenceGameDirectory(
  repositoryPath: string,
  policy: ReferenceGameSourceInventoryPolicy,
): boolean;
