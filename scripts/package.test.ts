import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { assertPeerHygiene, resolvePackedTarballPath } from "./package.ts";

const peers = {
  "framer-motion": "^12.0.0",
  react: "^19.0.0",
  "react-dom": "^19.0.0",
  zod: "^4.4.3",
};

test("accepts a package manifest after pnpm has expanded catalog values", () => {
  assert.doesNotThrow(() =>
    assertPeerHygiene({
      dependencies: { clsx: "^2.1.1" },
      devDependencies: peers,
      peerDependencies: peers,
    }),
  );
});

test("rejects peers duplicated as runtime dependencies", () => {
  assert.throws(
    () =>
      assertPeerHygiene({
        dependencies: { react: "^19.0.0" },
        devDependencies: peers,
        peerDependencies: peers,
      }),
    /peer packages in dependencies/,
  );
});

test("rejects build tools as runtime dependencies", () => {
  assert.throws(
    () =>
      assertPeerHygiene({
        dependencies: { typescript: "^5.9.0" },
        devDependencies: peers,
        peerDependencies: peers,
      }),
    /build tools/,
  );
});

test("resolves the packed tarball from its requested destination", () => {
  assert.equal(
    resolvePackedTarballPath("build/candidate", "sdk.tgz", ["sdk.tgz"]),
    path.resolve("build/candidate/sdk.tgz"),
  );
});
