export const DREAMBOARD_SDK_VERSION = "0.2.0";

export const DREAMBOARD_SDK_PACKAGES = {
  "@dreamboard-games/api-client": DREAMBOARD_SDK_VERSION,
  "@dreamboard-games/sdk-types": DREAMBOARD_SDK_VERSION,
  "@dreamboard-games/reducer-contract": DREAMBOARD_SDK_VERSION,
  "@dreamboard-games/app-sdk": DREAMBOARD_SDK_VERSION,
  "@dreamboard-games/ui-sdk": DREAMBOARD_SDK_VERSION,
  "@dreamboard-games/ui-runtime": DREAMBOARD_SDK_VERSION,
  "@dreamboard-games/testing": DREAMBOARD_SDK_VERSION,
  "@dreamboard-games/workspace-codegen": DREAMBOARD_SDK_VERSION,
  "@dreamboard-games/sdk": DREAMBOARD_SDK_VERSION,
} as const;

export type DreamboardSdkPackageName = keyof typeof DREAMBOARD_SDK_PACKAGES;

export type DreamboardSdkPackageSet = {
  version: 1;
  sdkVersion: string;
  packages: Record<DreamboardSdkPackageName, string>;
};

export const DREAMBOARD_SDK_PACKAGE_SET: DreamboardSdkPackageSet = {
  version: 1,
  sdkVersion: DREAMBOARD_SDK_VERSION,
  packages: DREAMBOARD_SDK_PACKAGES,
};
