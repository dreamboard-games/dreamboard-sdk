#!/usr/bin/env bash
# Phase 3 step 1: move src/runtime-internal/** into src/runtime/.
# All import-path edits (inside the moved tree, plus the 5 external
# importers) have already been applied; this script only relocates files.
#
# Collision handling:
#  - runtime-internal/workspace-contract.ts -> runtime/workspace-contract/index.ts
#    (the public facade file src/runtime/workspace-contract.ts keeps its path)
#  - runtime-internal/runtime/ -> runtime/api/  (avoids runtime/runtime/)
set -euo pipefail
cd "$(dirname "$0")/../packages/sdk/src"

test -d runtime-internal || { echo "nothing to move: runtime-internal missing"; exit 1; }

mkdir -p runtime/workspace-contract
mv runtime-internal/workspace-contract.ts runtime/workspace-contract/index.ts
mv runtime-internal/runtime runtime/api
mv runtime-internal/* runtime/
rmdir runtime-internal

echo "✓ runtime-internal merged into src/runtime"
ls runtime
