import type { AuthoringMetadataV1 } from "./types.js";

declare const __DREAMBOARD_SDK_VERSION__: string;

export const AUTHORING_METADATA = {
  sdkVersion:
    typeof __DREAMBOARD_SDK_VERSION__ === "string"
      ? __DREAMBOARD_SDK_VERSION__
      : "0.0.0-development",
} as const satisfies AuthoringMetadataV1;
