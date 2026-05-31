import { expect, test } from "bun:test";
import {
  DREAMBOARD_SDK_PACKAGE_SET,
  DREAMBOARD_SDK_PACKAGES,
  DREAMBOARD_SDK_VERSION,
} from "./package-set.js";

test("SDK facade exposes one fixed package-set version", () => {
  expect(DREAMBOARD_SDK_PACKAGE_SET.version).toBe(1);
  expect(DREAMBOARD_SDK_PACKAGE_SET.sdkVersion).toBe(DREAMBOARD_SDK_VERSION);
  expect(new Set(Object.values(DREAMBOARD_SDK_PACKAGES))).toEqual(
    new Set([DREAMBOARD_SDK_VERSION]),
  );
  expect(DREAMBOARD_SDK_PACKAGES["@dreamboard-games/sdk"]).toBe(
    DREAMBOARD_SDK_VERSION,
  );
});
