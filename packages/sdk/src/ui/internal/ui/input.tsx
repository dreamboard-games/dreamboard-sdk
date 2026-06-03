import * as React from "react";
import { cn } from "./utils.js";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-slate-600 focus-visible:ring-2 focus-visible:ring-slate-300",
        className,
      )}
      {...props}
    />
  );
}
