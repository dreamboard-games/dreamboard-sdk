export const sdkPackages = [
  {
    name: "@dreamboard-games/sdk-types",
    dir: "packages/sdk-types",
  },
  {
    name: "@dreamboard-games/reducer-contract",
    dir: "packages/reducer-contract",
  },
  {
    name: "@dreamboard-games/app-sdk",
    dir: "packages/app-sdk",
  },
  {
    name: "@dreamboard-games/ui-sdk",
    dir: "packages/ui-sdk",
  },
  {
    name: "@dreamboard-games/ui-runtime",
    dir: "packages/ui-runtime",
  },
  {
    name: "@dreamboard-games/testing",
    dir: "packages/testing",
  },
  {
    name: "@dreamboard-games/workspace-codegen",
    dir: "packages/workspace-codegen",
  },
  {
    name: "@dreamboard-games/sdk",
    dir: "packages/sdk",
  },
];

export const sdkPackageNames = new Set(
  sdkPackages.map((pkg) => pkg.name),
);
