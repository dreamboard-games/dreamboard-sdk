export const sdkPackages = [
  {
    name: "@dreamboard-games/sdk",
    dir: "packages/sdk",
  },
];

export const sdkPackageNames = new Set(sdkPackages.map((pkg) => pkg.name));
