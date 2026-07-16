import path from "node:path";

export function buildReferenceWorkspaceRenderModule({
  fromFile,
  uiEntry,
  uiContractFingerprint,
  referenceGameSourceDigest,
}: {
  readonly fromFile: string;
  readonly uiEntry: string;
  readonly uiContractFingerprint: string;
  readonly referenceGameSourceDigest: string;
}): string {
  const sourceModule = toModuleSpecifier(fromFile, uiEntry);
  return `import * as React from "react";
import * as DreamboardRuntime from "@dreamboard-games/sdk/runtime/primitives";
import * as PluginRuntimeContract from "@dreamboard-games/sdk/plugin-runtime-contract";
import * as ui from ${JSON.stringify(sourceModule)};

void React;
void DreamboardRuntime;
void PluginRuntimeContract;

const Root = ui.Root ?? ui.default ?? ui.App;
if (!Root) {
  throw new Error("Reference game UI entrypoint must export Root, default, or App.");
}

function ReferenceGameRoot(props) {
  return React.createElement(
    "div",
    { "data-reference-game": "reference-game" },
    React.createElement(Root, props),
  );
}

export { ReferenceGameRoot as Root };
export const uiContractFingerprint = ${JSON.stringify(uiContractFingerprint)};
export const referenceGameSourceDigest = ${JSON.stringify(referenceGameSourceDigest)};
`;
}

function toModuleSpecifier(fromFile: string, toFile: string): string {
  const relative = path
    .relative(path.dirname(fromFile), toFile)
    .split(path.sep)
    .join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}
