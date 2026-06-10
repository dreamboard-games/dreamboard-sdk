#!/usr/bin/env bash
# Phase 1d of the SDK refactor: move the workspace-codegen engine out of
# packages/sdk/src/infrastructure into its own private workspace package.
# The destination package.json/tsconfig/turbo.json/README already exist;
# all import-path edits inside the moved files have already been applied.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=packages/sdk/src/infrastructure/workspace-codegen
DST=packages/workspace-codegen/src

test -d "$SRC" || { echo "nothing to move: $SRC missing"; exit 1; }
mkdir -p "$DST"
mv "$SRC"/* "$DST"/

# The rest of src/infrastructure is now dead:
#  - workspace-codegen/ (just emptied)
#  - workspace-codegen.ts facade (replaced by src/codegen.ts → workspace package)
#  - reducer-bundle-abi.ts (replaced by src/reducer-contract.ts)
rm -rf packages/sdk/src/infrastructure

cp LICENSE.md packages/workspace-codegen/LICENSE.md

# Fixtures still import the sdk facade for types; the extracted package
# depends on @dreamboard-games/sdk-types directly instead.
LC_ALL=C find "$DST/__fixtures__" -name '*.ts' -exec \
  sed -i '' 's|@dreamboard-games/sdk/types|@dreamboard-games/sdk-types|g' {} +

echo "✓ workspace-codegen moved to packages/workspace-codegen"
