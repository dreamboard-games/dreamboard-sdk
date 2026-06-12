export const forbiddenRuntimeDeps = [
  "@tailwindcss/cli",
  "tailwindcss",
  "typescript",
  "tsup",
];

export const requiredPeerDeps = ["framer-motion", "react", "react-dom", "zod"];

export function assertPeerHygiene(manifest, label = "package.json") {
  const dependencies = manifest.dependencies ?? {};
  const peerDependencies = manifest.peerDependencies ?? {};
  const devDependencies = manifest.devDependencies ?? {};

  const duplicatePeerDeps = Object.keys(dependencies).filter(
    (name) => peerDependencies[name] !== undefined,
  );
  if (duplicatePeerDeps.length > 0) {
    throw new Error(
      `${label} lists peer packages in dependencies: ${duplicatePeerDeps.join(", ")}`,
    );
  }

  const runtimeToolDeps = forbiddenRuntimeDeps.filter(
    (name) => dependencies[name] !== undefined,
  );
  if (runtimeToolDeps.length > 0) {
    throw new Error(
      `${label} lists build-time tools in dependencies: ${runtimeToolDeps.join(", ")}`,
    );
  }

  const missingPeerDeps = requiredPeerDeps.filter(
    (name) => peerDependencies[name] === undefined,
  );
  if (missingPeerDeps.length > 0) {
    throw new Error(
      `${label} is missing required peerDependencies: ${missingPeerDeps.join(", ")}`,
    );
  }

  const missingPeerDevDeps = requiredPeerDeps.filter(
    (name) => devDependencies[name] === undefined,
  );
  if (missingPeerDevDeps.length > 0) {
    throw new Error(
      `${label} peer packages need devDependencies for local build/test: ${missingPeerDevDeps.join(", ")}`,
    );
  }
}
