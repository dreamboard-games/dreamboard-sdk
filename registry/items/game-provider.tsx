import { SDKGameProvider } from "@game";
import type { ComponentProps } from "react";
import { CardMotionProvider } from "./card-motion";

/** The UI binding's provider: game lifetime plus shared card motion. */
export function GameProvider({
  children,
  ...props
}: ComponentProps<typeof SDKGameProvider>) {
  return (
    <SDKGameProvider {...props}>
      <CardMotionProvider>{children}</CardMotionProvider>
    </SDKGameProvider>
  );
}
