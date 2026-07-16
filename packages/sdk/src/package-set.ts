import { AUTHORING_METADATA } from "./authoring/metadata.js";

export const DREAMBOARD_SDK_VERSION = AUTHORING_METADATA.sdkVersion;

export const DREAMBOARD_SDK_PACKAGES = {
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
